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
    configure_logging,
)
from app.routers import health, nlu, predict, recommend

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Ciclo de vida: aqui os modelos treinados serão carregados uma única vez."""
    configure_logging()
    logger.info(
        "Iniciando %s v%s em modo stub (artefatos em %s)",
        APP_NAME,
        APP_VERSION,
        ARTIFACTS_DIR,
    )
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