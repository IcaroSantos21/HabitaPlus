"""Schemas da análise de recorrência de chamados de manutenção."""
from datetime import date

from pydantic import Field, model_validator

from app.schemas.base import CamelModel


class MaintenanceTicket(CamelModel):
    """Chamado mínimo necessário para a análise, sem acesso ao banco."""

    ticket_id: int = Field(gt=0)
    opened_at: date
    equipment: str | None = Field(default=None, min_length=1)
    area: str | None = Field(default=None, min_length=1)

    @model_validator(mode="after")
    def require_grouping_dimension(self) -> "MaintenanceTicket":
        """Exige equipamento ou área para evitar grupos sem significado."""
        if not self.equipment and not self.area:
            raise ValueError("Informe o equipamento ou a área do chamado.")
        return self


class MaintenanceAnalysisRequest(CamelModel):
    """Histórico de chamados enviado pelo backend para análise."""

    tickets: list[MaintenanceTicket] = Field(min_length=1)
    reference_date: date | None = None
    window_days: int = Field(default=90, ge=1, le=365)
    recurrence_threshold: int = Field(default=3, ge=2, le=100)


class MaintenanceGroup(CamelModel):
    """Resumo temporal de um equipamento/área."""

    equipment: str | None
    area: str | None
    occurrence_count: int = Field(ge=1)
    frequency_per_30_days: float = Field(ge=0)
    average_interval_days: float | None = Field(default=None, ge=0)
    recurring: bool
    preventive_maintenance_suggestion: str


class MaintenanceAnalysisResponse(CamelModel):
    """Resultado completo e determinístico da análise."""

    reference_date: date
    window_days: int
    recurrence_threshold: int
    groups: list[MaintenanceGroup]
    recurring_items: list[MaintenanceGroup]
