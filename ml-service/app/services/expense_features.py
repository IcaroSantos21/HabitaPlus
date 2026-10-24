"""Features da previsão de despesas, compartilhadas pelo treino e pela inferência."""
from collections.abc import Sequence

import numpy as np
import pandas as pd

# Quantos meses anteriores viram lag (1 = mês anterior). A média móvel usa a mesma janela.
N_LAGS = 3

# Ordem fixa das colunas: o modelo treinado depende dela.
FEATURE_NAMES: tuple[str, ...] = (
    "month_sin", "month_cos", "lag_1", "lag_2", "lag_3", "moving_average_3",
)
LAG_1_INDEX = FEATURE_NAMES.index("lag_1")


def build_feature_row(target_month: pd.Period, previous_totals: Sequence[float]) -> np.ndarray:
    """Monta as features do mês a prever a partir dos totais anteriores (do mais antigo ao mais novo)."""
    if len(previous_totals) < N_LAGS:
        raise ValueError(f"São necessários pelo menos {N_LAGS} meses anteriores.")
    recent = np.asarray(previous_totals[-N_LAGS:], dtype=float)
    lag_1, lag_2, lag_3 = recent[::-1]
    # Mês como ponto num círculo: dezembro (12) fica ao lado de janeiro (1).
    angle = 2 * np.pi * target_month.month / 12
    return np.array([np.sin(angle), np.cos(angle), lag_1, lag_2, lag_3, recent.mean()])


def build_training_set(
    months: Sequence[pd.Period], totals: Sequence[float]
) -> tuple[np.ndarray, np.ndarray, list[pd.Period]]:
    """Transforma a série em (X, y, mês-alvo). As N_LAGS primeiras linhas só servem de lag."""
    if len(months) != len(totals):
        raise ValueError("months e totals precisam ter o mesmo tamanho.")
    if any(b.ordinal - a.ordinal != 1 for a, b in zip(months, months[1:], strict=False)):
        raise ValueError("A série precisa ter meses consecutivos, sem lacunas.")
    if len(totals) <= N_LAGS:
        raise ValueError(f"A série precisa de mais de {N_LAGS} meses.")
    rows = [build_feature_row(months[i], totals[:i]) for i in range(N_LAGS, len(totals))]
    return np.vstack(rows), np.asarray(totals[N_LAGS:], dtype=float), list(months[N_LAGS:])