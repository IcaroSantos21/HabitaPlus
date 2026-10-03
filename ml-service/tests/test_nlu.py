from fastapi.testclient import TestClient

from app.core.dependencies import get_nlu_service
from app.main import app
from app.schemas.nlu import Entities, NluResponse


def test_parse_returns_contract_example(client: TestClient) -> None:
    response = client.post(
        "/nlu/parse", json={"text": "quero abrir chamado do elevador do bloco B"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "abrir_chamado"
    assert body["confidence"] == 0.93
    assert body["entities"] == {"equipamento": "elevador", "bloco": "B"}


def test_parse_omits_entities_not_found(client: TestClient) -> None:
    body = client.post("/nlu/parse", json={"text": "oi"}).json()

    assert "quartos" not in body["entities"]
    assert "valorMax" not in body["entities"]


def test_parse_rejects_blank_text(client: TestClient) -> None:
    response = client.post("/nlu/parse", json={"text": "   "})

    assert response.status_code == 422


def test_parse_rejects_missing_text(client: TestClient) -> None:
    response = client.post("/nlu/parse", json={})

    assert response.status_code == 422


def test_service_can_be_replaced_via_dependency_override(client: TestClient) -> None:
    class FakeNlu:
        def parse(self, text: str) -> NluResponse:
            return NluResponse(intent="saudacao", confidence=0.99, entities=Entities())

    app.dependency_overrides[get_nlu_service] = lambda: FakeNlu()
    try:
        body = client.post("/nlu/parse", json={"text": "bom dia"}).json()
    finally:
        app.dependency_overrides.clear()

    assert body["intent"] == "saudacao"
    assert body["entities"] == {}