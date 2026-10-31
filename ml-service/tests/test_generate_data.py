import csv
import random
import statistics
from collections import Counter
from pathlib import Path

import pytest
from sklearn.cluster import KMeans
from sklearn.metrics import adjusted_rand_score, silhouette_score

from app.core.config import DATA_DIR
from app.core.constants import CATEGORIES, INTENTS
from scripts import generate_data as gd


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as file:
        return list(csv.DictReader(file))


@pytest.fixture(scope="module")
def generated(tmp_path_factory: pytest.TempPathFactory) -> dict[str, Path]:
    return gd.generate_all(tmp_path_factory.mktemp("dataset"))


# --- reprodutibilidade -------------------------------------------------------


def test_running_twice_generates_identical_files(
    generated: dict[str, Path], tmp_path: Path
) -> None:
    second = gd.generate_all(tmp_path)

    for name, path in generated.items():
        assert path.read_bytes() == second[name].read_bytes(), name


def test_committed_csvs_match_the_generator(generated: dict[str, Path]) -> None:
    for path in generated.values():
        committed = DATA_DIR / path.name
        assert committed.exists(), f"{path.name} não está versionado em data/"
        assert committed.read_bytes() == path.read_bytes(), (
            f"{path.name} está desatualizado: rode `python -m scripts.generate_data`."
        )


# --- despesas ----------------------------------------------------------------


def test_expenses_have_every_category_for_every_month(generated: dict[str, Path]) -> None:
    rows = read_csv(generated["expenses"])
    months = gd.month_labels()

    assert len(months) == 36
    assert {row["categoria"] for row in rows} == set(gd.EXPENSE_SPECS)
    assert len(rows) == 36 * len(gd.EXPENSE_SPECS)
    for category in gd.EXPENSE_SPECS:
        assert [r["month"] for r in rows if r["categoria"] == category] == months
    assert all(float(row["valor"]) > 0 for row in rows)


def test_expenses_total_is_the_sum_of_categories(generated: dict[str, Path]) -> None:
    by_month: dict[str, float] = {}
    for row in read_csv(generated["expenses"]):
        by_month[row["month"]] = by_month.get(row["month"], 0.0) + float(row["valor"])

    for row in read_csv(generated["expenses_total"]):
        assert float(row["total"]) == pytest.approx(by_month[row["month"]], abs=0.02)


def test_expenses_have_upward_trend(generated: dict[str, Path]) -> None:
    totals = [float(r["total"]) for r in read_csv(generated["expenses_total"])]

    assert statistics.mean(totals[-12:]) > statistics.mean(totals[:12])


def test_energy_is_seasonal_with_summer_peak(generated: dict[str, Path]) -> None:
    rows = [r for r in read_csv(generated["expenses"]) if r["categoria"] == "energia"]
    february = [float(r["valor"]) for r in rows if r["month"].endswith("-02")]
    july = [float(r["valor"]) for r in rows if r["month"].endswith("-07")]

    assert statistics.mean(february) > 1.2 * statistics.mean(july)


@pytest.mark.parametrize(("month", "category", "extra", "reason"), gd.SHOCKS)
def test_shocks_stand_out_from_neighbour_months(
    generated: dict[str, Path], month: str, category: str, extra: float, reason: str
) -> None:
    values = {
        r["month"]: float(r["valor"])
        for r in read_csv(generated["expenses"])
        if r["categoria"] == category
    }
    months = gd.month_labels()
    position = months.index(month)
    neighbours = [
        value
        for label, value in values.items()
        if label != month and abs(months.index(label) - position) <= 3
    ]

    assert values[month] > 1.4 * statistics.mean(neighbours), reason


def test_number_of_shocks_is_between_two_and_three() -> None:
    assert 2 <= len(gd.SHOCKS) <= 3


def test_last_six_months_have_no_shock_effect_in_lags() -> None:
    """Teste temporal do ML-03 usa os 6 últimos meses: nenhum choque pode afetá-los."""
    months = gd.month_labels()
    last_shock = max(months.index(month) for month, *_ in gd.SHOCKS)

    assert last_shock + 3 < len(months) - 6


# --- perfis de interesse -----------------------------------------------------


def test_profiles_have_enough_residents_and_expected_columns(generated: dict[str, Path]) -> None:
    rows = read_csv(generated["resident_profiles"])

    assert len(rows) >= 200
    assert list(rows[0]) == gd.profile_columns()
    assert len({row["resident_id"] for row in rows}) == len(rows)
    for category in CATEGORIES:
        assert f"visualizacoes_{category}" in rows[0]


def test_profiles_have_cold_start_residents_with_zero_activity(
    generated: dict[str, Path],
) -> None:
    rows = read_csv(generated["resident_profiles"])
    cold = [r for r in rows if r["grupo_latente"] == gd.COLD_START_GROUP]

    assert len(cold) == gd.N_COLD_START
    for row in cold:
        assert all(int(v) == 0 for k, v in row.items() if k not in ("resident_id", "grupo_latente"))


