"""Extração de entidades (slots) por regex: uma função pequena por entidade."""
import re

from app.schemas.nlu import Entities
from app.services.text_preprocessing import normalize_text

# Blocos do condomínio. "e" fica de fora de propósito: "o bloco e o elevador" não é o bloco E.
BLOCK_LETTERS = "abcd"

# id do equipamento (ASCII, como no dataset) -> regex sobre o texto já normalizado. Fácil de ampliar.
EQUIPMENT_PATTERNS: dict[str, str] = {
    "elevador": r"\belevador(?:es)?\b",
    "portao": r"\bport(?:ao|oes)\b",
    "bomba": r"\bbombas?\b",
    "interfone": r"\binterfones?\b",
    "iluminacao": r"\b(?:iluminacao|lampadas?|luminarias?|sem luz)\b",
}

NUMBER_WORDS: dict[str, int] = {
    "um": 1, "uma": 1, "dois": 2, "duas": 2, "tres": 3, "quatro": 4, "cinco": 5,
    "seis": 6, "sete": 7, "oito": 8, "nove": 9, "dez": 10,
}
_WORDS = "|".join(NUMBER_WORDS)
# 2.500 | 2.500,50 | 1500 | 2,5  (ponto separa milhar e vírgula separa decimal, como no Brasil)
_NUMBER = r"\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?"
_NOT_A_COUNT = r"(?!\s*(?:quartos?|dormitorios?|qtos?|qts?|reais|real|mil)\b)"
_MONTHS = "janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro"

_UNIT = re.compile(
    r"\b(?:apartamentos?|aptos?|apts?|ap|unidade|casa)\.?\s*(?:(?:n[o°º]?|numero)\.?\s*)?"
    rf"(\d{{1,4}})\b{_NOT_A_COUNT}"
)
_BLOCK = re.compile(rf"\b(?:bloco|bl)\.?\s*([{BLOCK_LETTERS}])\b")
_BEDROOMS = re.compile(
    rf"\b(\d{{1,2}}|{_WORDS})\s*(?:quartos?|dormitorios?|qtos?|qts?)\b")
# Valores em ordem de prioridade: "R$ 2.500", "2 mil", "1500 reais", "até 2000".
_MONEY = (
    re.compile(rf"\br\$\s*({_NUMBER})(?:\s*(mil)\b)?"),
    re.compile(rf"\b({_NUMBER}|{_WORDS})\s*(mil)\b"),
    re.compile(rf"\b({_NUMBER})\s*(?:reais|real)\b"),
    re.compile(
        rf"\b(?:ate|abaixo de|no maximo)\s+({_NUMBER})\b(?!\s*(?:quartos?|dormitorios?|qtos?|qts?|/|h\b|horas?))"),
)
_DATES = (
    re.compile(r"\b(?:depois de amanha|amanha|hoje)\b"),
    re.compile(rf"\bdia\s+\d{{1,2}}(?:/\d{{1,2}}|\s+de\s+(?:{_MONTHS}))?\b"),
    re.compile(rf"\b\d{{1,2}}\s+de\s+(?:{_MONTHS})\b"),
    re.compile(r"\b\d{1,2}/\d{1,2}(?:/\d{2,4})?\b"),
    # "segunda via do boleto" não é segunda-feira.
    re.compile(
        r"\b(?:segunda(?!\s+via\b)|terca|quarta|quinta|sexta)(?:-feira)?\b|\b(?:sabado|domingo)\b"),
)


def extract_unit(text: str) -> str | None:
    """Número da unidade: "apto 302", "ap. 302", "apartamento nº 58", "unidade 1204"."""
    match = _UNIT.search(normalize_text(text))
    return match.group(1) if match else None


def extract_block(text: str) -> str | None:
    """Letra do bloco em maiúscula: "bloco b", "Bloco B", "bl. c"."""
    match = _BLOCK.search(normalize_text(text))
    return match.group(1).upper() if match else None


def extract_equipment(text: str) -> str | None:
    """Primeiro equipamento citado (id ASCII, ex.: "portao"); ver EQUIPMENT_PATTERNS."""
    normalized = normalize_text(text)
    found = [
        (match.start(), name)
        for name, pattern in EQUIPMENT_PATTERNS.items()
        if (match := re.search(pattern, normalized))
    ]
    return min(found)[1] if found else None


def extract_bedrooms(text: str) -> int | None:
    """Número de quartos: "2 quartos", "dois quartos", "um quarto"."""
    match = _BEDROOMS.search(normalize_text(text))
    if not match:
        return None
    token = match.group(1)
    return int(token) if token.isdigit() else NUMBER_WORDS[token]


def _to_float(token: str) -> float:
    """Converte "2.500,50" (formato brasileiro) ou "dois" em número."""
    if token in NUMBER_WORDS:
        return float(NUMBER_WORDS[token])
    return float(token.replace(".", "").replace(",", "."))


def extract_min_value(text: str) -> float | None:
    """Valor mínimo em reais: "acima de 2 mil", "mais de R$ 1500"."""
    normalized = normalize_text(text)
    if re.search(r"(?:acima de|mais de|superior a|maior que|a partir de)\s*(?:r\$\s*)?\d", normalized):
        match = re.search(
            r"(?:acima de|mais de|superior a|maior que|a partir de)\s*(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+|\d+(?:,\d+)?|(?:um|dois|tres|quatro|cinco|seis|sete|oito|nove|dez))(?:\s*(mil|reais|real))?",
            normalized,
        )
        if match:
            value = _to_float(match.group(1))
            if match.group(2) == "mil" or "." in match.group(1):
                value *= 1000
            return round(value, 2)
    return None


def extract_max_value(text: str) -> float | None:
    """Valor em reais: "R$ 2.500", "até 2 mil", "1500 reais", "R$ 2,5 mil". O valor citado é o teto."""
    normalized = normalize_text(text)
    if re.search(r"(?:acima de|mais de|superior a|maior que|a partir de)\s*(?:r\$\s*)?\d", normalized):
        return None
    for pattern in _MONEY:
        match = pattern.search(normalized)
        if match:
            value = _to_float(match.group(1))
            if match.lastindex and match.lastindex >= 2 and match.group(2):
                value *= 1000
            return round(value, 2)
    return None


def extract_date(text: str) -> str | None:
    """Expressão de data (minúsculas, sem acento): "amanha", "dia 10", "dia 15/11", "segunda-feira".

    Não vira data ISO: resolver "amanhã" exige a data de hoje, que é papel do back.
    """
    normalized = normalize_text(text)
    found = [(m.start(), m.group(0))
             for p in _DATES if (m := p.search(normalized))]
    return min(found)[1] if found else None


class RegexEntityExtractor:
    """Junta as funções de extração no formato `Entities` da API."""

    def extract(self, text: str) -> Entities:
        """Devolve só o que foi encontrado; o resto fica `None` e some da resposta."""
        return Entities(
            unidade=extract_unit(text),
            bloco=extract_block(text),
            equipamento=extract_equipment(text),
            quartos=extract_bedrooms(text),
            valor_min=extract_min_value(text),
            valor_max=extract_max_value(text),
            data=extract_date(text),
        )
