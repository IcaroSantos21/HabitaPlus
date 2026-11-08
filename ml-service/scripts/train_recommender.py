"""Treina, avalia e salva o modelo de recomendação por K-Means (ML-05)."""
from __future__ import annotations

import argparse
import logging
import random
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.cluster import KMeans
from sklearn.metrics import adjusted_rand_score, silhouette_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import Normalizer

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.config import ARTIFACTS_DIR, DATA_DIR, RECOMMENDER_MODEL_PATH  # noqa: E402
from app.core.constants import CATEGORIES  # noqa: E402
from app.services.recommender_features import FEATURE_NAMES, build_interest_vector  # noqa: E402

logger = logging.getLogger(__name__)

SEED = 42
K_RANGE = range(2, 9)  # k de 2 a 8: com 5 categorias, mais que isso já fragmenta demais
N_INIT = 10
HOLDOUT_FRACTION = 0.2
DEFAULT_PLOT_PATH = ROOT.parent / "docs" / "img" / "ml-recommend-k-selection.png"


@dataclass(frozen=True)
class KSelection:
    """Inertia e silhouette de cada k testado (base do gráfico e do relatório)."""

    inertia: dict[int, float]
    silhouette: dict[int, float]
    best_k: int  # k de maior silhouette: o critério da escolha
    elbow_k: int  # k do cotovelo: conferência visual, não decide


@dataclass(frozen=True)
class TrainingResult:
    """Tudo que o relatório e o artefato precisam do treino."""

    pipeline: Pipeline
    k: int
    selection: KSelection
    silhouette: float
    adjusted_rand: float  # clusters x grupos latentes (só para validar, nunca como feature)
    holdout_adjusted_rand: float  # idem, em moradores que ficaram fora do ajuste
    n_residents: int
    n_cold_start: int
    cluster_sizes: dict[int, int]
    centroids: pd.DataFrame  # linhas = cluster, colunas = categorias (proporção média)


def make_pipeline(k: int) -> Pipeline:
    """Proporção por categoria + K-Means. O `Normalizer` não aprende nada (sem vazamento)."""
    return Pipeline([
        ("normalizer", Normalizer(norm="l1")),
        ("kmeans", KMeans(n_clusters=k, n_init=N_INIT, random_state=SEED)),
    ])


def load_interest_matrix(path: Path = DATA_DIR / "resident_profiles.csv") -> tuple[np.ndarray, np.ndarray]:
    """Vetores de interesse e grupo latente de cada morador (mesma conta da inferência)."""
    df = pd.read_csv(path)
    vectors = np.vstack([
        build_interest_vector(
            {c: int(row[f"visualizacoes_{c}"]) for c in CATEGORIES},
            {c: int(row[f"anunciadas_{c}"]) for c in CATEGORIES},
            {c: int(row[f"conversas_{c}"]) for c in CATEGORIES},
        )
        for _, row in df.iterrows()
    ])
    return vectors, df["grupo_latente"].to_numpy()


def elbow_index(ks: list[int], inertias: list[float]) -> int:
    """Cotovelo: o k mais distante da reta entre o primeiro e o último ponto da curva."""
    x = (np.asarray(ks, dtype=float) - ks[0]) / (ks[-1] - ks[0])
    y = (np.asarray(inertias) - inertias[-1]) / (inertias[0] - inertias[-1])
    return ks[int(np.argmax(np.abs(x + y - 1)))]  # distância à reta x + y = 1


def select_k(vectors: np.ndarray) -> KSelection:
    """Ajusta um K-Means por k e mede inertia (cotovelo) e silhouette."""
    normalized = Normalizer(norm="l1").fit_transform(vectors)
    inertia: dict[int, float] = {}
    silhouette: dict[int, float] = {}
    for k in K_RANGE:
        model = make_pipeline(k).fit(vectors)
        inertia[k] = float(model.named_steps["kmeans"].inertia_)
        silhouette[k] = float(silhouette_score(normalized, model.named_steps["kmeans"].labels_))
    ks = list(K_RANGE)
    return KSelection(
        inertia=inertia, silhouette=silhouette,
        best_k=max(silhouette, key=silhouette.__getitem__),
        elbow_k=elbow_index(ks, [inertia[k] for k in ks]),
    )


