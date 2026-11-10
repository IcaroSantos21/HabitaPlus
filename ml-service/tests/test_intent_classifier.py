import numpy as np
import pytest

from app.core.config import INTENT_MODEL_PATH
from app.services.intent_classifier import OUT_OF_SCOPE, SklearnIntentClassifier


class FakePipeline:
    """Pipeline falso com probabilidades fixas, para testar só a regra de confiança."""

    classes_ = np.array(["abrir_chamado", "saudacao"])

    def __init__(self, probabilities: list[float]) -> None:
        self._probabilities = np.array([probabilities])

    def predict_proba(self, texts: list[str]) -> np.ndarray:
        return self._probabilities


@pytest.fixture(scope="module")
def classifier() -> SklearnIntentClassifier:
    return SklearnIntentClassifier.from_artifact(INTENT_MODEL_PATH)


# Uma frase por intenção, escritas à parte (não estão no dataset de treino).
@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("olá, boa tarde", "saudacao"),
        ("quais apartamentos estão vagos no bloco C?", "consultar_apartamentos"),
        ("quero abrir um chamado porque o portão está quebrado", "abrir_chamado"),
        ("qual o andamento do chamado 1042?", "status_chamado"),
        ("preciso da segunda via do boleto de março", "segunda_via_boleto"),
        ("estou devendo alguma taxa do condomínio?", "status_financeiro"),
        ("qual a previsão de gastos para o próximo mês?", "previsao_despesas"),
        ("me recomenda algum produto do marketplace", "recomendar_produtos"),
        ("qual o horário de silêncio do condomínio?", "regras_condominio"),
    ],
)
def test_sanity_one_phrase_per_intent(classifier: SklearnIntentClassifier, text: str, expected: str) -> None:
    prediction = classifier.predict(text)

    assert prediction.intent == expected
    assert prediction.confidence >= 0.5


@pytest.mark.parametrize("text", ["qual a capital da Argentina?", "xkcd qwerty zzz", "asdfghjkl"])
def test_random_phrases_are_out_of_scope(classifier: SklearnIntentClassifier, text: str) -> None:
    assert classifier.predict(text).intent == OUT_OF_SCOPE


def test_confidence_is_a_probability(classifier: SklearnIntentClassifier) -> None:
    prediction = classifier.predict("quero abrir chamado do elevador")

    assert 0.0 <= prediction.confidence <= 1.0


def test_low_confidence_becomes_out_of_scope() -> None:
    low = SklearnIntentClassifier(FakePipeline([0.45, 0.30]), threshold=0.5)  # type: ignore[arg-type]

    prediction = low.predict("qualquer coisa")

    assert prediction.intent == OUT_OF_SCOPE
    assert prediction.confidence == 0.45  # a confiança original é mantida


def test_confidence_at_the_threshold_keeps_the_intent() -> None:
    at_limit = SklearnIntentClassifier(FakePipeline([0.5, 0.2]), threshold=0.5)  # type: ignore[arg-type]

    assert at_limit.predict("qualquer coisa").intent == "abrir_chamado"


def test_high_confidence_keeps_the_intent() -> None:
    sure = SklearnIntentClassifier(FakePipeline([0.1, 0.9]), threshold=0.5)  # type: ignore[arg-type]

    assert sure.predict("oi").intent == "saudacao"


def test_missing_artifact_gives_a_clear_error_in_portuguese(tmp_path) -> None:  # noqa: ANN001
    with pytest.raises(FileNotFoundError, match="train_intents"):
        SklearnIntentClassifier.from_artifact(tmp_path / "nao_existe.joblib")
