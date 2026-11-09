"""Um grupo de testes por regex de entidade, com casos positivos e negativos."""
import pytest

from app.services import entity_extractor as ee

# --- unidade -----------------------------------------------------------------


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("tem vazamento no apto 302", "302"),
        ("problema no ap. 302", "302"),
        ("ap 58 está sem água", "58"),
        ("apartamento 1204 do bloco b", "1204"),
        ("Apartamento nº 405", "405"),
        ("unidade 101", "101"),
        ("APTO 710", "710"),
    ],
)
def test_extract_unit_positive(text: str, expected: str) -> None:
    assert ee.extract_unit(text) == expected


@pytest.mark.parametrize(
    "text",
    [
        "tem apartamento disponível?",
        "apto 2 quartos",  # o número é de quartos, não da unidade
        "apartamento até 2 mil",
        "preciso de um ap",
        "o chamado 1042 já foi resolvido?",
        "apartamento de 12345 reais",
    ],
)
def test_extract_unit_negative(text: str) -> None:
    assert ee.extract_unit(text) is None


# --- bloco -------------------------------------------------------------------


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("elevador do bloco b", "B"),
        ("Bloco B", "B"),
        ("BLOCO C quebrou", "C"),
        ("bl. d está sem luz", "D"),
        ("bl a", "A"),
    ],
)
def test_extract_block_positive(text: str, expected: str) -> None:
    assert ee.extract_block(text) == expected


@pytest.mark.parametrize(
    "text",
    [
        "quero abrir um chamado",
        "o bloco e o elevador",  # "e" é conjunção, não o bloco E
        "bloco de notas",
        "blocos disponíveis",
    ],
)
def test_extract_block_negative(text: str) -> None:
    assert ee.extract_block(text) is None


# --- equipamento -------------------------------------------------------------


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("o elevador parou", "elevador"),
        ("os elevadores estão lentos", "elevador"),
        ("portão da garagem travou", "portao"),
        ("PORTÕES quebrados", "portao"),
        ("a bomba d'água queimou", "bomba"),
        ("interfone não toca", "interfone"),
        ("iluminação do corredor", "iluminacao"),
        ("a lâmpada queimou", "iluminacao"),
        ("tá sem luz no corredor", "iluminacao"),
        ("portão e elevador com defeito", "portao"),  # o primeiro citado
    ],
)
def test_extract_equipment_positive(text: str, expected: str) -> None:
    assert ee.extract_equipment(text) == expected


@pytest.mark.parametrize(
    "text",
    ["quero abrir um chamado", "a portaria está fechada", "qual a conta de luz?", "bombom de chocolate"],
)
def test_extract_equipment_negative(text: str) -> None:
    assert ee.extract_equipment(text) is None


# --- quartos -----------------------------------------------------------------


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("apartamento de 2 quartos", 2),
        ("3 quartos", 3),
        ("dois quartos", 2),
        ("três quartos no bloco a", 3),
        ("um quarto", 1),
        ("1 quarto só", 1),
        ("Quero DUAS dormitórios", 2),
    ],
)
def test_extract_bedrooms_positive(text: str, expected: int) -> None:
    assert ee.extract_bedrooms(text) == expected


@pytest.mark.parametrize(
    "text",
    ["tem apartamento vago?", "o quarto andar", "quartos disponíveis", "apto 302", "dia 2"],
)
def test_extract_bedrooms_negative(text: str) -> None:
    assert ee.extract_bedrooms(text) is None


# --- valor (R$) ---------------------------------------------------------------


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("até 2 mil", 2000.0),
        ("R$ 2.500", 2500.0),
        ("r$2500", 2500.0),
        ("R$ 900", 900.0),
        ("1500 reais", 1500.0),
        ("R$ 2.500,50", 2500.5),
        ("R$ 2,5 mil", 2500.0),
        ("até dois mil", 2000.0),
        ("3 mil por mês", 3000.0),
        ("abaixo de 1800", 1800.0),
    ],
)
def test_extract_max_value_positive(text: str, expected: float) -> None:
    assert ee.extract_max_value(text) == pytest.approx(expected)


@pytest.mark.parametrize(
    "text",
    [
        "tem apartamento vago?",
        "apartamento de 2 quartos",
        "até 2 quartos",
        "barulho até 22h",
        "dia 15/11",
        "chamado 1042",
    ],
)
def test_extract_max_value_negative(text: str) -> None:
    assert ee.extract_max_value(text) is None


# --- data --------------------------------------------------------------------


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("tem apartamento para amanhã?", "amanha"),
        ("preciso hoje", "hoje"),
        ("dia 10", "dia 10"),
        ("dia 15/11", "dia 15/11"),
        ("dia 10 de março", "dia 10 de marco"),
        ("vence 15/11/2026", "15/11/2026"),
        ("na segunda-feira", "segunda-feira"),
        ("sábado de manhã", "sabado"),
        ("15 de novembro", "15 de novembro"),
        ("depois de amanhã", "depois de amanha"),
    ],
)
def test_extract_date_positive(text: str, expected: str) -> None:
    assert ee.extract_date(text) == expected


@pytest.mark.parametrize(
    "text",
    [
        "segunda via do boleto",  # não é segunda-feira
        "quero abrir um chamado",
        "apto 302",
        "até 2 mil",
        "preciso do boleto de março",  # mês sozinho não é data
    ],
)
def test_extract_date_negative(text: str) -> None:
    assert ee.extract_date(text) is None


# --- extrator completo ---------------------------------------------------------


def test_extractor_returns_only_what_was_found() -> None:
    entities = ee.RegexEntityExtractor().extract("quero abrir chamado do elevador do bloco B")

    assert entities.model_dump(exclude_none=True) == {"equipamento": "elevador", "bloco": "B"}


def test_extractor_finds_several_entities_in_one_sentence() -> None:
    text = "procuro apartamento de dois quartos no bloco c até R$ 2.500 para dia 15/11"

    assert ee.RegexEntityExtractor().extract(text).model_dump(exclude_none=True) == {
        "bloco": "C", "quartos": 2, "valor_max": 2500.0, "data": "dia 15/11",
    }


def test_extractor_gives_nothing_for_a_greeting() -> None:
    assert ee.RegexEntityExtractor().extract("oi").model_dump(exclude_none=True) == {}
