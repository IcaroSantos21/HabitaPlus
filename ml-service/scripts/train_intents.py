"""Treina, avalia e salva o classificador de intenções (ML-04)."""
from __future__ import annotations

import argparse
import logging
import random
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.base import ClassifierMixin
from sklearn.dummy import DummyClassifier
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_recall_fscore_support
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.config import DATA_DIR, INTENT_MODEL_PATH  # noqa: E402
from app.core.constants import CONFIDENCE_THRESHOLD, INTENTS  # noqa: E402
from app.services.text_preprocessing import normalize_text, tokenize  # noqa: E402

logger = logging.getLogger(__name__)

SEED = 42
TEST_FOLDS = 5  # 1 dobra de 5 = ~20% das frases (de templates inteiros) fica para o teste
VALIDATION_FOLDS = 4  # validação cruzada agrupada, só dentro do treino
TARGET_F1_MACRO = 0.85  # meta da issue
OUT_OF_SCOPE = "fora_de_escopo"
BASELINE_NAME = "baseline (classe mais frequente)"
DEFAULT_PLOT_PATH = ROOT.parent / "docs" / "img" / "ml-intents-confusion-matrix.png"

# Hiperparâmetros testados por família. O LinearSVC fica com o padrão (C=1).
GRIDS: dict[str, list[dict[str, Any]]] = {
    "logreg": [{"C": 1.0}, {"C": 10.0}, {"C": 100.0}],
    "linear_svc": [{"C": 1.0}],
    "naive_bayes": [{"alpha": 0.1}, {"alpha": 1.0}],
}
# O LinearSVC não tem `predict_proba`, então não pode entregar a confiança que a API exige.
PROBA_FAMILIES = ("logreg", "naive_bayes")


@dataclass(frozen=True)
class Metrics:
    """Métricas de classificação no teste (F1 macro com e sem o limite de confiança)."""

    accuracy: float
    f1_macro: float  # comportamento da API: confiança < 0.5 vira fora_de_escopo
    f1_macro_no_threshold: float  # só o argmax do modelo


@dataclass(frozen=True)
class Candidate:
    """Uma combinação vetorizador + família de modelo, com o melhor hiperparâmetro da validação."""

    name: str
    vectorizer: str
    family: str
    params: dict[str, Any]
    validation_f1: float
    pipeline: Pipeline


@dataclass(frozen=True)
class TrainingResult:
    """Tudo que o relatório e o artefato precisam do treino."""

    chosen: Candidate
    candidates: list[Candidate]
    test_metrics: dict[str, Metrics]  # todos os candidatos e o baseline
    per_class: pd.DataFrame  # precision, recall, f1 e suporte do escolhido
    confusion: np.ndarray  # linhas = real, colunas = previsto (ordem de INTENTS)
    n_train: int
    n_test: int
    n_templates_train: int
    n_templates_test: int


def make_vectorizer(kind: str) -> TfidfVectorizer | CountVectorizer:
    """TF-IDF de palavras, Bag-of-Words (comparação) ou TF-IDF de caracteres (robusto a typo)."""
    if kind == "tfidf_word":
        return TfidfVectorizer(preprocessor=normalize_text, tokenizer=tokenize,
                               token_pattern=None,  # type: ignore[arg-type]  # o sklearn aceita None; só o stub não
                               ngram_range=(1, 2), sublinear_tf=True)
    if kind == "bow_word":
        return CountVectorizer(preprocessor=normalize_text, tokenizer=tokenize,
                               token_pattern=None,  # type: ignore[arg-type]
                               ngram_range=(1, 2))
    if kind == "tfidf_char":
        return TfidfVectorizer(preprocessor=normalize_text, analyzer="char_wb",
                               ngram_range=(2, 5), sublinear_tf=True)
    raise ValueError(f"Vetorizador desconhecido: {kind}")


def make_estimator(family: str, params: dict[str, Any]) -> ClassifierMixin:
    """Cria o modelo da família com os hiperparâmetros dados."""
    if family == "logreg":
        return LogisticRegression(max_iter=2000, random_state=SEED, **params)
    if family == "linear_svc":
        return LinearSVC(random_state=SEED, **params)
    if family == "naive_bayes":
        return MultinomialNB(**params)
    raise ValueError(f"Família desconhecida: {family}")


def make_pipeline(vectorizer: str, family: str, params: dict[str, Any]) -> Pipeline:
    """Vetorizador + modelo no mesmo `Pipeline`: o vocabulário é aprendido só no que o `fit` recebe."""
    return Pipeline([("vectorizer", make_vectorizer(vectorizer)),
                     ("model", make_estimator(family, params))])


def macro_f1(y_true: Any, y_pred: Any) -> float:
    """F1 macro sobre todas as intenções; a que não recebe nenhuma previsão conta 0, sem aviso."""
    return float(f1_score(
        y_true, y_pred, average="macro", labels=list(INTENTS),
        zero_division=0,  # type: ignore[arg-type]  # o sklearn aceita 0; o stub só declara str
    ))


