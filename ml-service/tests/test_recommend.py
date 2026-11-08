from fastapi.testclient import TestClient

from app.core.constants import NO_CLUSTER

# Dados básicos usados pelas requisições de recomendação.
CANDIDATES = [
    {"listingId": 7, "categoria": "moveis", "preco": 350.0, "popularidade": 14},
    {"listingId": 8, "categoria": "eletronicos", "preco": 900.0, "popularidade": 30},
    {"listingId": 9, "categoria": "esporte", "preco": 120.0, "popularidade": 5},
]

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

EMPTY_PROFILE = {"visualizacoes": {}, "anunciadas": {}, "conversas": {}}


# Perfil normal: cluster atribuído e lista ordenada em camelCase.
def test_recommend_normal_profile_returns_ordered_recommendations(client: TestClient) -> None:
    response = client.post("/recommend", json=NORMAL_PAYLOAD)

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"cluster", "recommendations"}
    assert body["cluster"] >= 0
    recommendations = body["recommendations"]
    assert [set(r) for r in recommendations] == [{"listingId", "score"}] * 3
    scores = [r["score"] for r in recommendations]
    assert scores == sorted(scores, reverse=True)
    assert recommendations[0]["listingId"] == 7  # quem vê e conversa sobre móveis recebe móveis primeiro


# Confere que cada perfil típico recebe as categorias do seu grupo (modelo real treinado).
def test_recommend_trained_model_matches_the_typical_profiles(client: TestClient) -> None:
    profiles = {
        "moveis": {"visualizacoes": {"moveis": 9, "utensilios": 6, "eletronicos": 1}},
        "eletronicos": {"visualizacoes": {"eletronicos": 10, "esporte": 1}},
        "esporte": {"visualizacoes": {"esporte": 9, "outros": 3, "eletronicos": 2}},
        "outros": {"visualizacoes": {"outros": 9, "utensilios": 2, "moveis": 1}},
    }
    candidates = [
        {"listingId": i, "categoria": c, "preco": 10.0, "popularidade": 10}
        for i, c in enumerate(["moveis", "eletronicos", "utensilios", "esporte", "outros"], 1)
    ]
    clusters = set()
    for expected, profile in profiles.items():
        payload = {"residentId": 1, "profile": profile, "candidates": candidates}
        body = client.post("/recommend", json=payload).json()
        top = next(c for c in candidates if c["listingId"] == body["recommendations"][0]["listingId"])
        assert top["categoria"] == expected
        clusters.add(body["cluster"])
    assert len(clusters) == 4


# Cold start: perfil vazio devolve os mais populares, sem cluster.
def test_recommend_empty_profile_returns_most_popular(client: TestClient) -> None:
    payload = {"residentId": 1, "profile": EMPTY_PROFILE, "candidates": CANDIDATES}

    response = client.post("/recommend", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["cluster"] == NO_CLUSTER
    assert [r["listingId"] for r in body["recommendations"]] == [8, 7, 9]


# O padrão do contrato (topN = 5) e o limite pedido são respeitados.
def test_recommend_respects_top_n(client: TestClient) -> None:
    payload = {**NORMAL_PAYLOAD, "topN": 2}

    assert len(client.post("/recommend", json=payload).json()["recommendations"]) == 2


# Sem candidatos a lista é vazia (não é erro).
def test_recommend_without_candidates_returns_empty_list(client: TestClient) -> None:
    body = client.post("/recommend", json={**NORMAL_PAYLOAD, "candidates": []}).json()

    assert body["recommendations"] == []


# Confere que uma categoria fora da lista permitida é rejeitada.
def test_recommend_rejects_unknown_category(client: TestClient) -> None:
    payload = {**NORMAL_PAYLOAD, "candidates": [{**CANDIDATES[0], "categoria": "carros"}]}

    assert client.post("/recommend", json=payload).status_code == 422


# Confere que topN respeita o limite mínimo configurado.
def test_recommend_rejects_invalid_top_n(client: TestClient) -> None:
    payload = {**NORMAL_PAYLOAD, "topN": 0}

    assert client.post("/recommend", json=payload).status_code == 422


# Contagens negativas não fazem sentido e quebrariam a normalização.
def test_recommend_rejects_negative_counts(client: TestClient) -> None:
    payload = {**NORMAL_PAYLOAD, "profile": {**EMPTY_PROFILE, "visualizacoes": {"moveis": -1}}}

    assert client.post("/recommend", json=payload).status_code == 422
