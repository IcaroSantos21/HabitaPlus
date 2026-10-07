from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.dependencies import get_recommender
from app.schemas.recommend import RecommendRequest, RecommendResponse
from app.services.protocols import Recommender

router = APIRouter(prefix="/recommend", tags=["recommend"])


# Recebe o perfil do morador e os anúncios para recomendar.
@router.post(
    "",
    response_model=RecommendResponse,
    summary="Recomenda anúncios do marketplace",
)
def recommend(
    body: RecommendRequest,
    service: Annotated[Recommender, Depends(get_recommender)],
) -> RecommendResponse:
    """Recomenda anúncios para o morador (stub)."""
    return service.recommend(body)