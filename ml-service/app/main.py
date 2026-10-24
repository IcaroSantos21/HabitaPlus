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
    configure_logging,
)
from app.routers import health, nlu, predict, recommend
from app.services.expense_predictor import SklearnExpensePredictor

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Ciclo de vida: carrega os modelos treinados uma única vez, na subida."""
    configure_logging()
    logger.info(
        "Iniciando %s v%s (artefatos em %s; NLU e recomendação ainda em stub)",
        APP_NAME,
        APP_VERSION,
        ARTIFACTS_DIR,
    )
    # Falha na subida se o artefato não existir: melhor que errar a cada requisição.
    app.state.expense_predictor = SklearnExpensePredictor.from_artifact(EXPENSE_MODEL_PATH)
    yield
    logger.info("Encerrando %s", APP_NAME)


def create_app() -> FastAPI:
    """Cria e configura a aplicação FastAPI."""
    # Registra os dados de identificação, o ciclo de vida e as rotas da API.
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
    return app


# Cria a aplicação que será iniciada pelo servidor ASGI.
app = create_app()