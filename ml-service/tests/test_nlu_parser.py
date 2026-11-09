from app.schemas.nlu import Entities
from app.services.nlu_parser import NluParser
from app.services.protocols import IntentPrediction


class FakeClassifier:
    def __init__(self, intent: str, confidence: float) -> None:
        self._prediction = IntentPrediction(intent=intent, confidence=confidence)  # type: ignore[arg-type]

    def predict(self, text: str) -> IntentPrediction:
        return self._prediction


class FakeExtractor:
    def extract(self, text: str) -> Entities:
        return Entities(bloco="B")


def test_parser_joins_classifier_and_extractor() -> None:
    response = NluParser(FakeClassifier("abrir_chamado", 0.93), FakeExtractor()).parse("qualquer texto")

    assert response.intent == "abrir_chamado"
    assert response.confidence == 0.93
    assert response.entities.bloco == "B"


def test_parser_keeps_entities_when_intent_is_out_of_scope() -> None:
    response = NluParser(FakeClassifier("fora_de_escopo", 0.3), FakeExtractor()).parse("qualquer texto")

    assert response.intent == "fora_de_escopo"
    assert response.entities.bloco == "B"
