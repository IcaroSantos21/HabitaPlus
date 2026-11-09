import pytest

from app.services.text_preprocessing import normalize_text, tokenize


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("Você ESTÁ no Portão?", "voce esta no portao?"),
        ("  Ação   e  coração ", "acao e coracao"),
        ("Bloco B", "bloco b"),
        ("", ""),
    ],
)
def test_normalize_text_lowercases_and_strips_accents(raw: str, expected: str) -> None:
    assert normalize_text(raw) == expected


def test_normalize_text_is_idempotent() -> None:
    once = normalize_text("Segunda-feira, às 10h")

    assert normalize_text(once) == once


def test_tokenize_splits_words_and_numbers_and_drops_punctuation() -> None:
    assert tokenize("Quero abrir chamado, apto 302!") == ["quero", "abrir", "chamado", "apto", "302"]


def test_tokenize_applies_the_same_normalization() -> None:
    assert tokenize("PORTÃO quebrou") == ["portao", "quebrou"]


def test_tokenize_empty_text_gives_no_tokens() -> None:
    assert tokenize("?!  ") == []
