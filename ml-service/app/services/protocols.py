"""Abstrações dos services. Routers dependem destes contratos, não das implementações."""
from typing import Protocol

from app.schemas.nlu import NluResponse
from app.schemas.predict import ExpensesRequest, ExpensesResponse
from app.schemas.recommend import RecommendRequest, RecommendResponse


class NluService(Protocol):
    """Interpreta o texto do morador."""

    def parse(self, text: str) -> NluResponse: ...


class ExpensePredictor(Protocol):
    """Prevê as despesas do próximo mês."""

    def predict(self, request: ExpensesRequest) -> ExpensesResponse: ...


class Recommender(Protocol):
    """Recomenda anúncios do marketplace."""

    def recommend(self, request: RecommendRequest) -> RecommendResponse: ...