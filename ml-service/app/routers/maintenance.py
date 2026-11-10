from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.dependencies import get_maintenance_analyzer
from app.schemas.maintenance import MaintenanceAnalysisRequest, MaintenanceAnalysisResponse
from app.services.protocols import MaintenanceAnalyzerProtocol

router = APIRouter(prefix="/analyze", tags=["maintenance"])


@router.post(
    "/maintenance",
    response_model=MaintenanceAnalysisResponse,
    summary="Analisa chamados recorrentes e sugere manutenção preventiva",
)
def analyze_maintenance(
    body: MaintenanceAnalysisRequest,
    service: Annotated[MaintenanceAnalyzerProtocol, Depends(get_maintenance_analyzer)],
) -> MaintenanceAnalysisResponse:
    """Agrupa chamados recentes e devolve os itens recorrentes."""
    return service.analyze(body)
