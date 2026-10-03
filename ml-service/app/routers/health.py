from fastapi import APIRouter

from app.core.config import APP_NAME, APP_VERSION
from app.schemas.health import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse, summary="Healthcheck")
def health() -> HealthResponse:
    """Indica que o serviço está no ar."""
    return HealthResponse(status="ok", service=APP_NAME, version=APP_VERSION)