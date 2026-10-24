"""Treina, avalia e salva o modelo de previsão de despesas (ML-03)."""
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
from sklearn.base import RegressorMixin, clone
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import (
    mean_absolute_error,
    mean_absolute_percentage_error,
    root_mean_squared_error,
)
from sklearn.model_selection import TimeSeriesSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.config import ARTIFACTS_DIR, DATA_DIR, EXPENSE_MODEL_PATH  # noqa: E402
from app.services.expense_features import (  # noqa: E402
    FEATURE_NAMES,
    LAG_1_INDEX,
    build_training_set,
)

logger = logging.getLogger(__name__)

SEED = 42
TEST_MONTHS = 6  # split temporal: os 6 últimos meses (2026-05 a 2026-10) são o teste
VALIDATION_STEPS = 12  # previsões de 1 mês à frente, dentro do treino, para escolher o modelo
RIDGE_ALPHAS = (1.0, 10.0, 100.0)
BASELINE_NAME = "baseline"
DEFAULT_PLOT_PATH = ROOT.parent / "docs" / "img" / "ml-expenses-real-vs-predicted.png"


@dataclass(frozen=True)
class Metrics:
    """Métricas de regressão. `mape` em porcentagem."""

    mae: float
    rmse: float
    mape: float


@dataclass(frozen=True)
class TrainingResult:
    """Tudo que o relatório e o artefato precisam do treino."""

    model_name: str
    pipeline: Pipeline
    test_metrics: dict[str, Metrics]  # baseline e cada candidato
    validation_mae: dict[str, float]  # MAE da validação de origem móvel (base da escolha)
    ridge_alpha: float
    test_months: list[str]
    test_actual: np.ndarray
    test_predictions: dict[str, np.ndarray]


def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Metrics:
    """MAE, RMSE e MAPE (%)."""
    return Metrics(
        mae=float(mean_absolute_error(y_true, y_pred)),
        rmse=float(root_mean_squared_error(y_true, y_pred)),
        mape=float(mean_absolute_percentage_error(y_true, y_pred) * 100),
    )


def make_pipeline(estimator: RegressorMixin) -> Pipeline:
    """Scaler + modelo: o scaler é ajustado só nos dados que o `fit` recebe (sem vazamento)."""
    return Pipeline([("scaler", StandardScaler()), ("model", estimator)])


def candidate_estimators(ridge_alpha: float) -> dict[str, RegressorMixin]:
    """Modelos comparados com o baseline (`LinearRegression` fica de fora: ver docs/ml-report.md)."""
    return {
        "ridge": Ridge(alpha=ridge_alpha),
        "random_forest": RandomForestRegressor(n_estimators=200, max_depth=4, random_state=SEED),
    }


def rolling_origin_mae(estimator: RegressorMixin, X: np.ndarray, y: np.ndarray, steps: int) -> float:
    """MAE de previsões de 1 mês à frente, retreinando a cada passo só com o passado."""
    errors = []
    for train_idx, valid_idx in TimeSeriesSplit(n_splits=steps, test_size=1).split(X):
        model = make_pipeline(clone(estimator)).fit(X[train_idx], y[train_idx]) # type: ignore
        errors.append(abs(model.predict(X[valid_idx])[0] - y[valid_idx][0]))
    return float(np.mean(errors))


def baseline_rolling_mae(X: np.ndarray, y: np.ndarray, steps: int) -> float:
    """MAE do baseline (repetir o último mês) nas mesmas dobras da validação."""
    errors = [
        abs(X[valid_idx[0], LAG_1_INDEX] - y[valid_idx[0]])
        for _, valid_idx in TimeSeriesSplit(n_splits=steps, test_size=1).split(X)
    ]
    return float(np.mean(errors))


