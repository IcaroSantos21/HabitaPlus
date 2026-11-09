
"""Providers de dependência (FastAPI Depends)."""

from fastapi import Request

from app.services.protocols import ExpensePredictor, NluService, Recommender
from app.services.stubs import StubNluService


def get_nlu_service() -> NluService:
    """Devolve a implementação de NLU."""
    return StubNluService()
Para trocar um stub pelo modelo real, basta mudar o retorno aqui.
"""
from app.services.protocols import ExpensePredictor, NluService, Recommender

from fastapi import Request

# Fornece a implementação de NLU usada pela rota.
def get_nlu_service(request: Request) -> NluService:
    """Devolve o serviço de NLU."""
    return request.app.state.nlu


def get_expense_predictor(request: Request) -> ExpensePredictor:
    """Devolve o serviço de previsão de despesas."""
    return request.app.state.expense_predictor


def get_recommender(request: Request) -> Recommender:
    """Devolve o serviço de recomendação."""
    return request.app.state.recommender
