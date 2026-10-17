from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.dependencies import get_expense_predictor
from app.schemas.predict import ExpensesRequest, ExpensesResponse
from app.services.protocols import ExpensePredictor

router = APIRouter(prefix="/predict", tags=["predict"])


# Recebe o histórico de despesas e devolve uma previsão.
@router.post(
    "/expenses",
    response_model=ExpensesResponse,
    summary="Prevê as despesas do próximo mês",
)
def predict_expenses(
    body: ExpensesRequest,
    service: Annotated[ExpensePredictor, Depends(get_expense_predictor)],
) -> ExpensesResponse:
    """Exige pelo menos 3 meses de histórico (422 caso contrário). Stub."""
    return service.predict(body)