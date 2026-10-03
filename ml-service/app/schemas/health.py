from typing import Literal

from app.schemas.base import CamelModel


class HealthResponse(CamelModel):
    """Resposta do healthcheck."""

    status: Literal["ok"]
    service: str
    version: str