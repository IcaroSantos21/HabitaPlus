"""Classificação de intenções: só inferência, o treino fica em `scripts/`."""
import logging
from pathlib import Path
from typing import Any

import joblib
from sklearn.pipeline import Pipeline

from app.core.constants import CONFIDENCE_THRESHOLD, Intent
from app.services.protocols import IntentPrediction

logger = logging.getLogger(__name__)

OUT_OF_SCOPE: Intent = "fora_de_escopo"


class SklearnIntentClassifier:
    """Usa um pipeline treinado (vetorizador + modelo com `predict_proba`) do scikit-learn."""

    def __init__(self, pipeline: Pipeline, threshold: float = CONFIDENCE_THRESHOLD) -> None:
        self._pipeline = pipeline
        self._threshold = threshold

    @classmethod
    def from_artifact(cls, path: Path) -> "SklearnIntentClassifier":
        """Carrega o artefato gerado por `scripts/train_intents.py`."""
        if not path.exists():
            raise FileNotFoundError(
                f"Modelo de intenções não encontrado em {path}. "
                "Rode `python -m scripts.train_intents` dentro de ml-service/."
            )
        artifact: dict[str, Any] = joblib.load(path)
        logger.info(
            "Modelo de intenções carregado: %s (F1 macro de teste %.3f)",
            artifact["model_name"], artifact["metrics"]["f1_macro"],
        )
        return cls(artifact["pipeline"])

    def predict(self, text: str) -> IntentPrediction:
        """Confiança abaixo do limite vira `fora_de_escopo` (a confiança devolvida é a original)."""
        probabilities = self._pipeline.predict_proba([text])[0]
        best = int(probabilities.argmax())
        confidence = float(probabilities[best])
        intent: Intent = self._pipeline.classes_[best]
        if confidence < self._threshold:
            intent = OUT_OF_SCOPE
        return IntentPrediction(intent=intent, confidence=round(confidence, 4))
