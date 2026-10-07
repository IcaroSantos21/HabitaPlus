from pydantic import Field

from app.core.constants import Category
from app.schemas.base import CamelModel


# Agrupa dados do morador usados para calcular recomendações.
class Profile(CamelModel):
    """Interesse do morador por categoria. Vazio = cold start."""

    visualizacoes: dict[Category, int] = Field(default_factory=dict)
    anunciadas: dict[Category, int] = Field(default_factory=dict)
    conversas: dict[Category, int] = Field(default_factory=dict)


# Descreve um anúncio que pode ser recomendado.
class Candidate(CamelModel):
    """Anúncio candidato enviado pelo back."""

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
    """Anúncio recomendado com score."""

    listing_id: int
    score: float


# Define o grupo identificado e a lista de recomendações da resposta.
class RecommendResponse(CamelModel):
    """Cluster do morador e anúncios recomendados."""

    cluster: int
    recommendations: list[Recommendation]