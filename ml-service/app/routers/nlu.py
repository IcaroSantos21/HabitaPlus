from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.dependencies import get_nlu_service
from app.schemas.nlu import NluRequest, NluResponse
from app.services.protocols import NluService

router = APIRouter(prefix="/nlu", tags=["nlu"])


@router.post(
    "/parse",
    response_model=NluResponse,
    response_model_exclude_none=True,
    summary="Identifica intenção e entidades",
)
def parse(
    body: NluRequest,
    service: Annotated[NluService, Depends(get_nlu_service)],
) -> NluResponse:
    """Interpreta o texto do morador (stub)."""
    return service.parse(body.text)