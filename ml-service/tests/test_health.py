from fastapi.testclient import TestClient


# Confere a resposta do endpoint de saúde.
def test_health_returns_ok(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "ml-service"
    assert "version" in body


# Confere que a página de documentação interativa está disponível.
def test_swagger_docs_available(client: TestClient) -> None:
    response = client.get("/docs")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


# Confere que todos os endpoints esperados aparecem no OpenAPI.
def test_openapi_exposes_all_endpoints(client: TestClient) -> None:
    paths = client.get("/openapi.json").json()["paths"]

    for path in ("/health", "/nlu/parse", "/predict/expenses", "/recommend"):
        assert path in paths