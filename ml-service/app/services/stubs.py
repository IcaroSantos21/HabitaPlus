"""Implementações fixas (stub) para o back integrar antes dos modelos reais."""
from app.schemas.nlu import Entities, NluResponse
from app.schemas.predict import ExpensesRequest, ExpensesResponse
from app.schemas.recommend import (
    Recommendation,
    RecommendRequest,
    RecommendResponse,
)


class StubNluService:
    """Devolve sempre o exemplo do contrato."""

    def parse(self, text: str) -> NluResponse:
        return NluResponse(
            intent="abrir_chamado",
            confidence=0.93,
            entities=Entities(equipamento="elevador", bloco="B"),
        )


class StubExpensePredictor:
    """Devolve sempre o exemplo do contrato."""

    def predict(self, request: ExpensesRequest) -> ExpensesResponse:
        return ExpensesResponse(
            month="2026-11",
            predicted_total=18980.55,
            model="stub",
            mae=612.30,
        )


class StubRecommender:
    """Devolve sempre o exemplo do contrato."""

    def recommend(self, request: RecommendRequest) -> RecommendResponse:
        return RecommendResponse(
            cluster=2,
            recommendations=[Recommendation(listing_id=7, score=0.82)],
        )