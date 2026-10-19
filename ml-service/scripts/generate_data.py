"""Gera o dataset sintético do ml-service (despesas, perfis, intenções e chamados).
"""
from __future__ import annotations

import argparse
import logging
import random
import re
import sys
import unicodedata
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.constants import CATEGORIES, INTENTS  # noqa: E402
from scripts.intent_templates import INTENT_TEMPLATES  # noqa: E402

logger = logging.getLogger(__name__)
SEED = 42
DEFAULT_OUT_DIR = ROOT / "data"
MONTHS = pd.period_range("2023-11", periods=36, freq="M")  # o modelo prevê 2026-11


def month_labels() -> list[str]:
    return [str(m) for m in MONTHS]


# --- Despesas ----------------------------------------------------------------
@dataclass(frozen=True)
class ExpenseSpec:
    """Base (R$), tendência/mês, amplitude e mês de pico da sazonalidade, ruído."""

    base: float
    trend: float
    season_amp: float
    peak_month: int
    noise_sd: float
    annual_raise: float = 0.0


EXPENSE_SPECS = {
    "agua": ExpenseSpec(3000, 0.004, 0.12, 1, 0.04),
    "energia": ExpenseSpec(4200, 0.005, 0.22, 2, 0.04),
    "limpeza": ExpenseSpec(1800, 0.003, 0.03, 1, 0.03),
    "manutencao": ExpenseSpec(2500, 0.002, 0.0, 1, 0.10),
    "salarios": ExpenseSpec(7000, 0.0, 0.0, 1, 0.008, annual_raise=0.05),
}
SHOCKS = (  # (mês, categoria, extra em R$, motivo)
    ("2024-08", "manutencao", 14000.0, "reforma da fachada"),
    ("2025-03", "agua", 2200.0, "vazamento na rede hidráulica"),
    ("2026-01", "manutencao", 9000.0, "troca da bomba e pintura da garagem"),
)


def generate_expenses() -> pd.DataFrame:
    """Colunas month, categoria, valor: tendência x sazonalidade x ruído + choques."""
    rng = np.random.default_rng(SEED + 1)
    t, month, year = np.arange(len(MONTHS)), MONTHS.month.to_numpy(), MONTHS.year.to_numpy()
    frames = []
    for category, s in EXPENSE_SPECS.items():
        season = 1 + s.season_amp * np.cos(2 * np.pi * (month - s.peak_month) / 12)
        value = (
            s.base * (1 + s.trend) ** t * season
            * (1 + s.annual_raise) ** (year - year[0])
            * (1 + rng.normal(0, s.noise_sd, len(MONTHS)))
        )
        frames.append(pd.DataFrame({"month": month_labels(), "categoria": category, "valor": value}))
    df = pd.concat(frames)
    for m, category, extra, _ in SHOCKS:
        df.loc[(df.month == m) & (df.categoria == category), "valor"] += extra
    df["valor"] = df["valor"].round(2)
    return df.sort_values(["month", "categoria"], key=lambda c: c.map(
        {k: i for i, k in enumerate(EXPENSE_SPECS)}) if c.name == "categoria" else c, kind="stable"
    ).reset_index(drop=True)


# --- Perfis de interesse -----------------------------------------------------
N_RESIDENTS, N_COLD_START, MIXED_PROB = 240, 8, 0.08
COLD_START_GROUP = "sem_historico"
GROUP_RATES = pd.DataFrame(  # taxa média de visualizações, colunas = CATEGORIES
    {
        "montando_casa": [9.0, 1.5, 6.0, 0.7, 1.0],
        "tech": [1.2, 10.0, 1.0, 1.5, 1.5],
        "ativos": [0.8, 2.0, 0.8, 9.0, 3.0],
        "diversos": [1.5, 2.0, 2.5, 1.0, 9.0],
    },
    index=list(CATEGORIES),
).T
GROUP_SHARES = {"montando_casa": 0.30, "tech": 0.25, "ativos": 0.25, "diversos": 0.20}
PROFILE_BLOCKS = {"visualizacoes": 1.0, "anunciadas": 0.12, "conversas": 0.25}  # fator da taxa


def profile_columns() -> list[str]:
    """Cabeçalho do resident_profiles.csv."""
    return ["resident_id", "grupo_latente"] + [f"{b}_{c}" for b in PROFILE_BLOCKS for c in CATEGORIES]


