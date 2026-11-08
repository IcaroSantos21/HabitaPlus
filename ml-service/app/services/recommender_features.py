"""Vetor de interesse do morador, compartilhado pelo treino e pela inferência."""
from collections.abc import Mapping
from typing import Any

import numpy as np

from app.core.constants import CATEGORIES

# Ordem fixa das colunas: o modelo treinado depende dela (é a ordem de CATEGORIES).
FEATURE_NAMES: tuple[str, ...] = CATEGORIES

# Peso de cada tipo de sinal. Conversar com um vendedor mostra mais intenção do que ver um anúncio.
# São premissas definidas antes de olhar os dados (não há dado real para ajustar) e ficam em docs/ml-report.md.
VIEW_WEIGHT = 1.0
LISTED_WEIGHT = 2.0
CHAT_WEIGHT = 3.0

# A chave é `Any` porque `Mapping` é invariante na chave: aceita tanto o `dict[Category, int]`
# do schema quanto o `dict[str, int]` montado a partir do CSV no treino.
Counts = Mapping[Any, int]


def build_interest_vector(views: Counts, listed: Counts, chats: Counts) -> np.ndarray:
    """Soma ponderada dos três sinais por categoria (contagem bruta, ainda sem normalizar).

    A normalização em proporção (soma 1) fica no `Pipeline` do modelo, para treino e inferência
    passarem exatamente pela mesma conta. Vetor só de zeros = morador sem histórico.
    """
    return np.array(
        [
            VIEW_WEIGHT * views.get(category, 0)
            + LISTED_WEIGHT * listed.get(category, 0)
            + CHAT_WEIGHT * chats.get(category, 0)
            for category in FEATURE_NAMES
        ],
        dtype=float,
    )