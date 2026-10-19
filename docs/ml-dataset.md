# Dataset sintético do ml-service

Não existem dados reais de condomínio, então tudo que o ml-service treina vem de `ml-service/scripts/generate_data.py`. Este documento registra as premissas: se uma premissa mudar, o relatório (`docs/ml-report.md`) precisa citar isso.

## Como gerar

```bash
cd ml-service
python -m scripts.generate_data          # grava em ml-service/data/
python -m scripts.generate_data --out-dir /tmp/x   # grava em outra pasta
```

- numpy (`default_rng`) e pandas, ambos já no `requirements.txt` com versão fixa: a saída é idêntica enquanto as versões forem as mesmas. As frases-modelo ficam em `scripts/intent_templates.py`.
- `SEED = 42`. Cada dataset usa o seu próprio gerador (`SEED + 1` a `SEED + 4`), então alterar um não muda os outros.
- Rodar duas vezes gera arquivos idênticos byte a byte. `tests/test_generate_data.py` confere isso e também confere que os CSVs versionados são os que o script gera hoje (se alguém editar o script e esquecer de regerar, o CI falha).
- CSVs em UTF-8, quebra de linha `\n`, números com ponto decimal.

## Arquivos

| Arquivo | Linhas | Quem usa |
|---|---|---|
| `expenses.csv` | 180 (36 meses x 5 categorias) | ML-03 |
| `expenses_total.csv` | 36 | ML-03 (mesmo formato do histórico de `POST /predict/expenses`) |
| `resident_profiles.csv` | 240 | ML-05 |
| `intents.csv` | 907 | ML-04 |
| `tickets.csv` | 659 | ML-06 e seed do back (BE-18) |

Valores de categoria são ids ASCII em `snake_case` (`agua`, `portao`, `iluminacao`), no mesmo estilo de `moveis` e `consultar_apartamentos` do contrato.

## Despesas (`expenses.csv`, `expenses_total.csv`)

Colunas: `month` (AAAA-MM), `categoria`, `valor` (R$). O total é `month,total`.

Período: 2023-11 a 2026-10 (36 meses). O modelo prevê 2026-11, o mês seguinte ao último.

Cada valor é `base x (1 + tendência)^t x sazonalidade x reajuste x (1 + ruído) + choque`.

| Categoria | Base (R$) | Tendência/mês | Sazonalidade | Ruído (desvio) |
|---|---|---|---|---|
| água | 3.000 | +0,4% | 12%, pico em janeiro | 4% |
| energia | 4.200 | +0,5% | 22%, pico em fevereiro | 4% |
| limpeza | 1.800 | +0,3% | 3%, pico em janeiro | 3% |
| manutenção | 2.500 | +0,2% | nenhuma | 10% |
| salários | 7.000 | 0 | nenhuma | 0,8%, reajuste de 5% a cada janeiro |

Sazonalidade é uma cossenoide anual (verão mais caro para água e energia). O total mensal fica entre R$ 17,9 mil e R$ 31,9 mil, a média do último ano é cerca de 7% maior que a do primeiro e a ordem de grandeza bate com o exemplo do contrato (R$ 18.250 a R$ 19.110).

### Choques pontuais (3)

| Mês | Categoria | Extra (R$) | Motivo |
|---|---|---|---|
| 2024-08 | manutenção | 14.000 | reforma da fachada |
| 2025-03 | água | 2.200 | vazamento na rede hidráulica |
| 2026-01 | manutenção | 9.000 | troca da bomba e pintura da garagem |

Os choques não são marcados no CSV (a API real também não receberia essa marca). Ficam documentados aqui e em `SHOCKS`, no script.

**Para o ML-03:** o último choque (2026-01) afeta os lags até 2026-04. Como o split temporal usa os 6 últimos meses (2026-05 a 2026-10) como teste, nenhum choque contamina o teste nem os lags dele. Um teste garante isso se alguém mudar as datas.

### O que ficou de fora

- 13º salário (novembro e dezembro): deixei de fora para não criar um pico forte justamente no mês que o modelo prevê, com apenas dois exemplos no histórico. É uma limitação real do mundo que o dataset não reproduz.
- Inflação por categoria e reajuste de tarifa: a tendência linear composta representa os dois de forma agregada.

## Perfis de interesse (`resident_profiles.csv`)

Colunas: `resident_id`, `grupo_latente`, e três blocos de 5 colunas na ordem de `CATEGORIES`: `visualizacoes_*`, `anunciadas_*`, `conversas_*` (os três campos de `profile` em `POST /recommend`).

**`grupo_latente` existe só para validar o K-Means. Não use como feature.**

240 moradores: 232 com atividade, divididos em 4 grupos latentes, mais 8 sem histórico (cold start, todas as contagens zero, `grupo_latente = sem_historico`). Retire os 8 do treino do K-Means (vetor zero não normaliza); eles servem para testar o caminho "perfil vazio devolve os mais populares".

| Grupo | Moradores | Taxa média de visualizações (moveis, eletronicos, utensilios, esporte, outros) |
|---|---|---|
| `montando_casa` | 70 | 9,0 / 1,5 / 6,0 / 0,7 / 1,0 |
| `tech` | 58 | 1,2 / 10,0 / 1,0 / 1,5 / 1,5 |
| `ativos` | 58 | 0,8 / 2,0 / 0,8 / 9,0 / 3,0 |
| `diversos` | 46 | 1,5 / 2,0 / 2,5 / 1,0 / 9,0 |