def generate_profiles() -> pd.DataFrame:
    """Moradores de 4 grupos latentes (+ cold start): Poisson(taxa x engajamento)."""
    rng = np.random.default_rng(SEED + 2)
    n = N_RESIDENTS - N_COLD_START
    sizes = [round(share * n) for share in list(GROUP_SHARES.values())[:-1]]
    sizes.append(n - sum(sizes))
    groups = rng.permutation(np.repeat(list(GROUP_SHARES), sizes))

    rates = GROUP_RATES.loc[groups].to_numpy()
    partners = rng.permutation(groups)  # grupo "vizinho" de cada morador
    other = GROUP_RATES.loc[partners].to_numpy()
    mixed = (rng.random(n) < MIXED_PROB) & (groups != partners)  # misto só com outro grupo
    rates = np.where(mixed[:, None], 0.6 * rates + 0.4 * other, rates)
    rates = rates * rng.lognormal(0, 0.35, n)[:, None]  # engajamento por morador

    data = {f"{b}_{c}": rng.poisson(rates[:, i] * f) for b, f in PROFILE_BLOCKS.items()
            for i, c in enumerate(CATEGORIES)}
    active = pd.DataFrame(data).assign(grupo_latente=groups)
    if (active[[f"visualizacoes_{c}" for c in CATEGORIES]].sum(axis=1) == 0).any():
        raise ValueError("Morador ativo sem nenhuma visualização: troque a SEED.")

    cold = pd.DataFrame(0, index=range(N_COLD_START), columns=list(data)).assign(grupo_latente=COLD_START_GROUP)
    df = pd.concat([active, cold]).sample(frac=1, random_state=SEED).reset_index(drop=True)
    df.insert(0, "resident_id", range(1, len(df) + 1))
    return df[profile_columns()]


# --- Frases do chatbot -------------------------------------------------------
MIN_PER_INTENT = 25
VARIANT_KINDS = ("sem_acento", "informal", "erro_digitacao")
EQUIPMENTS = {  # id -> (como se fala, artigo + nome, "de" + artigo + nome)
    "elevador": ("elevador", "o elevador", "do elevador"),
    "portao": ("portão", "o portão", "do portão"),
    "bomba": ("bomba", "a bomba", "da bomba"),
    "interfone": ("interfone", "o interfone", "do interfone"),
    "iluminacao": ("iluminação", "a iluminação", "da iluminação"),
}
SLOT_CHOICES = {
    "bloco": ["A", "B", "C", "D", "a", "b", "c", "d"],
    "unidade": ["101", "302", "405", "58", "1204", "710"],
    "quartos": ["1 quarto", "2 quartos", "3 quartos", "dois quartos", "três quartos", "um quarto"],
    "valor": ["2 mil", "R$ 2.500", "R$ 1.800", "3 mil", "R$ 900", "1500 reais"],
    "data": ["amanhã", "dia 10", "dia 15/11", "segunda-feira", "hoje", "sábado"],
    "mes": ["janeiro", "março", "setembro", "outubro", "julho"],
    "mes_futuro": ["novembro", "dezembro", "janeiro", "fevereiro"],
    "protocolo": ["1042", "337", "2201", "88"],
    "cat": ["móveis", "eletrônicos", "utensílios", "esporte", "artigos esportivos"],
}
INFORMAL = [(r"\bvocê\b", "vc"), (r"\bpara\b", "pra"), (r"\bpor favor\b", "pfv"), (r"\bnão\b", "n"),
            (r"\bestá\b", "tá"), (r"\bestão\b", "tão"), (r"\bapartamentos\b", "aptos"),
            (r"\bapartamento\b", "apto"), (r"\bquero\b", "qro"), (r"\btudo\b", "td"),
            (r"\bo que\b", "oq"), (r"\bcondomínio\b", "cond")]


def strip_accents(text: str) -> str:
    """Remove acentos e cedilha."""
    return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")


def make_informal(text: str) -> str:
    """Escrita de chat: minúsculas, abreviações e sem pontuação."""
    text = text.lower()
    for pattern, repl in INFORMAL:
        text = re.sub(pattern, repl, text)
    return re.sub(r"\s+", " ", re.sub(r"[?!.,]", "", text)).strip()


def add_typo(text: str, rng: random.Random) -> str:
    """Erro leve (troca, omissão ou repetição de letra) em uma palavra com 5+ letras."""
    words = text.split(" ")
    candidates = [i for i, w in enumerate(words) if sum(c.isalpha() for c in w) >= 5]
    if not candidates:
        return text
    i = rng.choice(candidates)
    w = words[i]
    k = rng.choice([j for j, c in enumerate(w) if c.isalpha()][1:-1])
    op = rng.choice(("swap", "drop", "double"))
    if op == "swap" and w[k + 1].isalpha():
        w = w[:k] + w[k + 1] + w[k] + w[k + 2:]
    elif op == "drop":
        w = w[:k] + w[k + 1:]
    else:
        w = w[:k + 1] + w[k] + w[k + 1:]
    words[i] = w
    return " ".join(words)


def _fill(template: str, rng: random.Random) -> str:
    equipment = rng.choice(list(EQUIPMENTS.values()))
    slots = {k: rng.choice(v) for k, v in SLOT_CHOICES.items()}
    slots.update(eq=equipment[0], art_eq=equipment[1], de_eq=equipment[2])
    return template.format_map(slots)


