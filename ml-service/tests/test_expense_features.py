import numpy as np
import pandas as pd
import pytest

from app.services.expense_features import (
    FEATURE_NAMES,
    LAG_1_INDEX,
    N_LAGS,
    build_feature_row,
    build_training_set,
)


def period(label: str) -> pd.Period:
    return pd.Period(label, freq="M")


def test_feature_row_has_lags_in_order_and_moving_average() -> None:
    row = build_feature_row(period("2026-11"), [100.0, 200.0, 300.0, 400.0])

    values = dict(zip(FEATURE_NAMES, row, strict=True))
    assert values["lag_1"] == 400.0  # mês imediatamente anterior
    assert values["lag_2"] == 300.0
    assert values["lag_3"] == 200.0  # o 100.0 fica fora da janela
    assert values["moving_average_3"] == pytest.approx(300.0)


def test_month_encoding_is_cyclic_december_is_next_to_january() -> None:
    december = build_feature_row(period("2026-12"), [1.0, 1.0, 1.0])
    january = build_feature_row(period("2027-01"), [1.0, 1.0, 1.0])
    june = build_feature_row(period("2026-06"), [1.0, 1.0, 1.0])

    def distance(a: np.ndarray, b: np.ndarray) -> float:
        return float(np.hypot(a[0] - b[0], a[1] - b[1]))

    assert distance(december, january) < distance(january, june)
    assert december[0] == pytest.approx(0.0, abs=1e-9)  # sen(2π) = 0
    assert december[1] == pytest.approx(1.0)  # cos(2π) = 1


def test_feature_row_requires_enough_history() -> None:
    with pytest.raises(ValueError, match="pelo menos 3 meses"):
        build_feature_row(period("2026-11"), [1.0, 2.0])


def test_training_set_target_is_never_part_of_its_own_features() -> None:
    months = [period(f"2025-{m:02d}") for m in range(1, 9)]
    totals = [float(v) for v in range(10, 18)]

    X, y, targets = build_training_set(months, totals)

    assert X.shape == (len(totals) - N_LAGS, len(FEATURE_NAMES))
    assert targets[0] == period("2025-04")
    assert y[0] == totals[3]
    assert X[0, LAG_1_INDEX] == totals[2]  # lag_1 da primeira linha é o mês anterior ao alvo
    for row, target in zip(X, y, strict=True):
        assert target not in row[2:5]  # séries crescentes: o alvo não aparece nos lags


def test_training_set_rejects_gaps_in_the_series() -> None:
    months = [period(m) for m in ("2025-01", "2025-02", "2025-04", "2025-05", "2025-06")]

    with pytest.raises(ValueError, match="consecutivos"):
        build_training_set(months, [1.0] * 5)