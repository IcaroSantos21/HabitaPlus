"""Constantes do domínio compartilhadas entre schemas e serviços."""
from typing import Literal, get_args

Intent = Literal[
    "saudacao",
    "consultar_apartamentos",
    "abrir_chamado",
    "status_chamado",
    "segunda_via_boleto",
    "status_financeiro",
    "previsao_despesas",
    "recomendar_produtos",
    "regras_condominio",
    "fora_de_escopo",
]

Category = Literal["moveis", "eletronicos", "utensilios", "esporte", "outros"]

INTENTS: tuple[str, ...] = get_args(Intent)
CATEGORIES: tuple[str, ...] = get_args(Category)

MIN_HISTORY_MONTHS = 3
CONFIDENCE_THRESHOLD = 0.5