def predict_with_threshold(pipeline: Pipeline, texts: np.ndarray, threshold: float = CONFIDENCE_THRESHOLD) -> np.ndarray:
    """Previsão como a API faz: confiança abaixo do limite vira `fora_de_escopo`."""
    probabilities = pipeline.predict_proba(texts)  # type: ignore[attr-defined]
    labels = pipeline.classes_[probabilities.argmax(axis=1)]  # type: ignore[attr-defined]
    return np.where(probabilities.max(axis=1) < threshold, OUT_OF_SCOPE, labels)


def _score(pipeline: Pipeline, family: str, texts: np.ndarray, labels: np.ndarray) -> float:
    """F1 macro; para quem tem `predict_proba` já vale o comportamento da API (com limite)."""
    predicted = predict_with_threshold(pipeline, texts) if family in PROBA_FAMILIES else pipeline.predict(texts)
    return macro_f1(labels, predicted)


def cross_validated_f1(vectorizer: str, family: str, params: dict[str, Any],
                       X: np.ndarray, y: np.ndarray, groups: np.ndarray) -> float:
    """F1 macro médio em dobras estratificadas que nunca separam variações da mesma frase."""
    folds = StratifiedGroupKFold(n_splits=VALIDATION_FOLDS, shuffle=True, random_state=SEED)
    scores = []
    for fit_idx, valid_idx in folds.split(X, y, groups):
        model = make_pipeline(vectorizer, family, params).fit(X[fit_idx], y[fit_idx])
        scores.append(_score(model, family, X[valid_idx], y[valid_idx]))
    return float(np.mean(scores))


