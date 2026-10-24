import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.core.config import EXPENSE_MODEL_PATH
from app.core.dependencies import get_expense_predictor
from app.main import app
from app.schemas.predict import ExpensesRequest, ExpensesResponse
from app.services.expense_predictor import SklearnExpensePredictor

# Exemplo de histórico válido, com o mínimo de meses exigido.
VALID_HISTORY = {
    "history": [
        {"month": "2025-11", "total": 18250.40},
        {"month": "2025-12", "total": 19110.00},
        {"month": "2026-01", "total": 18700.00},
    ]
}


# Confere o formato camelCase e o conteúdo da previsão.
def test_predict_returns_camel_case_contract(client: TestClient) -> None:
    response = client.post("/predict/expenses", json=VALID_HISTORY)

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"month", "predictedTotal", "model", "mae"}
    assert body["month"] == "2026-02"  # mês seguinte ao último do histórico
    assert body["model"] in {"ridge", "random_forest"}
    assert body["predictedTotal"] > 0
    assert body["mae"] > 0


# Confere que o mês previsto vira o ano quando o histórico termina em dezembro.
def test_predict_month_rolls_over_the_year(client: TestClient) -> None:
    history = [{"month": m, "total": 19000.0} for m in ("2025-10", "2025-11", "2025-12")]

    body = client.post("/predict/expenses", json={"history": history}).json()

    assert body["month"] == "2026-01"


# Confere que a previsão fica na mesma ordem de grandeza do histórico recente.
def test_predict_is_in_the_scale_of_recent_months(client: TestClient) -> None:
    body = client.post("/predict/expenses", json=VALID_HISTORY).json()

    assert 0.7 * 18700 < body["predictedTotal"] < 1.3 * 18700


# Confere que a ordem dos meses no request não muda o resultado.
def test_predict_ignores_the_order_of_the_history(client: TestClient) -> None:
    shuffled = {"history": list(reversed(VALID_HISTORY["history"]))}

    ordered_body = client.post("/predict/expenses", json=VALID_HISTORY).json()
    shuffled_body = client.post("/predict/expenses", json=shuffled).json()

    assert shuffled_body == ordered_body


# Confere que só os 3 últimos meses influenciam o resultado.
def test_predict_uses_only_the_last_three_months(client: TestClient) -> None:
    older = [{"month": "2025-10", "total": 99999.0}]
    longer = {"history": older + VALID_HISTORY["history"]}

    assert client.post("/predict/expenses", json=longer).json() == client.post(
        "/predict/expenses", json=VALID_HISTORY
    ).json()


# Confere que o serviço lido do artefato é o que a rota usa.
def test_predict_uses_the_model_loaded_at_startup(client: TestClient) -> None:
    assert isinstance(app.state.expense_predictor, SklearnExpensePredictor)


# Confere que histórico curto é rejeitado com uma mensagem clara.
def test_predict_short_history_returns_422_with_clear_message(client: TestClient) -> None:
    payload = {"history": VALID_HISTORY["history"][:2]}

    response = client.post("/predict/expenses", json=payload)

    assert response.status_code == 422
    assert "pelo menos 3 meses" in response.json()["detail"][0]["msg"]


# Confere que lacunas no histórico são rejeitadas (os lags dependem de meses vizinhos).
def test_predict_rejects_gap_in_history(client: TestClient) -> None:
    history = [{"month": m, "total": 100.0} for m in ("2025-11", "2026-01", "2026-02")]

    response = client.post("/predict/expenses", json={"history": history})

    assert response.status_code == 422
    assert "consecutivos" in response.json()["detail"][0]["msg"]


# Confere que meses repetidos são rejeitados.
def test_predict_rejects_duplicated_month(client: TestClient) -> None:
    history = [{"month": m, "total": 100.0} for m in ("2025-11", "2025-12", "2025-12")]

    assert client.post("/predict/expenses", json={"history": history}).status_code == 422


# Confere que meses fora do formato AAAA-MM são rejeitados.
def test_predict_rejects_invalid_month_format(client: TestClient) -> None:
    payload = {"history": [{"month": "11/2025", "total": 100.0}] * 3}

    response = client.post("/predict/expenses", json=payload)

    assert response.status_code == 422
    assert "AAAA-MM" in response.json()["detail"][0]["msg"]


# Confere que valores de despesas negativos não são aceitos.
def test_predict_rejects_negative_total(client: TestClient) -> None:
    payload = {"history": [{"month": "2025-11", "total": -1.0}] * 3}

    assert client.post("/predict/expenses", json=payload).status_code == 422


# Confere que a requisição precisa informar o histórico.
def test_predict_rejects_missing_history(client: TestClient) -> None:
    assert client.post("/predict/expenses", json={}).status_code == 422


# Confere que o serviço pode ser trocado nos testes (injeção via Depends).
def test_predictor_can_be_replaced_via_dependency_override(client: TestClient) -> None:
    class FakePredictor:
        def predict(self, request: ExpensesRequest) -> ExpensesResponse:
            return ExpensesResponse(month="2030-01", predicted_total=1.0, model="fake", mae=0.0)

    app.dependency_overrides[get_expense_predictor] = lambda: FakePredictor()
    try:
        body = client.post("/predict/expenses", json=VALID_HISTORY).json()
    finally:
        app.dependency_overrides.clear()

    assert body["model"] == "fake"


# Confere a mensagem clara quando o artefato não existe (a subida falha cedo).
def test_loading_missing_artifact_fails_with_clear_message(tmp_path) -> None:
    with pytest.raises(FileNotFoundError, match="train_expenses"):
        SklearnExpensePredictor.from_artifact(tmp_path / "nao-existe.joblib")


# Confere que o artefato versionado carrega e prevê sem erro.
def test_committed_artifact_loads_and_predicts() -> None:
    predictor = SklearnExpensePredictor.from_artifact(EXPENSE_MODEL_PATH)
    request = ExpensesRequest.model_validate(VALID_HISTORY)

    response = predictor.predict(request)

    assert np.isfinite(response.predicted_total)