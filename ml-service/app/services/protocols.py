"""Abstrações dos services. Routers dependem destes contratos, não das implementações."""
from dataclasses import dataclass
from typing import Protocol

from app.core.constants import Intent
from app.schemas.nlu import Entities, NluResponse
from app.schemas.predict import ExpensesRequest, ExpensesResponse
from app.schemas.recommend import RecommendRequest, RecommendResponse


# Resultado da classificação: a intenção já com a regra de confiança mínima aplicada.
@dataclass(frozen=True)
class IntentPrediction:
    """Intenção e confiança (probabilidade da classe mais provável)."""

    intent: Intent
    confidence: float


# Contrato de quem só classifica a intenção.
class IntentClassifier(Protocol):
    """Classifica a intenção do texto."""

    def predict(self, text: str) -> IntentPrediction: ...


# Contrato de quem só extrai entidades.
class EntityExtractor(Protocol):
    """Extrai as entidades (slots) do texto."""

    def extract(self, text: str) -> Entities: ...


# Contrato que qualquer serviço de interpretação de texto deve seguir.
class NluService(Protocol):
    """Interpreta o texto do morador."""

    def parse(self, text: str) -> NluResponse: ...


# Contrato que qualquer serviço de previsão de despesas deve seguir.
class ExpensePredictor(Protocol):
    """Prevê as despesas do próximo mês."""

    def predict(self, request: ExpensesRequest) -> ExpensesResponse: ...


# Contrato que qualquer serviço de recomendação deve seguir.
class Recommender(Protocol):
    """Recomenda anúncios do marketplace."""

    def recommend(self, request: RecommendRequest) -> RecommendResponse: ...