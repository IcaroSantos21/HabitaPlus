"""Providers de dependência (FastAPI `Depends`).

Para trocar um stub pelo modelo real, basta mudar o retorno aqui.
"""
from app.services.protocols import ExpensePredictor, NluService, Recommender
from app.services.stubs import StubExpensePredictor, StubNluService, StubRecommender


# Fornece a implementação de NLU usada pela rota.
def get_nlu_service() -> NluService:
    """Devolve o serviço de NLU."""
    return StubNluService()


# Fornece a implementação de previsão usada pela rota.
def get_expense_predictor() -> ExpensePredictor:
    """Devolve o serviço de previsão de despesas."""
    return StubExpensePredictor()


# Fornece a implementação de recomendações usada pela rota.
def get_recommender() -> Recommender:
    """Devolve o serviço de recomendação."""
    return StubRecommender()