from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> Iterator[TestClient]:
    """Cliente de teste com o lifespan ativo."""
    with TestClient(app) as test_client:
        yield test_client