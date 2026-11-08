"""Testes do KMeansRecommender com um modelo pequeno, montado na hora (sem depender do artefato)."""
import numpy as np
import pytest

from app.core.constants import NO_CLUSTER
from app.schemas.recommend import Candidate, Profile, RecommendRequest
from app.services.recommender import KMeansRecommender, normalized_popularity
from scripts.train_recommender import make_pipeline

# Dois perfis bem separados: quem gosta de móveis e quem gosta de eletrônicos.
TRAINING = np.array([
    [9, 1, 0, 0, 0], [8, 2, 1, 0, 0], [10, 0, 1, 1, 0],
    [1, 9, 0, 0, 1], [0, 10, 1, 0, 0], [1, 8, 0, 1, 1],
], dtype=float)


@pytest.fixture(scope="module")
def recommender() -> KMeansRecommender:
    return KMeansRecommender(make_pipeline(2).fit(TRAINING), silhouette=0.9)


def candidate(listing_id: int, categoria: str, popularidade: int = 0) -> Candidate:
    return Candidate(listing_id=listing_id, categoria=categoria, preco=10.0, popularidade=popularidade)  # type: ignore[arg-type]


def request(profile: Profile, candidates: list[Candidate], top_n: int = 5) -> RecommendRequest:
    return RecommendRequest(resident_id=1, profile=profile, candidates=candidates, top_n=top_n)


def test_strongest_category_of_the_cluster_comes_first(recommender: KMeansRecommender) -> None:
    candidates = [candidate(1, "eletronicos", 50), candidate(2, "moveis", 1), candidate(3, "esporte", 99)]

    response = recommender.recommend(request(Profile(visualizacoes={"moveis": 6}), candidates))

    assert response.recommendations[0].listing_id == 2  # categoria forte vence a popularidade


def test_residents_with_different_tastes_land_in_different_clusters(recommender: KMeansRecommender) -> None:
    furniture = recommender.recommend(request(Profile(visualizacoes={"moveis": 6}), []))
    tech = recommender.recommend(request(Profile(visualizacoes={"eletronicos": 6}), []))

    assert furniture.cluster != tech.cluster
    assert {furniture.cluster, tech.cluster} == {0, 1}


def test_cluster_does_not_depend_on_how_much_the_resident_interacts(recommender: KMeansRecommender) -> None:
    few = recommender.recommend(request(Profile(visualizacoes={"moveis": 2}), []))
    many = recommender.recommend(request(Profile(visualizacoes={"moveis": 80}), []))

    assert few.cluster == many.cluster


def test_popularity_breaks_ties_inside_the_same_category(recommender: KMeansRecommender) -> None:
    candidates = [candidate(1, "moveis", 3), candidate(2, "moveis", 9)]

    response = recommender.recommend(request(Profile(visualizacoes={"moveis": 5}), candidates))

    assert [r.listing_id for r in response.recommendations] == [2, 1]


def test_scores_are_between_zero_and_one_and_sorted(recommender: KMeansRecommender) -> None:
    candidates = [candidate(i, c, i * 3) for i, c in enumerate(["moveis", "esporte", "outros", "utensilios", "eletronicos"], 1)]

    scores = [r.score for r in recommender.recommend(request(Profile(visualizacoes={"moveis": 5}), candidates)).recommendations]

    assert all(0 <= s <= 1 for s in scores)
    assert scores == sorted(scores, reverse=True)


def test_top_n_limits_the_list(recommender: KMeansRecommender) -> None:
    candidates = [candidate(i, "moveis", i) for i in range(1, 8)]

    response = recommender.recommend(request(Profile(visualizacoes={"moveis": 5}), candidates, top_n=3))

    assert len(response.recommendations) == 3


def test_no_candidates_gives_an_empty_list(recommender: KMeansRecommender) -> None:
    response = recommender.recommend(request(Profile(visualizacoes={"moveis": 5}), []))

    assert response.recommendations == []
    assert response.cluster >= 0


def test_tie_in_score_is_broken_by_listing_id(recommender: KMeansRecommender) -> None:
    candidates = [candidate(9, "moveis", 5), candidate(4, "moveis", 5)]

    response = recommender.recommend(request(Profile(visualizacoes={"moveis": 5}), candidates))

    assert [r.listing_id for r in response.recommendations] == [4, 9]


def test_cold_start_returns_the_most_popular_without_cluster(recommender: KMeansRecommender) -> None:
    candidates = [candidate(1, "moveis", 3), candidate(2, "esporte", 20), candidate(3, "outros", 8)]

    response = recommender.recommend(request(Profile(), candidates))

    assert response.cluster == NO_CLUSTER
    assert [r.listing_id for r in response.recommendations] == [2, 3, 1]
    assert response.recommendations[0].score == 1.0


def test_profile_with_only_zero_counts_is_cold_start(recommender: KMeansRecommender) -> None:
    profile = Profile(visualizacoes={"moveis": 0}, conversas={"esporte": 0})

    assert recommender.recommend(request(profile, [candidate(1, "moveis", 1)])).cluster == NO_CLUSTER


def test_profile_with_only_chats_is_not_cold_start(recommender: KMeansRecommender) -> None:
    assert recommender.recommend(request(Profile(conversas={"moveis": 1}), [])).cluster >= 0


def test_normalized_popularity_handles_all_zero() -> None:
    assert normalized_popularity([candidate(1, "moveis", 0), candidate(2, "moveis", 0)]) == [0.0, 0.0]
    assert normalized_popularity([]) == []


def test_missing_artifact_gives_a_clear_error_in_portuguese(tmp_path) -> None:  # noqa: ANN001
    with pytest.raises(FileNotFoundError, match="train_recommender"):
        KMeansRecommender.from_artifact(tmp_path / "nao_existe.joblib")
