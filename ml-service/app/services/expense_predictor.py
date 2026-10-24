"""Previsão de despesas do próximo mês: só inferência, o treino fica em `scripts/`."""
import logging
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from sklearn.base import RegressorMixin

from app.schemas.predict import ExpensesRequest, ExpensesResponse
from app.services.expense_features import FEATURE_NAMES, build_feature_row

logger = logging.getLogger(__name__)


class SklearnExpensePredictor:
    """Prevê o mês seguinte ao último do histórico com um pipeline treinado do scikit-learn."""

    def __init__(self, pipeline: RegressorMixin, model_name: str, mae: float) -> None:
        self._pipeline = pipeline
        self._model_name = model_name
        self._mae = mae

    @classmethod
    def from_artifact(cls, path: Path) -> "SklearnExpensePredictor":
        """Carrega o artefato gerado por `scripts/train_expenses.py`."""
        if not path.exists():
            raise FileNotFoundError(
                f"Modelo de despesas não encontrado em {path}. "
                "Rode `python -m scripts.train_expenses` dentro de ml-service/."
            )
        artifact: dict[str, Any] = joblib.load(path)
        if tuple(artifact["feature_names"]) != FEATURE_NAMES:
            raise ValueError(
                "O modelo salvo usa outras features que o código atual. "
                "Rode `python -m scripts.train_expenses` para gerar o artefato de novo."
            )
        logger.info("Modelo de despesas carregado: %s (MAE de teste %.2f)",
                    artifact["model_name"], artifact["metrics"]["mae"])
        return cls(artifact["pipeline"], artifact["model_name"], artifact["metrics"]["mae"])

    def predict(self, request: ExpensesRequest) -> ExpensesResponse:
        """Usa os 3 últimos meses do histórico (já ordenado e consecutivo pelo schema)."""
        history = request.history
        target_month = pd.Period(history[-1].month, freq="M") + 1
        features = build_feature_row(target_month, [item.total for item in history])
        predicted = float(self._pipeline.predict(features.reshape(1, -1))[0]) # type: ignore
        return ExpensesResponse(
            month=str(target_month),
            predicted_total=round(max(predicted, 0.0), 2),  # despesa não é negativa
            model=self._model_name,
            mae=round(self._mae, 2),
        )