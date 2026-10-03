"""Configuração central do ml-service."""
import logging
from pathlib import Path

APP_NAME = "ml-service"
APP_VERSION = "0.1.0"
APP_DESCRIPTION = (
    "Microsserviço de inteligência do Habita+: NLU (intenção e entidades), "
    "previsão de despesas e recomendação de produtos."
)

BASE_DIR = Path(__file__).resolve().parents[2]
ARTIFACTS_DIR = BASE_DIR / "artifacts"
DATA_DIR = BASE_DIR / "data"

def configure_logging() -> None:
    """Configura o logging do serviço."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )