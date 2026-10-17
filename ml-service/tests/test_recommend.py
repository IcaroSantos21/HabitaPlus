from fastapi.testclient import TestClient

# Dados básicos usados pelas requisições de recomendação.
CANDIDATES = [{"listingId": 7, "categoria": "moveis", "preco": 350.0, "popularidade": 14}]

NORMAL_PAYLOAD = {
    "residentId": 12,
    "profile": {
        "visualizacoes": {"moveis": 5, "eletronicos": 1},
        "anunciadas": {},
        "conversas": {"moveis": 2},
    },
    "candidates": CANDIDATES,
    "topN": 5,
}


# Confere a estrutura camelCase e o resultado de exemplo da recomendação.
def test_recommend_returns_camel_case_contract(client: TestClient) -> None:
    response = client.post("/recommend", json=NORMAL_PAYLOAD)

    assert response.status_code == 200
    assert response.json() == {
        "cluster": 2,
        "recommendations": [{"listingId": 7, "score": 0.82}],
    }


# Confere que um perfil vazio pode iniciar recomendações sem histórico.
def test_recommend_accepts_empty_profile_cold_start(client: TestClient) -> None:
    payload = {
        "residentId": 1,
        "profile": {"visualizacoes": {}, "anunciadas": {}, "conversas": {}},
        "candidates": CANDIDATES,
    }

    assert client.post("/recommend", json=payload).status_code == 200


# Confere que uma categoria fora da lista permitida é rejeitada.
def test_recommend_rejects_unknown_category(client: TestClient) -> None:
    payload = {**NORMAL_PAYLOAD, "candidates": [{**CANDIDATES[0], "categoria": "carros"}]}

    assert client.post("/recommend", json=payload).status_code == 422


# Confere que topN respeita o limite mínimo configurado.
def test_recommend_rejects_invalid_top_n(client: TestClient) -> None:
    payload = {**NORMAL_PAYLOAD, "topN": 0}

    assert client.post("/recommend", json=payload).status_code == 422