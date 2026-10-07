"""Constantes do domínio compartilhadas entre schemas e serviços."""
from typing import Literal, get_args

# Lista as intenções que o serviço de linguagem pode reconhecer.
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

# Lista as categorias de anúncios aceitas pelo serviço.
Category = Literal["moveis", "eletronicos", "utensilios", "esporte", "outros"]

# Expõe as opções Literals em tuplas para uso em tempo de execução.
INTENTS: tuple[str, ...] = get_args(Intent)
CATEGORIES: tuple[str, ...] = get_args(Category)

# Define regras mínimas usadas pela previsão e pela classificação.
MIN_HISTORY_MONTHS = 3
CONFIDENCE_THRESHOLD = 0.5
