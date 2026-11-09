"""Providers de dependência (FastAPI `Depends`).

Para trocar um stub pelo modelo real, basta mudar o retorno aqui.
"""
from app.services.protocols import ExpensePredictor, NluService, Recommender, MaintenanceAnalyzerProtocol

from fastapi import Request

# Fornece a implementação de NLU usada pela rota.
def get_nlu_service(request: Request) -> NluService:
    """Devolve o serviço de NLU."""
    return request.app.state.nlu


# Fornece a implementação de previsão usada pela rota.
def get_expense_predictor(request: Request) -> ExpensePredictor:
    """Devolve o serviço de previsão de despesas."""
    return request.app.state.expense_predictor


# Fornece a implementação de recomendações usada pela rota.
def get_recommender(request: Request) -> Recommender:
    """Devolve o serviço de recomendação."""
    return request.app.state.recommender

def get_maintenance_analyzer(request: Request) -> MaintenanceAnalyzerProtocol:
    """Devolve o analisador de manutenção carregado na subida."""
    return request.app.state.maintenance_analyzer
