"""Pré-processamento do texto do morador: minúsculas, sem acentos e tokenização."""
import re
import unicodedata

_TOKEN_PATTERN = re.compile(r"[a-z0-9]+")


def normalize_text(text: str) -> str:
    """Põe em minúsculas, remove acentos e cedilha e junta espaços repetidos."""
    decomposed = unicodedata.normalize("NFD", text.lower())
    without_accents = "".join(c for c in decomposed if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", without_accents).strip()


def tokenize(text: str) -> list[str]:
    """Quebra em palavras e números; a pontuação é descartada."""
    return _TOKEN_PATTERN.findall(normalize_text(text))