def generate_intents() -> pd.DataFrame:
    """Colunas text, intent, base_id, variant. Mesmo base_id = mesma frase reescrita."""
    rng = random.Random(SEED + 3)
    rows, seen = [], {}
    for intent in INTENTS:
        for index, template in enumerate(INTENT_TEMPLATES[intent]):
            for _ in range(2 if "{" in template else 1):
                original = _fill(template, rng)
                variants = {"sem_acento": strip_accents, "informal": make_informal,
                            "erro_digitacao": lambda t: add_typo(t, rng)}
                candidates = [("original", original)] + [
                    (kind, variants[kind](original)) for kind in rng.sample(VARIANT_KINDS, 2)]
                for variant, text in candidates:
                    if seen.setdefault(text, intent) != intent:
                        raise ValueError(f"Frase repetida em duas intenções: {text!r}")
                    if (text, intent) not in {(r[0], r[1]) for r in rows}:
                        rows.append((text, intent, f"{intent}-{index:02d}", variant))
    df = pd.DataFrame(rows, columns=["text", "intent", "base_id", "variant"])
    if (df.intent.value_counts() < MIN_PER_INTENT).any():
        raise ValueError(f"Alguma intenção ficou com menos de {MIN_PER_INTENT} frases.")
    return df.sample(frac=1, random_state=SEED).reset_index(drop=True)


# --- Chamados ----------------------------------------------------------------
TICKETS_END = pd.Timestamp("2026-10-31")
TICKET_COLUMNS = ["ticket_id", "aberto_em", "equipamento", "bloco", "status", "horas_resolucao"]
# equipamento: (chamados/mês, desgaste/mês, amp. sazonal, mês do pico, mediana h, share A,B,C,D)
TICKET_SPECS = {
    "elevador": (6.0, 0.012, 0.0, 1, 48, (0.22, 0.38, 0.18, 0.22)),
    "portao": (3.0, 0.004, 0.0, 1, 24, (0.25, 0.25, 0.25, 0.25)),
    "bomba": (1.8, 0.006, 0.35, 1, 36, (0.30, 0.20, 0.30, 0.20)),
    "interfone": (2.4, 0.002, 0.0, 1, 12, (0.20, 0.20, 0.30, 0.30)),
    "iluminacao": (3.5, 0.003, 0.30, 7, 18, (0.25, 0.25, 0.25, 0.25)),
}


def generate_tickets() -> pd.DataFrame:
    """Chamados ~ Poisson(taxa x bloco x sazonalidade x desgaste): elevador do bloco B lidera."""
    rng = np.random.default_rng(SEED + 4)
    t, month = np.arange(len(MONTHS)), MONTHS.month.to_numpy()
    parts = []
    for equipment, (monthly, aging, amp, peak, median, shares) in TICKET_SPECS.items():
        season = 1 + amp * np.cos(2 * np.pi * (month - peak) / 12)
        for block, share in zip("ABCD", shares, strict=True):
            counts = rng.poisson(monthly * share * season * (1 + aging) ** t)
            idx = np.repeat(np.arange(len(MONTHS)), counts)
            days = rng.integers(1, MONTHS.days_in_month.to_numpy()[idx] + 1)
            parts.append(pd.DataFrame({
                "aberto_em": [
                    MONTHS[int(i)].to_timestamp() + pd.Timedelta(days=int(d) - 1)
                    for i, d in zip(idx, days)
                ],
                "equipamento": equipment,
                "bloco": block,
                "horas_resolucao": np.maximum(
                    1.0,
                    rng.lognormal(np.log(median), 0.6, len(idx)).round(1),
                ),
            }))
    df = pd.concat(parts).sort_values(["aberto_em", "equipamento", "bloco", "horas_resolucao"], kind="stable")
    df = df.reset_index(drop=True)
    recent = df.aberto_em > TICKETS_END - pd.Timedelta(days=7)  # só os recentes podem estar abertos
    df["status"] = "resolvido"
    df.loc[recent, "status"] = rng.choice(["resolvido", "em_andamento", "aberto"], recent.sum(), p=[0.40, 0.35, 0.25])
    df.loc[df.status != "resolvido", "horas_resolucao"] = np.nan
    df["aberto_em"] = df.aberto_em.dt.strftime("%Y-%m-%d")
    df.insert(0, "ticket_id", range(1, len(df) + 1))
    return df[TICKET_COLUMNS]


# --- Escrita -----------------------------------------------------------------
def generate_all(out_dir: Path = DEFAULT_OUT_DIR) -> dict[str, Path]:
    """Gera todos os CSVs em ``out_dir`` e devolve nome -> caminho."""
    out_dir.mkdir(parents=True, exist_ok=True)
    expenses = generate_expenses()
    total = expenses.groupby("month", sort=True)["valor"].sum().round(2).reset_index(name="total")
    tables = {
        "expenses": expenses, "expenses_total": total, "resident_profiles": generate_profiles(),
        "intents": generate_intents(), "tickets": generate_tickets(),
    }
    paths = {name: out_dir / f"{name}.csv" for name in tables}
    for name, df in tables.items():
        df.to_csv(paths[name], index=False, lineterminator="\n", encoding="utf-8",
                  float_format="%.1f" if name == "tickets" else "%.2f")
    return paths


def main(argv: list[str] | None = None) -> None:
    """Ponto de entrada da linha de comando."""
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    parser = argparse.ArgumentParser(description="Gera o dataset sintético do ml-service.")
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT_DIR)
    for name, path in generate_all(parser.parse_args(argv).out_dir).items():
        logger.info("%s -> %s", name, path)


if __name__ == "__main__":
    main()