def split_train_test(y: np.ndarray, groups: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Teste estratificado por intenção, com cada `base_id` inteiro de um lado só (sem vazamento)."""
    folds = StratifiedGroupKFold(n_splits=TEST_FOLDS, shuffle=True, random_state=SEED)
    train_idx, test_idx = next(folds.split(np.zeros(len(y)), y, groups))
    return train_idx, test_idx


def evaluate(pipeline: Pipeline, family: str, X: np.ndarray, y: np.ndarray) -> Metrics:
    """Accuracy e F1 macro no teste."""
    raw = pipeline.predict(X)
    deployed = predict_with_threshold(pipeline, X) if family in PROBA_FAMILIES else raw
    return Metrics(
        accuracy=float(accuracy_score(y, deployed)),
        f1_macro=macro_f1(y, deployed),
        f1_macro_no_threshold=macro_f1(y, raw),
    )


def train(data_path: Path = DATA_DIR / "intents.csv") -> TrainingResult:
    """Escolhe pela validação dentro do treino e mede no teste agrupado (uma vez)."""
    random.seed(SEED)
    np.random.seed(SEED)

    df = pd.read_csv(data_path)
    X, y, groups = df["text"].to_numpy(), df["intent"].to_numpy(), df["base_id"].to_numpy()
    train_idx, test_idx = split_train_test(y, groups)
    X_train, y_train, g_train = X[train_idx], y[train_idx], groups[train_idx]
    X_test, y_test = X[test_idx], y[test_idx]

    # 1) Para cada (vetorizador, família): melhor hiperparâmetro pela validação cruzada do treino.
    candidates: list[Candidate] = []
    for vectorizer in ("tfidf_word", "bow_word", "tfidf_char"):
        for family, grid in GRIDS.items():
            scored = [(cross_validated_f1(vectorizer, family, p, X_train, y_train, g_train), p) for p in grid]
            best_score, best_params = max(scored, key=lambda item: item[0])
            candidates.append(Candidate(
                name=f"{vectorizer} + {family}", vectorizer=vectorizer, family=family, params=best_params,
                validation_f1=best_score,
                pipeline=make_pipeline(vectorizer, family, best_params).fit(X_train, y_train),
            ))

    # 2) Escolha: melhor validação entre os que entregam `predict_proba`. O teste não participa.
    eligible = [c for c in candidates if c.family in PROBA_FAMILIES]
    chosen = max(eligible, key=lambda c: c.validation_f1)

    # 3) Avaliação no teste (a única vez que ele é usado), com baseline.
    test_metrics = {c.name: evaluate(c.pipeline, c.family, X_test, y_test) for c in candidates}
    baseline = DummyClassifier(strategy="most_frequent").fit(X_train, y_train)
    baseline_pred = baseline.predict(X_test)
    test_metrics[BASELINE_NAME] = Metrics(
        accuracy=float(accuracy_score(y_test, baseline_pred)),
        f1_macro=macro_f1(y_test, baseline_pred),
        f1_macro_no_threshold=macro_f1(y_test, baseline_pred),
    )
    if test_metrics[chosen.name].f1_macro < TARGET_F1_MACRO:
        raise RuntimeError(
            f"F1 macro de teste ({test_metrics[chosen.name].f1_macro:.3f}) abaixo da meta "
            f"({TARGET_F1_MACRO}). Amplie os exemplos em scripts/intent_templates.py."
        )

    deployed = predict_with_threshold(chosen.pipeline, X_test)
    per_class = pd.DataFrame(
        _per_class(y_test, deployed), index=list(INTENTS), columns=["precision", "recall", "f1", "support"]
    )
    return TrainingResult(
        chosen=chosen, candidates=candidates, test_metrics=test_metrics, per_class=per_class,
        confusion=confusion_matrix(y_test, deployed, labels=list(INTENTS)),
        n_train=len(train_idx), n_test=len(test_idx),
        n_templates_train=len(set(g_train)), n_templates_test=len(set(groups[test_idx])),
    )


def _per_class(y_true: np.ndarray, y_pred: np.ndarray) -> list[tuple[float, float, float, int]]:
    """Precision, recall, F1 e suporte de cada intenção, na ordem de INTENTS."""
    precision, recall, f1, support = precision_recall_fscore_support(
        y_true, y_pred, labels=list(INTENTS), zero_division=0.0  # type: ignore[arg-type]
    )
    return list(zip(
        np.asarray(precision).tolist(), np.asarray(recall).tolist(),
        np.asarray(f1).tolist(), np.asarray(support).tolist(), strict=True,
    ))


def save_artifact(result: TrainingResult, path: Path = INTENT_MODEL_PATH) -> None:
    """Grava o pipeline e os metadados que a API precisa."""
    artifact: dict[str, Any] = {
        "model_name": result.chosen.name,
        "pipeline": result.chosen.pipeline,
        "params": result.chosen.params,
        "metrics": asdict(result.test_metrics[result.chosen.name]),
        "baseline_metrics": asdict(result.test_metrics[BASELINE_NAME]),
        "classes": list(result.chosen.pipeline.classes_),  # type: ignore[attr-defined]
        "threshold": CONFIDENCE_THRESHOLD,
        "sklearn_version": sklearn.__version__,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, path)


def plot_confusion_matrix(result: TrainingResult, path: Path = DEFAULT_PLOT_PATH) -> None:
    """Matriz de confusão do modelo escolhido no teste, para o `docs/ml-report.md`."""
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    labels = list(INTENTS)
    fig, ax = plt.subplots(figsize=(9, 7.5))
    image = ax.imshow(result.confusion, cmap="Blues")
    ax.set_xticks(range(len(labels)), labels, rotation=45, ha="right")
    ax.set_yticks(range(len(labels)), labels)
    for i in range(len(labels)):
        for j in range(len(labels)):
            count = int(result.confusion[i, j])
            if count:
                ax.text(j, i, str(count), ha="center", va="center",
                        color="white" if count > result.confusion.max() / 2 else "black")
    ax.set(xlabel="Previsto", ylabel="Real",
           title=f"Matriz de confusão no teste ({result.chosen.name})")
    fig.colorbar(image, ax=ax, fraction=0.046)
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)


def log_report(result: TrainingResult) -> None:
    """Imprime as tabelas que vão para o relatório."""
    logger.info("Treino: %d frases (%d templates) | teste: %d frases (%d templates)",
                result.n_train, result.n_templates_train, result.n_test, result.n_templates_test)
    logger.info("%-28s %-18s %8s | %8s %8s %12s", "modelo", "params", "F1 valid.", "acc", "F1 macro", "F1 s/ limite")
    for c in result.candidates:
        m = result.test_metrics[c.name]
        logger.info("%-28s %-18s %8.3f | %8.3f %8.3f %12.3f", c.name, c.params, c.validation_f1,
                    m.accuracy, m.f1_macro, m.f1_macro_no_threshold)
    b = result.test_metrics[BASELINE_NAME]
    logger.info("%-28s %-18s %8s | %8.3f %8.3f", BASELINE_NAME, "", "-", b.accuracy, b.f1_macro)
    logger.info("Escolhido: %s %s", result.chosen.name, result.chosen.params)
    logger.info("Por intenção (teste):\n%s", result.per_class.round(3).to_string())


def main(argv: list[str] | None = None) -> None:
    """Ponto de entrada da linha de comando."""
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    parser = argparse.ArgumentParser(description="Treina o classificador de intenções.")
    parser.add_argument("--out", type=Path, default=INTENT_MODEL_PATH)
    parser.add_argument("--plot-path", type=Path, default=DEFAULT_PLOT_PATH)
    parser.add_argument("--no-plot", action="store_true")
    args = parser.parse_args(argv)

    result = train()
    save_artifact(result, args.out)
    if not args.no_plot:
        plot_confusion_matrix(result, args.plot_path)
    log_report(result)
    logger.info("Artefato salvo em %s", args.out)


if __name__ == "__main__":
    main()