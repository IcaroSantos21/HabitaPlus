from pydantic import Field, field_validator

from app.core.constants import Intent
from app.schemas.base import CamelModel


class NluRequest(CamelModel):
    """Texto do morador a ser interpretado."""

    text: str = Field(examples=["quero abrir chamado do elevador do bloco B"])

    @field_validator("text")
    @classmethod
    def text_must_not_be_blank(cls, value: str) -> str:
        """Rejeita texto vazio ou só com espaços."""
        if not value.strip():
            raise ValueError("O texto não pode ser vazio.")
        return value


class Entities(CamelModel):
    """Entidades extraídas. Só as encontradas aparecem na resposta."""

    unidade: str | None = None
    bloco: str | None = None
    equipamento: str | None = None
    quartos: int | None = None
    valor_max: float | None = None
    data: str | None = None


class NluResponse(CamelModel):
    """Intenção, confiança e entidades."""

    intent: Intent
    confidence: float = Field(ge=0, le=1)
    entities: Entities