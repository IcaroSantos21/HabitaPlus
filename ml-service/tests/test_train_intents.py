from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import pytest

from app.core.config import DATA_DIR, INTENT_MODEL_PATH
from app.core.constants import INTENTS
from scripts import train_intents as ti


@pytest.fixture(scope="module")
def result() -> ti.TrainingResult:
    return ti.train()


@pytest.fixture(scope="module")
def split() -> tuple[pd.DataFrame, pd.DataFrame]:
    df = pd.read_csv(DATA_DIR / "intents.csv")
    train_idx, test_idx = ti.split_train_test(df["intent"].to_numpy(), df["base_id"].to_numpy())
    return df.iloc[train_idx], df.iloc[test_idx]


# --- sem vazamento -------------------------------------------------------------


def test_no_template_is_on_both_sides_of_the_split(split: tuple[pd.DataFrame, pd.DataFrame]) -> None:
    train, test = split

    assert set(train["base_id"]).isdisjoint(set(test["base_id"]))


def test_no_test_phrase_was_seen_in_training(split: tuple[pd.DataFrame, pd.DataFrame]) -> None:
    train, test = split

    assert set(train["text"]).isdisjoint(set(test["text"]))


def test_every_intent_is_in_both_sides_of_the_split(split: tuple[pd.DataFrame, pd.DataFrame]) -> None:
    train, test = split

    assert set(train["intent"]) == set(test["intent"]) == set(INTENTS)


def test_test_set_is_about_a_fifth_of_the_data(result: ti.TrainingResult) -> None:
    share = result.n_test / (result.n_train + result.n_test)

    assert 0.15 <= share <= 0.25


# --- metas e comparação ---------------------------------------------------------


def test_chosen_model_reaches_the_f1_target(result: ti.TrainingResult) -> None:
    assert result.test_metrics[result.chosen.name].f1_macro >= ti.TARGET_F1_MACRO


def test_chosen_model_beats_the_baseline(result: ti.TrainingResult) -> None:
    chosen = result.test_metrics[result.chosen.name]
    baseline = result.test_metrics[ti.BASELINE_NAME]

    assert chosen.f1_macro > baseline.f1_macro
    assert chosen.accuracy > baseline.accuracy


def test_all_families_and_vectorizers_were_compared(result: ti.TrainingResult) -> None:
    assert {(c.vectorizer, c.family) for c in result.candidates} == {
        (v, f) for v in ("tfidf_word", "bow_word", "tfidf_char") for f in ("logreg", "linear_svc", "naive_bayes")
    }
    assert set(result.test_metrics) == {c.name for c in result.candidates} | {ti.BASELINE_NAME}


def test_model_is_chosen_by_validation_among_those_with_predict_proba(result: ti.TrainingResult) -> None:
    eligible = [c for c in result.candidates if c.family in ti.PROBA_FAMILIES]

    assert result.chosen.family in ti.PROBA_FAMILIES
    assert result.chosen.validation_f1 == max(c.validation_f1 for c in eligible)


def test_chosen_pipeline_gives_probabilities_that_sum_to_one(result: ti.TrainingResult) -> None:
    probabilities = result.chosen.pipeline.predict_proba(["quero abrir um chamado"])  # type: ignore[attr-defined]

    assert probabilities.shape == (1, len(INTENTS))
    assert probabilities.sum() == pytest.approx(1.0)


def test_pipeline_vectorizes_inside_the_pipeline(result: ti.TrainingResult) -> None:
    assert [name for name, _ in result.chosen.pipeline.steps] == ["vectorizer", "model"]


# --- matriz de confusão e relatório ---------------------------------------------


def test_confusion_matrix_covers_every_test_phrase(result: ti.TrainingResult) -> None:
    assert result.confusion.shape == (len(INTENTS), len(INTENTS))
    assert result.confusion.sum() == result.n_test


def test_per_class_report_has_every_intent(result: ti.TrainingResult) -> None:
    assert list(result.per_class.index) == list(INTENTS)
    assert result.per_class["support"].sum() == result.n_test


def test_threshold_only_ever_sends_phrases_to_out_of_scope(result: ti.TrainingResult) -> None:
    texts = np.array(["asdfghjkl", "quero abrir chamado do elevador"])

    raw = result.chosen.pipeline.predict(texts)
    deployed = ti.predict_with_threshold(result.chosen.pipeline, texts)

    assert all(d == r or d == ti.OUT_OF_SCOPE for d, r in zip(deployed, raw, strict=True))


# --- reprodutibilidade e artefato -------------------------------------------------


def test_training_is_reproducible(result: ti.TrainingResult) -> None:
    again = ti.train()

    assert again.chosen.name == result.chosen.name
    assert again.chosen.params == result.chosen.params
    for name, metrics in result.test_metrics.items():
        assert again.test_metrics[name].f1_macro == pytest.approx(metrics.f1_macro)
    assert np.array_equal(again.confusion, result.confusion)


def test_committed_artifact_matches_a_fresh_training(result: ti.TrainingResult) -> None:
    artifact = joblib.load(INTENT_MODEL_PATH)

    assert artifact["model_name"] == result.chosen.name, "Artefato desatualizado: rode `python -m scripts.train_intents`."
    assert artifact["metrics"]["f1_macro"] == pytest.approx(result.test_metrics[result.chosen.name].f1_macro)
    assert artifact["classes"] == list(result.chosen.pipeline.classes_)  # type: ignore[attr-defined]


def test_save_artifact_roundtrip(result: ti.TrainingResult, tmp_path: Path) -> None:
    path = tmp_path / "model.joblib"

    ti.save_artifact(result, path)

    saved = joblib.load(path)
    assert saved["model_name"] == result.chosen.name
    assert saved["threshold"] == 0.5