def train(data_path: Path = DATA_DIR / "resident_profiles.csv") -> TrainingResult:
    """Escolhe k, ajusta o modelo final e valida contra os grupos latentes."""
    random.seed(SEED)
    np.random.seed(SEED)

    vectors, latent = load_interest_matrix(data_path)
    active = vectors.sum(axis=1) > 0  # cold start (vetor zero) não entra: não tem proporção
    vectors, latent = vectors[active], latent[active]

    selection = select_k(vectors)
    pipeline = make_pipeline(selection.best_k).fit(vectors)
    labels = pipeline.named_steps["kmeans"].labels_

    # Validação fora do ajuste: reajusta com 80% e atribui os 20% restantes, como a API faz.
    fit_idx, hold_idx = train_test_split(
        np.arange(len(vectors)), test_size=HOLDOUT_FRACTION, random_state=SEED, stratify=latent
    )
    holdout_model = make_pipeline(selection.best_k).fit(vectors[fit_idx])
    holdout_ari = float(adjusted_rand_score(latent[hold_idx], holdout_model.predict(vectors[hold_idx])))  # type: ignore[arg-type]

    centroids = pd.DataFrame(
        pipeline.named_steps["kmeans"].cluster_centers_, columns=list(FEATURE_NAMES)
    )
    return TrainingResult(
        pipeline=pipeline, k=selection.best_k, selection=selection,
        silhouette=selection.silhouette[selection.best_k],
        adjusted_rand=float(adjusted_rand_score(latent, labels)),
        holdout_adjusted_rand=holdout_ari,
        n_residents=int(active.sum()), n_cold_start=int((~active).sum()),
        cluster_sizes={int(k): int(v) for k, v in zip(*np.unique(labels, return_counts=True), strict=True)},
        centroids=centroids,
    )


def save_artifact(result: TrainingResult, path: Path = RECOMMENDER_MODEL_PATH) -> None:
    """Grava o pipeline e os metadados que a API precisa (k, silhouette, features, valores por k)."""
    artifact: dict[str, Any] = {
        "pipeline": result.pipeline,
        "k": result.k,
        "silhouette": result.silhouette,
        "k_selection": {
            "inertia": result.selection.inertia,
            "silhouette": result.selection.silhouette,
            "elbow_k": result.selection.elbow_k,
        },
        "feature_names": list(FEATURE_NAMES),
        "sklearn_version": sklearn.__version__,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, path)


def plot_k_selection(result: TrainingResult, path: Path = DEFAULT_PLOT_PATH) -> None:
    """Gráficos do cotovelo e da silhouette, para o `docs/ml-report.md`."""
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    ks = list(result.selection.inertia)
    fig, (ax_elbow, ax_sil) = plt.subplots(1, 2, figsize=(10, 4))
    ax_elbow.plot(ks, list(result.selection.inertia.values()), "-o")
    ax_elbow.axvline(result.selection.elbow_k, color="gray", linestyle=":", label=f"cotovelo (k={result.selection.elbow_k})")
    ax_elbow.set(title="Método do cotovelo", xlabel="k", ylabel="Inertia (proporções)")
    ax_elbow.legend()
    ax_sil.plot(ks, list(result.selection.silhouette.values()), "-o", color="tab:green")
    ax_sil.axvline(result.k, color="gray", linestyle=":", label=f"escolhido (k={result.k})")
    ax_sil.set(title="Silhouette", xlabel="k", ylabel="Silhouette média")
    ax_sil.legend()
    for ax in (ax_elbow, ax_sil):
        ax.set_xticks(ks)
        ax.grid(alpha=0.3)
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)


def log_report(result: TrainingResult) -> None:
    """Imprime as tabelas que vão para o relatório."""
    sel = result.selection
    logger.info("Moradores no ajuste: %d (cold start fora: %d)", result.n_residents, result.n_cold_start)
    logger.info("%3s %12s %11s", "k", "inertia", "silhouette")
    for k in sel.inertia:
        logger.info("%3d %12.4f %11.4f", k, sel.inertia[k], sel.silhouette[k])
    logger.info("k por silhouette: %d | k pelo cotovelo: %d", sel.best_k, sel.elbow_k)
    logger.info("ARI x grupos latentes: %.3f (fora do ajuste: %.3f)", result.adjusted_rand, result.holdout_adjusted_rand)
    logger.info("Tamanho dos clusters: %s", result.cluster_sizes)
    logger.info("Centroides (proporção média por categoria):\n%s", result.centroids.round(3).to_string())


def main(argv: list[str] | None = None) -> None:
    """Ponto de entrada da linha de comando."""
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    parser = argparse.ArgumentParser(description="Treina o modelo de recomendação (K-Means).")
    parser.add_argument("--out", type=Path, default=RECOMMENDER_MODEL_PATH)
    parser.add_argument("--plot-path", type=Path, default=DEFAULT_PLOT_PATH)
    parser.add_argument("--no-plot", action="store_true")
    args = parser.parse_args(argv)

    result = train()
    save_artifact(result, args.out)
    if not args.no_plot:
        plot_k_selection(result, args.plot_path)
    log_report(result)
    logger.info("Artefato salvo em %s (pasta padrão: %s)", args.out, ARTIFACTS_DIR)


if __name__ == "__main__":
    main()