- Cada contagem é Poisson(taxa x engajamento). O engajamento é lognormal por morador (sigma 0,35): moradores do mesmo grupo viram quantidades bem diferentes, e é por isso que o vetor precisa ser normalizado (proporção por categoria) antes do K-Means.
- 8% dos moradores têm perfil misto (60% do grupo, 40% de outro grupo), para o agrupamento não ser perfeito.
- `anunciadas` e `conversas` usam as mesmas taxas multiplicadas por 0,12 e 0,25.

## Frases do chatbot (`intents.csv`)

Colunas: `text`, `intent`, `base_id`, `variant`. Linhas embaralhadas com seed fixa.

| Intenção | Linhas | Templates (`base_id`) |
|---|---|---|
| `abrir_chamado` | 113 | 25 |
| `consultar_apartamentos` | 119 | 31 |
| `fora_de_escopo` | 134 | 52 |
| `previsao_despesas` | 76 | 24 |
| `recomendar_produtos` | 72 | 24 |
| `regras_condominio` | 67 | 24 |
| `saudacao` | 59 | 29 |
| `segunda_via_boleto` | 66 | 24 |
| `status_chamado` | 99 | 24 |
| `status_financeiro` | 102 | 32 |

Como foi montado: cada intenção tem 24 a 52 frases-modelo escritas à mão, algumas com campos (`{bloco}`, `{quartos}`, `{valor}`, `{unidade}`, equipamentos, `{data}`...) preenchidos por sorteio, de modo que as entidades do ML-02 aparecem em formas variadas ("bloco b", "apto 302", "R$ 2.500", "dois quartos"). Cada preenchimento gera a frase original mais 2 variações sorteadas entre:

- `sem_acento`: remove acentos ("voce esta no portao");
- `informal`: minúsculas, abreviações de chat ("vc", "pra", "apto", "pfv", "qro") e sem pontuação;
- `erro_digitacao`: troca, omissão ou repetição de uma letra em uma palavra com 5+ letras.

Frases repetidas são descartadas, e o script falha se o mesmo texto aparecer em duas intenções ou se alguma intenção ficar com menos de 25 frases.

### Atenção para o ML-04: vazamento entre treino e teste

As linhas de um mesmo `base_id` são a mesma frase escrita de jeitos diferentes. **Um split aleatório simples coloca a original no treino e a variação no teste.** Nas minhas medições isso dá F1 macro de ~0,98, número que não vale nada. Divida por grupo (`GroupShuffleSplit`/`GroupKFold` com `groups=base_id`), o que cumpre a regra "nunca avaliar em frases que estavam no treino".

`fora_de_escopo` inclui "negativos difíceis" que compartilham palavras com intenções reais ("qual a previsão do tempo", "me recomenda um livro", "quero abrir uma conta no banco"). Alguns templates são ambíguos de propósito (ex.: "vai ter rateio extra no mês que vem?") e vão gerar confusão entre `previsao_despesas` e `status_financeiro`. Isso é esperado.

### Texto em minúsculas e sem acento

O ML-04 deve aplicar o mesmo pré-processamento do contrato (minúsculas, sem acento) antes de vetorizar. A variação `sem_acento` só tem valor se isso acontecer depois, no pipeline.

## Chamados (`tickets.csv`)

Colunas: `ticket_id`, `aberto_em` (AAAA-MM-DD), `equipamento`, `bloco`, `status`, `horas_resolucao` (vazio se não resolvido).

Mesmo período das despesas (2023-11-01 a 2026-10-31). O número de chamados por mês, equipamento e bloco é Poisson(`taxa-base x participação do bloco x sazonalidade x (1 + desgaste)^t`).

| Equipamento | Chamados/mês no início | Desgaste/mês | Sazonalidade | Mediana de resolução |
|---|---|---|---|---|
| elevador | 6,0 | +1,2% | nenhuma | 48 h |
| iluminação | 3,5 | +0,3% | 30%, pico em julho | 18 h |
| portão | 3,0 | +0,4% | nenhuma | 24 h |
| interfone | 2,4 | +0,2% | nenhuma | 12 h |
| bomba | 1,8 | +0,6% | 35%, pico em janeiro | 36 h |

- O elevador é o campeão de falhas (267 dos 659 chamados) e o bloco B concentra cerca de 38% deles; os outros equipamentos têm distribuição por bloco mais uniforme.
- Tempo de resolução: lognormal (sigma 0,6), mínimo de 1 h.
- Só os chamados dos últimos 7 dias podem estar `aberto` ou `em_andamento` (40% resolvidos, 35% em andamento, 25% abertos); o resto está `resolvido`.
- Não há coluna de unidade nem de descrição. Se o seed do back (BE-18) precisar delas, é preferível gerá-las lá do que ampliar este CSV sem necessidade.
- Os chamados não se relacionam com as despesas de manutenção (os dois são independentes).

## Limitações

- Tudo é sintético: as métricas do relatório mostram que o pipeline funciona, não que o modelo funcionaria em um condomínio real. O relatório precisa dizer isso.
- Com 36 meses, o `RandomForestRegressor` tem poucas linhas para treinar (cerca de 27 após os lags). Não é erro do dataset; é o que a issue pede.
- As frases foram escritas por uma pessoa/IA, não por moradores. A cobertura de gírias e erros reais é menor do que a de um chat de verdade.
- O ruído dos totais é independente entre categorias. Num condomínio real, meses de obra elevam manutenção e energia juntas.

## Como evoluir

1. Mudou uma premissa? Edite as constantes no topo do script, rode `python -m scripts.generate_data` e commite os CSVs junto.
2. Quer mais frases? Acrescente templates em `scripts/intent_templates.py`. As frases novas mudam a ordem do embaralhamento e, por consequência, o `intents.csv` inteiro; isso é esperado.
3. Quando existirem dados reais, troque os CSVs mantendo as colunas; os scripts de treino não precisam mudar.
