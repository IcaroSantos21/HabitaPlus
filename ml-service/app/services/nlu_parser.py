"""Junta o classificador de intenções e o extrator de entidades na resposta de /nlu/parse."""
from app.schemas.nlu import NluResponse
from app.services.protocols import EntityExtractor, IntentClassifier


class NluParser:
    """Compõe duas peças independentes; cada uma pode ser trocada ou mockada nos testes."""

    def __init__(self, classifier: IntentClassifier, extractor: EntityExtractor) -> None:
        self._classifier = classifier
        self._extractor = extractor

    def parse(self, text: str) -> NluResponse:
        """Intenção, confiança e entidades. As entidades saem mesmo quando a intenção é fora_de_escopo."""
        prediction = self._classifier.predict(text)
        return NluResponse(
            intent=prediction.intent,
            confidence=prediction.confidence,
            entities=self._extractor.extract(text),
        )
