from fastapi.testclient import TestClient

VALID_HISTORY = {
    "history": [
        {"month": "2025-11", "total": 18250.40},
        {"month": "2025-12", "total": 19110.00},
        {"month": "2026-01", "total": 18700.00},
    ]
}


def test_predict_returns_camel_case_contract(client: TestClient) -> None:
    response = client.post("/predict/expenses", json=VALID_HISTORY)

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"month", "predictedTotal", "model", "mae"}
    assert body["month"] == "2026-11"
    assert body["predictedTotal"] == 18980.55


def test_predict_short_history_returns_422_with_clear_message(client: TestClient) -> None:
    payload = {"history": VALID_HISTORY["history"][:2]}

    response = client.post("/predict/expenses", json=payload)

    assert response.status_code == 422
    assert "pelo menos 3 meses" in response.json()["detail"][0]["msg"]


def test_predict_rejects_invalid_month_format(client: TestClient) -> None:
    payload = {"history": [{"month": "11/2025", "total": 100.0}] * 3}

    response = client.post("/predict/expenses", json=payload)

    assert response.status_code == 422
    assert "AAAA-MM" in response.json()["detail"][0]["msg"]


def test_predict_rejects_negative_total(client: TestClient) -> None:
    payload = {"history": [{"month": "2025-11", "total": -1.0}] * 3}

    assert client.post("/predict/expenses", json=payload).status_code == 422


def test_predict_rejects_missing_history(client: TestClient) -> None:
    assert client.post("/predict/expenses", json={}).status_code == 422