def train(data_path: Path = DATA_DIR / "expenses_total.csv") -> TrainingResult:
    """Treina os candidatos, escolhe pela validação e mede no teste temporal."""
    random.seed(SEED)
    np.random.seed(SEED)

    series = pd.read_csv(data_path)
    months = [pd.Period(m, freq="M") for m in series["month"]]
    X, y, target_months = build_training_set(months, series["total"].to_numpy()) # type: ignore

    # Split temporal: nada é embaralhado, o teste é sempre o final da série.
    X_train, X_test = X[:-TEST_MONTHS], X[-TEST_MONTHS:]
    y_train, y_test = y[:-TEST_MONTHS], y[-TEST_MONTHS:]
    test_months = [str(m) for m in target_months[-TEST_MONTHS:]]

    # 1) Escolha do alpha do Ridge e do modelo: só com o treino.
    ridge_scores = {
        alpha: rolling_origin_mae(Ridge(alpha=alpha), X_train, y_train, VALIDATION_STEPS)
        for alpha in RIDGE_ALPHAS
    }
    best_alpha = min(ridge_scores, key=ridge_scores.__getitem__)
    estimators = candidate_estimators(best_alpha)
    validation_mae = {
        BASELINE_NAME: baseline_rolling_mae(X_train, y_train, VALIDATION_STEPS),
        "ridge": ridge_scores[best_alpha],
        "random_forest": rolling_origin_mae(estimators["random_forest"], X_train, y_train, VALIDATION_STEPS),
    }
    chosen = min(estimators, key=validation_mae.__getitem__)

    # 2) Ajuste final no treino e avaliação no teste (a única vez que o teste é usado).
    fitted = {name: make_pipeline(est).fit(X_train, y_train) for name, est in estimators.items()}
    predictions = {BASELINE_NAME: X_test[:, LAG_1_INDEX]}
    predictions.update({name: model.predict(X_test) for name, model in fitted.items()}) # type: ignore
    test_metrics = {name: compute_metrics(y_test, pred) for name, pred in predictions.items()}

    if test_metrics[chosen].mae >= test_metrics[BASELINE_NAME].mae:
        raise RuntimeError(
            f"O modelo escolhido ({chosen}) não superou o baseline no MAE de teste "
            f"({test_metrics[chosen].mae:.2f} >= {test_metrics[BASELINE_NAME].mae:.2f})."
        )
    return TrainingResult(
        model_name=chosen, pipeline=fitted[chosen], test_metrics=test_metrics,
        validation_mae=validation_mae, ridge_alpha=best_alpha, test_months=test_months,
        test_actual=y_test, test_predictions=predictions,
    )


def save_artifact(result: TrainingResult, path: Path = EXPENSE_MODEL_PATH) -> None:
    """Grava o pipeline e os metadados que a API precisa (nome, MAE de teste, features)."""
    artifact: dict[str, Any] = {
        "model_name": result.model_name,
        "pipeline": result.pipeline,
        "metrics": asdict(result.test_metrics[result.model_name]),
        "baseline_metrics": asdict(result.test_metrics[BASELINE_NAME]),
        "feature_names": list(FEATURE_NAMES),
        "test_months": result.test_months,
        "sklearn_version": sklearn.__version__,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, path)


def plot_real_vs_predicted(result: TrainingResult, path: Path = DEFAULT_PLOT_PATH) -> None:
    """Gráfico real x previsto nos meses de teste, para o `docs/ml-report.md`."""
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(9, 4.5))
    positions = list(range(len(result.test_months)))  # posições numéricas: evita eixo "de datas"
    ax.plot(positions, result.test_actual, "k-o", linewidth=2, label="Real")
    styles = {BASELINE_NAME: "--s", "ridge": "-^", "random_forest": "-D"}
    for name, pred in result.test_predictions.items():
        suffix = " (escolhido)" if name == result.model_name else ""
        ax.plot(positions, pred, styles[name], alpha=0.85, label=f"{name}{suffix}")
    ax.set_xticks(positions, result.test_months)
    ax.set_title("Despesas totais: real x previsto no teste temporal")
    ax.set_ylabel("Total do mês (R$)")
    ax.legend()
    ax.grid(alpha=0.3)
    fig.autofmt_xdate()
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)


def log_report(result: TrainingResult) -> None:
    """Imprime as tabelas que vão para o relatório."""
    logger.info("Teste temporal: %s a %s", result.test_months[0], result.test_months[-1])
    logger.info("%-14s %10s %10s %8s | %12s", "modelo", "MAE", "RMSE", "MAPE %", "MAE validação")
    for name, m in result.test_metrics.items():
        logger.info("%-14s %10.2f %10.2f %8.2f | %12.2f", name, m.mae, m.rmse, m.mape,
                    result.validation_mae.get(name, float("nan")))
    logger.info("Ridge alpha=%s | modelo escolhido: %s", result.ridge_alpha, result.model_name)


def main(argv: list[str] | None = None) -> None:
    """Ponto de entrada da linha de comando."""
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    parser = argparse.ArgumentParser(description="Treina o modelo de previsão de despesas.")
    parser.add_argument("--out", type=Path, default=EXPENSE_MODEL_PATH)
    parser.add_argument("--plot-path", type=Path, default=DEFAULT_PLOT_PATH)
    parser.add_argument("--no-plot", action="store_true")
    args = parser.parse_args(argv)

    result = train()
    save_artifact(result, args.out)
    if not args.no_plot:
        plot_real_vs_predicted(result, args.plot_path)
    log_report(result)
    logger.info("Artefato salvo em %s (pasta padrão: %s)", args.out, ARTIFACTS_DIR)


if __name__ == "__main__":
    main()