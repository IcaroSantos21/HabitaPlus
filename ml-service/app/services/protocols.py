"""Abstrações dos services. Routers dependem destes contratos, não das implementações."""
from typing import Protocol

from app.schemas.nlu import NluResponse
from app.schemas.predict import ExpensesRequest, ExpensesResponse
from app.schemas.recommend import RecommendRequest, RecommendResponse


# Contrato que qualquer serviço de interpretação de texto deve seguir.
class NluService(Protocol):
    """Interpreta o texto do morador."""

    def parse(self, text: str) -> NluResponse: ...


# Contrato que qualquer serviço de previsão de despesas deve seguir.
class ExpensePredictor(Protocol):
    """Prevê as despesas do próximo mês."""

    def predict(self, request: ExpensesRequest) -> ExpensesResponse: ...


# Contrato que qualquer serviço de recomendação deve seguir.
class Recommender(Protocol):
    """Recomenda anúncios do marketplace."""

    def recommend(self, request: RecommendRequest) -> RecommendResponse: ...