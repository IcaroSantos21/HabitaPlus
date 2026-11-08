"""Recomendação de anúncios por cluster de interesse: só inferência, o treino fica em `scripts/`."""
import logging
from collections.abc import Sequence
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from sklearn.pipeline import Pipeline

from app.core.constants import NO_CLUSTER
from app.schemas.recommend import (
    Candidate,
    Recommendation,
    RecommendRequest,
    RecommendResponse,
)
from app.services.recommender_features import FEATURE_NAMES, build_interest_vector

logger = logging.getLogger(__name__)

# O score mistura o quanto o cluster gosta da categoria e a popularidade do anúncio.
CATEGORY_WEIGHT = 0.7
POPULARITY_WEIGHT = 0.3


def normalized_popularity(candidates: Sequence[Candidate]) -> list[float]:
    """Popularidade dividida pela maior entre os candidatos (0 a 1; tudo zero se ninguém tem)."""
    highest = max((c.popularidade for c in candidates), default=0)
    return [c.popularidade / highest if highest else 0.0 for c in candidates]


class KMeansRecommender:
    """Atribui o morador a um cluster do K-Means e ordena os anúncios pelas categorias fortes dele."""

    def __init__(self, pipeline: Pipeline, silhouette: float) -> None:
        self._pipeline = pipeline
        self._silhouette = silhouette
        centers: np.ndarray = pipeline.named_steps["kmeans"].cluster_centers_
        # Cada centro soma 1 (média de proporções). Dividir pelo maior deixa a categoria
        # mais forte do cluster com 1,0 e as demais relativas a ela.
        self._strength = centers / centers.max(axis=1, keepdims=True)

    @classmethod
    def from_artifact(cls, path: Path) -> "KMeansRecommender":
        """Carrega o artefato gerado por `scripts/train_recommender.py`."""
        if not path.exists():
            raise FileNotFoundError(
                f"Modelo de recomendação não encontrado em {path}. "
                "Rode `python -m scripts.train_recommender` dentro de ml-service/."
            )
        artifact: dict[str, Any] = joblib.load(path)
        if tuple(artifact["feature_names"]) != FEATURE_NAMES:
            raise ValueError(
                "O modelo salvo usa outras features que o código atual. "
                "Rode `python -m scripts.train_recommender` para gerar o artefato de novo."
            )
        logger.info(
            "Modelo de recomendação carregado: k=%d (silhouette %.3f)",
            artifact["k"], artifact["silhouette"],
        )
        return cls(artifact["pipeline"], artifact["silhouette"])

    def recommend(self, request: RecommendRequest) -> RecommendResponse:
        """Cold start devolve os mais populares; senão ordena pelo cluster do morador."""
        profile = request.profile
        vector = build_interest_vector(profile.visualizacoes, profile.anunciadas, profile.conversas)
        popularity = normalized_popularity(request.candidates)

        if not vector.any():  # sem nenhum sinal não há cluster para atribuir
            cluster = NO_CLUSTER
            scores = popularity
        else:
            cluster = int(self._pipeline.predict(vector.reshape(1, -1))[0])  # type: ignore[arg-type]
            strength = dict(zip(FEATURE_NAMES, self._strength[cluster], strict=True))
            scores = [
                CATEGORY_WEIGHT * strength[c.categoria] + POPULARITY_WEIGHT * pop
                for c, pop in zip(request.candidates, popularity, strict=True)
            ]

        # Empate no score: o menor listingId vence, para a resposta ser sempre a mesma.
        ranked = sorted(
            zip(request.candidates, scores, strict=True),
            key=lambda pair: (-pair[1], pair[0].listing_id),
        )[: request.top_n]
        return RecommendResponse(
            cluster=cluster,
            recommendations=[
                Recommendation(listing_id=c.listing_id, score=round(score, 4)) for c, score in ranked
            ],
        )
