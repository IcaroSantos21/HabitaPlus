"""Análise temporal de chamados para orientar manutenção preventiva."""
from collections import defaultdict
from datetime import date, timedelta
from statistics import mean

from app.schemas.maintenance import (
    MaintenanceAnalysisRequest,
    MaintenanceAnalysisResponse,
    MaintenanceGroup,
    MaintenanceTicket,
)


SUGGESTIONS_BY_EQUIPMENT: dict[str, str] = {
    "elevador": "Agendar inspeção preventiva do elevador e revisar componentes de segurança.",
    "portao": "Agendar inspeção preventiva do portão e revisar motor, sensores e controle de acesso.",
    "bomba": "Agendar inspeção preventiva da bomba e verificar vedação, pressão e alimentação elétrica.",
    "interfone": "Agendar inspeção preventiva do interfone e testar alimentação e pontos de comunicação.",
    "iluminacao": "Agendar inspeção preventiva da iluminação e revisar lâmpadas, fiação e sensores.",
}
DEFAULT_SUGGESTION = "Agendar inspeção preventiva do item e investigar a causa das ocorrências recorrentes."


class MaintenanceAnalyzer:
    """Agrupa ocorrências recentes e sinaliza recorrência por regra de negócio."""

    def analyze(self, request: MaintenanceAnalysisRequest) -> MaintenanceAnalysisResponse:
        """Analisa os chamados recebidos sem persistir dados ou treinar em requisição."""
        reference_date = request.reference_date or max(ticket.opened_at for ticket in request.tickets)
        period_start = reference_date - timedelta(days=request.window_days - 1)
        groups = self._group_recent_tickets(request.tickets, period_start, reference_date)

        summaries = [
            self._summarize_group(
                equipment=equipment,
                area=area,
                tickets=tickets,
                request=request,
            )
            for (equipment, area), tickets in sorted(
                groups.items(), key=lambda item: (item[0][0] or "", item[0][1] or "")
            )
        ]
        recurring_items = [summary for summary in summaries if summary.recurring]
        return MaintenanceAnalysisResponse(
            reference_date=reference_date,
            window_days=request.window_days,
            recurrence_threshold=request.recurrence_threshold,
            groups=summaries,
            recurring_items=recurring_items,
        )

    @staticmethod
    def _group_recent_tickets(
        tickets: list[MaintenanceTicket], period_start: date, reference_date: date
    ) -> dict[tuple[str | None, str | None], list[MaintenanceTicket]]:
        """Filtra a janela inclusiva e agrupa por equipamento e área normalizados."""
        groups: dict[tuple[str | None, str | None], list[MaintenanceTicket]] = defaultdict(list)
        for ticket in tickets:
            if period_start <= ticket.opened_at <= reference_date:
                key = (
                    ticket.equipment.strip().lower() if ticket.equipment else None,
                    ticket.area.strip().lower() if ticket.area else None,
                )
                groups[key].append(ticket)
        return groups

    @classmethod
    def _summarize_group(
        cls,
        equipment: str | None,
        area: str | None,
        tickets: list[MaintenanceTicket],
        request: MaintenanceAnalysisRequest,
    ) -> MaintenanceGroup:
        """Calcula frequência, intervalo médio e recomendação do grupo."""
        dates = sorted(ticket.opened_at for ticket in tickets)
        intervals = [(current - previous).days for previous, current in zip(dates, dates[1:], strict=False)]
        count = len(dates)
        return MaintenanceGroup(
            equipment=equipment,
            area=area,
            occurrence_count=count,
            frequency_per_30_days=round(count * 30 / request.window_days, 4),
            average_interval_days=round(mean(intervals), 4) if intervals else None,
            recurring=count >= request.recurrence_threshold,
            preventive_maintenance_suggestion=cls._suggestion(equipment),
        )

    @staticmethod
    def _suggestion(equipment: str | None) -> str:
        """Retorna uma sugestão explicável e fácil de ampliar."""
        return SUGGESTIONS_BY_EQUIPMENT.get(equipment or "", DEFAULT_SUGGESTION)
