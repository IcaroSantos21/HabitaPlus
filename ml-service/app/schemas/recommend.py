from typing import Annotated

from pydantic import Field

from app.core.constants import Category
from app.schemas.base import CamelModel

# Contagem de eventos por categoria: nunca negativa (o vetor de interesse parte de contagens).
Counts = dict[Category, Annotated[int, Field(ge=0)]]


# Agrupa dados do morador usados para calcular recomendações.
class Profile(CamelModel):
    """Interesse do morador por categoria. Vazio = cold start."""

    visualizacoes: Counts = Field(default_factory=dict)
    anunciadas: Counts = Field(default_factory=dict)
    conversas: Counts = Field(default_factory=dict)


# Descreve um anúncio que pode ser recomendado.
class Candidate(CamelModel):
    """Anúncio candidato enviado pelo back (já sem os que o morador viu ou anunciou)."""

    listing_id: int
    categoria: Category
    preco: float = Field(ge=0)
    popularidade: int = Field(ge=0)


# Reúne o perfil e os anúncios que serão avaliados.
class RecommendRequest(CamelModel):
    """Perfil do morador e anúncios candidatos."""

    resident_id: int
    profile: Profile
    candidates: list[Candidate]
    top_n: int = Field(default=5, ge=1, le=50)


# Representa um anúncio selecionado e sua pontuação.
class Recommendation(CamelModel):
    """Anúncio recomendado com score entre 0 e 1."""

    listing_id: int
    score: float


# Define o grupo identificado e a lista de recomendações da resposta.
class RecommendResponse(CamelModel):
    """Cluster do morador (-1 se não tem histórico) e anúncios recomendados."""

    cluster: int
    recommendations: list[Recommendation]