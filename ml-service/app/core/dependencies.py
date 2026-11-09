"""Providers de dependência (FastAPI `Depends`).

Para trocar um stub pelo modelo real, basta mudar o retorno aqui.
"""
from app.services.protocols import ExpensePredictor, NluService, Recommender, MaintenanceAnalyzerProtocol

from fastapi import Request

# Fornece a implementação de NLU usada pela rota.
=======
"""Providers de dependência (FastAPI Depends)."""

from fastapi import Request

from app.services.protocols import ExpensePredictor, NluService, Recommender

def get_nlu_service(request: Request) -> NluService:
    """Devolve o serviço de NLU."""
    return request.app.state.nlu


def get_expense_predictor(request: Request) -> ExpensePredictor:
    """Devolve o serviço de previsão de despesas."""
    return request.app.state.expense_predictor


def get_recommender(request: Request) -> Recommender:
    """Devolve o serviço de recomendação."""
    return request.app.state.recommender

def get_maintenance_analyzer(request: Request) -> MaintenanceAnalyzerProtocol:
    """Devolve o analisador de manutenção carregado na subida."""
    return request.app.state.maintenance_analyzer
