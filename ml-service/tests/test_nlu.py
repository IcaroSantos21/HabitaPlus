from fastapi.testclient import TestClient

from app.core.dependencies import get_nlu_service
from app.main import app
from app.schemas.nlu import Entities, NluResponse


# Exemplo do contrato: intenção, confiança alta e entidades extraídas.
def test_parse_returns_contract_example(client: TestClient) -> None:
    response = client.post(
        "/nlu/parse", json={"text": "quero abrir chamado do elevador do bloco B"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "abrir_chamado"
    assert 0.5 <= body["confidence"] <= 1.0
    assert body["entities"] == {"equipamento": "elevador", "bloco": "B"}


# As entidades numéricas saem com o tipo certo e em camelCase.
def test_parse_returns_typed_entities_in_camel_case(client: TestClient) -> None:
    body = client.post(
        "/nlu/parse", json={"text": "tem apartamento de dois quartos no bloco c até 2 mil?"}
    ).json()

    assert body["intent"] == "consultar_apartamentos"
    assert body["entities"] == {"bloco": "C", "quartos": 2, "valorMax": 2000.0}


# Confere que entidades não encontradas são omitidas na resposta.
def test_parse_omits_entities_not_found(client: TestClient) -> None:
    body = client.post("/nlu/parse", json={"text": "oi"}).json()

    assert body["intent"] == "saudacao"
    assert body["entities"] == {}


# Texto sem relação com o condomínio vira fora_de_escopo.
def test_parse_unrelated_text_is_out_of_scope(client: TestClient) -> None:
    body = client.post("/nlu/parse", json={"text": "asdfghjkl"}).json()

    assert body["intent"] == "fora_de_escopo"


# Confere que um texto composto apenas por espaços é rejeitado.
def test_parse_rejects_blank_text(client: TestClient) -> None:
    response = client.post("/nlu/parse", json={"text": "   "})

    assert response.status_code == 422


# Confere que a requisição não pode omitir o texto.
def test_parse_rejects_missing_text(client: TestClient) -> None:
    response = client.post("/nlu/parse", json={})

    assert response.status_code == 422


# Confere que a implementação de NLU pode ser substituída nos testes.
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
