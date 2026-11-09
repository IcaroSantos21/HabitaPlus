
"""Serviço de recomendação de anúncios usando K-Means."""

from pathlib import Path
from typing import Any

import joblib
import numpy as np
from sklearn.pipeline import Pipeline

from app.core.constants import NO_CLUSTER
from app.schemas.recommend import (
    RecommendRequest,
    RecommendResponse,
    Recommendation,
)
from app.services.recommender_features import (
    FEATURE_NAMES,
    build_interest_vector,
)


def normalized_popularity(candidates) -> list[float]:
    """Normaliza a popularidade dos anúncios entre zero e um."""

    if not candidates:
        return []

    max_popularity = max(
        (candidate.popularidade for candidate in candidates),
        default=0,
    )

    if max_popularity == 0:
        return [0.0 for _ in candidates]

    return [
        candidate.popularidade / max_popularity
        for candidate in candidates
    ]


class KMeansRecommender:
    """Recomenda anúncios com base no cluster de interesse do morador."""

    def __init__(
        self,
        pipeline: Pipeline,
        silhouette: float = 0.0,
    ) -> None:
        self.pipeline = pipeline
        self.silhouette = silhouette

        self.kmeans = pipeline.named_steps["kmeans"]
        self.centroids = self.kmeans.cluster_centers_

        self.category_indexes = {
            category: index
            for index, category in enumerate(FEATURE_NAMES)
        }

    @classmethod
    def from_artifact(cls, model_path: Path) -> "KMeansRecommender":
        """Carrega o modelo treinado a partir do arquivo joblib."""

        if not model_path.exists():
            raise FileNotFoundError(
                f"Modelo de recomendação não encontrado em {model_path}. "
                "Execute: python -m scripts.train_recommender"
            )

        artifact: dict[str, Any] = joblib.load(model_path)

        if artifact.get("feature_names") != list(FEATURE_NAMES):
            raise ValueError(
                "As características do modelo são incompatíveis "
                "com a implementação atual."
            )

        pipeline = artifact["pipeline"]

        return cls(
            pipeline=pipeline,
            silhouette=float(artifact["silhouette"]),
        )

    def recommend(
        self,
        request: RecommendRequest,
    ) -> RecommendResponse:
        """Classifica o morador e ordena os anúncios por relevância."""

        profile = request.profile

        interest_vector = build_interest_vector(
            profile.visualizacoes,
            profile.anunciadas,
            profile.conversas,
        )

        # Morador sem histórico: recomenda os anúncios mais populares.
        if interest_vector.sum() == 0:
            return self._recommend_cold_start(request)

        # Identifica o cluster ao qual o morador pertence.
        cluster = int(
            self.pipeline.predict(
                interest_vector.reshape(1, -1)
            )[0]
        )

        # Recupera as proporções de interesse do cluster.
        centroid = self.centroids[cluster]

        popularities = normalized_popularity(request.candidates)

        scored_candidates = []

        for candidate, popularity in zip(
            request.candidates,
            popularities,
            strict=True,
        ):
            category_index = self.category_indexes[candidate.categoria]

            category_score = float(centroid[category_index])

            # O interesse do cluster tem maior peso que a popularidade.
            score = (
                category_score * 0.80
                + popularity * 0.20
            )

            scored_candidates.append(
                Recommendation(
                    listing_id=candidate.listing_id,
                    score=round(score, 4),
                )
            )

        scored_candidates.sort(
            key=lambda recommendation: (
                -recommendation.score,
                recommendation.listing_id,
            )
        )

        return RecommendResponse(
            cluster=cluster,
            recommendations=scored_candidates[:request.top_n],
        )

    def _recommend_cold_start(
        self,
        request: RecommendRequest,
    ) -> RecommendResponse:
        """Recomenda os anúncios populares para moradores sem histórico."""

        popularities = normalized_popularity(request.candidates)

        scored_candidates = [
            Recommendation(
                listing_id=candidate.listing_id,
                score=round(popularity, 4),
            )
            for candidate, popularity in zip(
                request.candidates,
                popularities,
                strict=True,
            )
        ]

        scored_candidates.sort(
            key=lambda recommendation: (
                -recommendation.score,
                recommendation.listing_id,
            )
        )

        return RecommendResponse(
            cluster=NO_CLUSTER,
            recommendations=scored_candidates[:request.top_n],
        )