def _normalized_views(rows: list[dict[str, str]]) -> list[list[float]]:
    matrix = []
    for row in rows:
        views = [int(row[f"visualizacoes_{c}"]) for c in CATEGORIES]
        total = sum(views)
        matrix.append([v / total for v in views])
    return matrix


def test_kmeans_finds_the_latent_groups(generated: dict[str, Path]) -> None:
    rows = [
        r for r in read_csv(generated["resident_profiles"])
        if r["grupo_latente"] != gd.COLD_START_GROUP
    ]
    matrix = _normalized_views(rows)
    labels = [r["grupo_latente"] for r in rows]

    silhouettes = {}
    for k in range(2, 8):
        model = KMeans(n_clusters=k, n_init=10, random_state=42).fit(matrix)
        silhouettes[k] = silhouette_score(matrix, model.labels_)
    best_k = max(silhouettes, key=silhouettes.__getitem__)
    recovered = KMeans(n_clusters=4, n_init=10, random_state=42).fit(matrix)

    assert len(set(labels)) == 4
    assert best_k == 4
    assert adjusted_rand_score(labels, recovered.labels_) > 0.8


# --- frases do chatbot -------------------------------------------------------


def test_intents_cover_all_intents_with_enough_examples(generated: dict[str, Path]) -> None:
    rows = read_csv(generated["intents"])
    counts = Counter(row["intent"] for row in rows)

    assert set(counts) == set(INTENTS)
    assert all(counts[intent] >= 25 for intent in INTENTS)
    assert all(row["text"].strip() for row in rows)


def test_intent_phrases_are_unique_and_never_shared_between_intents(
    generated: dict[str, Path],
) -> None:
    texts = [row["text"] for row in read_csv(generated["intents"])]

    assert len(texts) == len(set(texts))


def test_base_id_never_crosses_intents(generated: dict[str, Path]) -> None:
    intents_by_base: dict[str, set[str]] = {}
    for row in read_csv(generated["intents"]):
        intents_by_base.setdefault(row["base_id"], set()).add(row["intent"])

    assert all(len(intents) == 1 for intents in intents_by_base.values())


def test_intents_include_every_writing_variation(generated: dict[str, Path]) -> None:
    variants = Counter(row["variant"] for row in read_csv(generated["intents"]))

    assert set(variants) == {"original", *gd.VARIANT_KINDS}
    assert all(count > 20 for count in variants.values())


def test_no_accent_variant_has_no_accent(generated: dict[str, Path]) -> None:
    for row in read_csv(generated["intents"]):
        if row["variant"] == "sem_acento":
            assert row["text"] == gd.strip_accents(row["text"])


# --- chamados ----------------------------------------------------------------


def test_tickets_have_expected_schema_and_values(generated: dict[str, Path]) -> None:
    rows = read_csv(generated["tickets"])
    months = gd.month_labels()

    assert list(rows[0]) == gd.TICKET_COLUMNS
    assert [int(r["ticket_id"]) for r in rows] == list(range(1, len(rows) + 1))
    assert {r["equipamento"] for r in rows} == set(gd.TICKET_SPECS)
    assert {r["bloco"] for r in rows} == {"A", "B", "C", "D"}
    assert months[0] <= min(r["aberto_em"][:7] for r in rows)
    assert max(r["aberto_em"][:7] for r in rows) <= months[-1]
    assert max(r["aberto_em"] for r in rows) <= gd.TICKETS_END.isoformat()
    for row in rows:
        assert row["status"] in {"aberto", "em_andamento", "resolvido"}
        assert (row["horas_resolucao"] != "") == (row["status"] == "resolvido")


def test_tickets_concentrate_on_the_equipment_that_breaks_often(
    generated: dict[str, Path],
) -> None:
    rows = read_csv(generated["tickets"])
    by_equipment = Counter(r["equipamento"] for r in rows)
    elevator_by_block = Counter(r["bloco"] for r in rows if r["equipamento"] == "elevador")

    assert by_equipment.most_common(1)[0][0] == "elevador"
    assert by_equipment["elevador"] > 2 * by_equipment["bomba"]
    assert elevator_by_block.most_common(1)[0][0] == "B"


# --- funções auxiliares ------------------------------------------------------


def test_strip_accents() -> None:
    assert gd.strip_accents("você está no portão, ação") == "voce esta no portao, acao"


def test_make_informal_lowercases_abbreviates_and_drops_punctuation() -> None:
    assert gd.make_informal("Você pode abrir o chamado, por favor?") == "vc pode abrir o chamado pfv"


def test_add_typo_changes_one_word_and_is_deterministic() -> None:
    text = "quero abrir chamado do elevador"

    first = gd.add_typo(text, random.Random(1))
    second = gd.add_typo(text, random.Random(1))

    assert first == second
    assert first != text
    assert len(first.split()) == len(text.split())


def test_add_typo_leaves_short_texts_alone() -> None:
    assert gd.add_typo("oi", random.Random(1)) == "oi"
