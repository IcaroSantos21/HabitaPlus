from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> Iterator[TestClient]:
    """Cliente de teste com o lifespan ativo."""
    # Mantém a aplicação aberta durante cada teste que usa este fixture.
    with TestClient(app) as test_client:
        yield test_client