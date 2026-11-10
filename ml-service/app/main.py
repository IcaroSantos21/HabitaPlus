"""Ponto de entrada do ml-service."""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import (
    APP_DESCRIPTION,
    APP_NAME,
    APP_VERSION,
    ARTIFACTS_DIR,
    EXPENSE_MODEL_PATH,
    INTENT_MODEL_PATH,
    RECOMMENDER_MODEL_PATH,
    configure_logging,
)
from app.routers import health, nlu, predict, recommend, maintenance
from app.services.entity_extractor import RegexEntityExtractor
from app.services.expense_predictor import SklearnExpensePredictor
from app.services.intent_classifier import SklearnIntentClassifier
from app.services.maintenance_analyzer import MaintenanceAnalyzer
from app.services.nlu_parser import NluParser
from app.services.recommender import KMeansRecommender

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Carrega os modelos e serviços uma única vez na inicialização."""
    configure_logging()

    logger.info(
        "Iniciando %s v%s (artefatos em %s)",
        APP_NAME,
        APP_VERSION,
        ARTIFACTS_DIR,
    )

    app.state.nlu = NluParser(
        classifier=SklearnIntentClassifier.from_artifact(INTENT_MODEL_PATH),
        extractor=RegexEntityExtractor(),
    )

    app.state.expense_predictor = SklearnExpensePredictor.from_artifact(
        EXPENSE_MODEL_PATH
    )

    app.state.recommender = KMeansRecommender.from_artifact(
        RECOMMENDER_MODEL_PATH
    )

    app.state.maintenance_analyzer = MaintenanceAnalyzer()

    yield

    logger.info("Encerrando %s", APP_NAME)


def create_app() -> FastAPI:
    """Cria e configura a aplicação FastAPI."""
    app = FastAPI(
        title="Habita+ ML Service",
        description=APP_DESCRIPTION,
        version=APP_VERSION,
        lifespan=lifespan,
    )

    app.include_router(health.router)
    app.include_router(nlu.router)
    app.include_router(predict.router)
    app.include_router(recommend.router)
    app.include_router(maintenance.router)

    return app


app = create_app()
