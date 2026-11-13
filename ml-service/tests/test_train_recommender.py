from pathlib import Path

import joblib
import numpy as np
import pytest

from app.core.config import RECOMMENDER_MODEL_PATH
from app.services.recommender_features import FEATURE_NAMES
from scripts import generate_data as gd
from scripts import train_recommender as tr


@pytest.fixture(scope="module")
def result() -> tr.TrainingResult:
    return tr.train()


def test_k_is_the_one_with_the_highest_silhouette(result: tr.TrainingResult) -> None:
    silhouettes = result.selection.silhouette

    assert set(silhouettes) == set(tr.K_RANGE)
    assert result.k == max(silhouettes, key=silhouettes.__getitem__)
    assert result.silhouette == silhouettes[result.k]


def test_clusters_are_well_separated(result: tr.TrainingResult) -> None:
    # acima de 0,5 a estrutura de grupos é considerada razoável
    assert result.silhouette >= 0.5


def test_elbow_agrees_with_silhouette_on_k(result: tr.TrainingResult) -> None:
    assert result.selection.elbow_k == result.k


def test_inertia_never_increases_with_k(result: tr.TrainingResult) -> None:
    values = [result.selection.inertia[k] for k in tr.K_RANGE]

    assert values == sorted(values, reverse=True)


def test_elbow_index_finds_the_bend() -> None:
    ks = [2, 3, 4, 5, 6]

    assert tr.elbow_index(ks, [100.0, 50.0, 10.0, 8.0, 7.0]) == 4


def test_cold_start_residents_are_left_out_of_the_fit(result: tr.TrainingResult) -> None:
    assert result.n_cold_start == gd.N_COLD_START
    assert result.n_residents == gd.N_RESIDENTS - gd.N_COLD_START
    assert sum(result.cluster_sizes.values()) == result.n_residents


def test_clusters_recover_the_latent_groups(result: tr.TrainingResult) -> None:
    assert result.adjusted_rand > 0.8
    # moradores fora do ajuste (47): amostra pequena
    assert result.holdout_adjusted_rand > 0.6


def test_each_centroid_is_a_distribution_over_categories(result: tr.TrainingResult) -> None:
    assert list(result.centroids.columns) == list(FEATURE_NAMES)
    assert np.allclose(result.centroids.sum(axis=1), 1.0)


def test_pipeline_normalizes_inside_the_pipeline(result: tr.TrainingResult) -> None:
    assert [name for name, _ in result.pipeline.steps] == [
        "normalizer", "kmeans"]


def test_training_is_reproducible() -> None:
    first, second = tr.train(), tr.train()

    assert first.k == second.k
    assert first.selection.best_k == second.selection.best_k
    assert first.selection.elbow_k == second.selection.elbow_k
    for k in tr.K_RANGE:
        assert first.selection.inertia[k] == pytest.approx(
            second.selection.inertia[k])
        assert first.selection.silhouette[k] == pytest.approx(
            second.selection.silhouette[k])
    assert np.allclose(first.centroids, second.centroids)


def test_committed_artifact_matches_a_fresh_training(result: tr.TrainingResult) -> None:
    artifact = joblib.load(RECOMMENDER_MODEL_PATH)

    assert artifact["k"] == result.k, "Artefato desatualizado: rode `python -m scripts.train_recommender`."
    assert artifact["silhouette"] == pytest.approx(result.silhouette)
    assert artifact["feature_names"] == list(FEATURE_NAMES)
    centers = artifact["pipeline"].named_steps["kmeans"].cluster_centers_
    assert np.allclose(
        centers, result.pipeline.named_steps["kmeans"].cluster_centers_)


def test_save_artifact_roundtrip(result: tr.TrainingResult, tmp_path: Path) -> None:
    path = tmp_path / "model.joblib"

    tr.save_artifact(result, path)

    saved = joblib.load(path)
    assert saved["k"] == result.k
    assert saved["k_selection"]["silhouette"] == result.selection.silhouette
