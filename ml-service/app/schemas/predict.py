import re

from pydantic import Field, field_validator

from app.core.constants import MIN_HISTORY_MONTHS
from app.schemas.base import CamelModel

_MONTH_PATTERN = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


class HistoryItem(CamelModel):
    """Total de despesas de um mês."""

    month: str = Field(examples=["2025-11"])
    total: float = Field(ge=0, examples=[18250.40])

    @field_validator("month")
    @classmethod
    def month_must_be_yyyy_mm(cls, value: str) -> str:
        """Garante o formato AAAA-MM."""
        if not _MONTH_PATTERN.match(value):
            raise ValueError("O mês deve estar no formato AAAA-MM (ex.: 2025-11).")
        return value


class ExpensesRequest(CamelModel):
    """Histórico financeiro enviado pelo back."""

    history: list[HistoryItem]

    @field_validator("history")
    @classmethod
    def history_must_have_min_months(cls, value: list[HistoryItem]) -> list[HistoryItem]:
        """Exige o mínimo de meses de histórico para prever."""
        if len(value) < MIN_HISTORY_MONTHS:
            raise ValueError(
                f"Histórico insuficiente: envie pelo menos {MIN_HISTORY_MONTHS} meses."
            )
        return value


class ExpensesResponse(CamelModel):
    """Previsão do próximo mês."""

    month: str
    predicted_total: float
    model: str
    mae: float