from pathlib import Path

import joblib
import pytest

from app.core.config import EXPENSE_MODEL_PATH
from app.services.expense_features import FEATURE_NAMES
from scripts import train_expenses as te


@pytest.fixture(scope="module")
def result() -> te.TrainingResult:
    return te.train()


def test_chosen_model_beats_the_baseline_on_test_mae(result: te.TrainingResult) -> None:
    assert result.test_metrics[result.model_name].mae < result.test_metrics[te.BASELINE_NAME].mae


def test_all_candidates_and_baseline_have_the_three_metrics(result: te.TrainingResult) -> None:
    assert set(result.test_metrics) == {te.BASELINE_NAME, "ridge", "random_forest"}
    for metrics in result.test_metrics.values():
        assert metrics.mae > 0
        assert metrics.rmse >= metrics.mae  # RMSE nunca é menor que o MAE
        assert 0 < metrics.mape < 100


def test_test_set_is_the_last_months_in_order(result: te.TrainingResult) -> None:
    assert len(result.test_months) == te.TEST_MONTHS
    assert result.test_months == sorted(result.test_months)
    assert result.test_months[-1] == "2026-10"


def test_model_is_chosen_by_validation_and_never_by_test(result: te.TrainingResult) -> None:
    candidates = {k: v for k, v in result.validation_mae.items() if k != te.BASELINE_NAME}

    assert result.model_name == min(candidates, key=candidates.__getitem__)


def test_pipeline_scales_inside_the_pipeline(result: te.TrainingResult) -> None:
    assert [name for name, _ in result.pipeline.steps] == ["scaler", "model"]


def test_training_is_reproducible() -> None:
    first, second = te.train(), te.train()

    assert first.model_name == second.model_name
    assert first.test_metrics == second.test_metrics


def test_committed_artifact_matches_a_fresh_training(result: te.TrainingResult) -> None:
    artifact = joblib.load(EXPENSE_MODEL_PATH)

    assert artifact["model_name"] == result.model_name, (
        "Artefato desatualizado: rode `python -m scripts.train_expenses`."
    )
    assert artifact["metrics"]["mae"] == pytest.approx(result.test_metrics[result.model_name].mae)
    assert artifact["feature_names"] == list(FEATURE_NAMES)


def test_save_artifact_roundtrip(result: te.TrainingResult, tmp_path: Path) -> None:
    path = tmp_path / "model.joblib"

    te.save_artifact(result, path)

    assert joblib.load(path)["model_name"] == result.model_name