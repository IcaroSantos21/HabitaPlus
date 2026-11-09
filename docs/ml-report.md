# Relatório de Machine Learning do ml-service

Todos os números vêm de dados **sintéticos** (ver `docs/ml-dataset.md`). Eles mostram que o pipeline funciona, não que o modelo funcionaria em um condomínio real.

## ML-03: previsão de despesas (`POST /predict/expenses`)

Código: `ml-service/scripts/train_expenses.py` (treino), `ml-service/app/services/expense_features.py` (features) e `ml-service/app/services/expense_predictor.py` (inferência).

### Método

- **Dados:** `expenses_total.csv`, 36 meses (2023-11 a 2026-10). As 3 primeiras linhas só servem de lag, sobram 33 exemplos.
- **Features:** mês-alvo como seno/cosseno, lags de 1 a 3 meses e média móvel de 3 meses.
- **Split temporal, sem embaralhar:** treino = 27 meses (2024-02 a 2026-04); teste = 6 meses (2026-05 a 2026-10). Nenhum choque do dataset afeta o teste nem os lags dele.
- **Pipeline:** `StandardScaler` + modelo; o scaler é ajustado só no treino.
- **Escolha do modelo:** validação de origem móvel *dentro do treino* (12 previsões de 1 mês à frente, retreinando a cada passo). O teste só mede o modelo já escolhido.
- **Candidatos:** baseline (repetir o último mês), `Ridge` (alpha em 1, 10 ou 100, escolhido na validação) e `RandomForestRegressor` (200 árvores, profundidade 4, `random_state=42`).

### Resultados no teste temporal (2026-05 a 2026-10)

| Modelo | MAE (R$) | RMSE (R$) | MAPE (%) | MAE na validação (R$) |
|---|---|---|---|---|
| baseline (último mês) | 699,14 | 779,41 | 3,45 | 2.205,18 |
| ridge (alpha=100) | 548,92 | 683,02 | 2,77 | 2.013,20 |
| **random_forest (escolhido)** | **692,16** | **772,41** | **3,42** | **1.453,16** |

![Real x previsto](img/ml-expenses-real-vs-predicted.png)

O modelo escolhido pela validação (`random_forest`) supera o baseline no MAE de teste, **mas por pouco (R$ 6,98, cerca de 1%)**. Com 6 pontos de teste, essa diferença não é estatisticamente confiável.

### Por que o Ridge não foi o escolhido, apesar do MAE de teste menor

- A validação (27 meses de treino) inclui os choques de 2024-08 e 2025-03 e os meses seguintes, em que o lag 1 fica inflado. Modelos lineares e o baseline sofrem nesses meses; a floresta, que limita a saída aos valores vistos no treino, sofre menos. Por isso ela vence a validação.
- No teste não há choque. O Ridge com alpha alto (100) fica quase constante (ver gráfico) e acerta bem uma série que oscila pouco ao redor da média. É um resultado plausível, mas de 6 pontos.
- Escolher o modelo pelo MAE de teste seria usar o teste para decidir, o que a regra do projeto proíbe. A decisão foi mantida no procedimento. Se o time preferir outro critério, ele deve ser definido **antes** de olhar o teste de novo.

### Decisões de modelagem

- **Seno/cosseno do mês:** dezembro e janeiro ficam vizinhos, e o modelo aprende a sazonalidade (energia e água no verão) com 2 colunas, em vez de 11 dummies com 33 exemplos.
- **Lags 1 a 3 e média móvel de 3:** capturam nível e inércia. A média

## ML-05: recomendação de anúncios (`POST /recommend`)

Código: `ml-service/scripts/train_recommender.py` (treino), `ml-service/app/services/recommender_features.py` (vetor de interesse) e `ml-service/app/services/recommender.py` (inferência).

### Método

- **Dados:** `resident_profiles.csv`, 240 moradores. Os 8 sem histórico (vetor zero, não tem proporção) ficam fora do ajuste e testam o cold start; sobram 232.
- **Vetor de interesse:** por categoria, `1 x visualizações + 2 x anunciadas + 3 x conversas`. Pesos definidos antes de olhar os dados: conversar com o vendedor mostra mais intenção do que ver um anúncio.
- **Normalização:** `Normalizer(norm="l1")` dentro do `Pipeline`, que transforma o vetor em proporção por categoria (soma 1). Quem interage muito e quem interage pouco, com o mesmo gosto, ficam no mesmo ponto. Não aprende nada dos dados, então não há vazamento entre treino e teste. O `StandardScaler` foi descartado: as proporções já estão na mesma escala (0 a 1) e padronizar inflaria o peso de categorias raras.
- **Escolha do k:** K-Means (`n_init=10`, `random_state=42`) para k de 2 a 8, com inertia (cotovelo) e silhouette. O k escolhido é o de maior silhouette; o cotovelo (ponto mais distante da reta entre os extremos da curva) confere.

### Escolha do k

| k | Inertia | Silhouette |
|---|---|---|
| 2 | 35,04 | 0,374 |
| 3 | 19,53 | 0,502 |
| **4** | **9,47** | **0,597** |
| 5 | 8,24 | 0,511 |
| 6 | 7,16 | 0,447 |
| 7 | 6,44 | 0,377 |
| 8 | 5,94 | 0,354 |

![Cotovelo e silhouette](img/ml-recommend-k-selection.png)

**k = 4.** Os dois critérios apontam o mesmo valor: a inertia cai 51% de k=3 para k=4 e só 13% de k=4 para k=5 (o cotovelo), e a silhouette tem o pico em 0,597, acima de 0,5 (estrutura de grupos razoável). Com k=5 ou mais a silhouette cai porque o K-Means passa a dividir grupos que já eram coesos.

### Clusters encontrados (proporção média de interesse)

| Cluster | Moradores | móveis | eletrônicos | utensílios | esporte | outros | Perfil |
|---|---|---|---|---|---|---|---|
| 0 | 60 | 0,07 | **0,66** | 0,07 | 0,10 | 0,11 | eletrônicos |
| 1 | 68 | **0,51** | 0,08 | **0,32** | 0,03 | 0,06 | montando a casa |
| 2 | 48 | 0,09 | 0,12 | 0,16 | 0,07 | **0,55** | diversos |
| 3 | 56 | 0,06 | 0,12 | 0,07 | **0,57** | 0,18 | esporte |

Os números de cluster são arbitrários e mudam se o modelo for retreinado; a coluna "Perfil" é só uma leitura humana.

### Validação contra os grupos latentes (só para validar, nunca como feature)

| Medida | Valor |
|---|---|
| Silhouette (232 moradores) | 0,597 |
| ARI x grupos latentes | 0,861 |
| ARI em moradores fora do ajuste (20%, reajustando com 80%) | 0,766 |

O ARI de 0,86 mostra que os clusters recuperam os 4 grupos que o gerador usou. O valor fora do ajuste é menor porque são só 47 moradores e cerca de 8% dos perfis são mistos de propósito.

### Como recomenda

1. Monta o vetor, normaliza e atribui o cluster do morador (`predict`).
2. Força de cada categoria no cluster = proporção do centroide dividida pela maior do cluster (a categoria mais forte vale 1,0).
3. `score = 0,7 x força da categoria + 0,3 x popularidade`, com popularidade dividida pela maior entre os candidatos. O score fica entre 0 e 1.
4. Ordena por score (empate: menor `listingId`) e devolve os `topN`.
5. **Cold start** (nenhuma contagem): `cluster = -1` e o score é só a popularidade normalizada.

Por que 0,7 e 0,3: a categoria deve mandar (é o que o cluster diz sobre o gosto), e a popularidade só desempata entre anúncios da mesma categoria ou ajuda quando duas categorias têm força parecida. Não há dado real para ajustar esses pesos.

### Limitações

- Dados sintéticos: o k=4 e o ARI alto refletem os 4 grupos que o gerador criou. Em um condomínio real a estrutura pode ser mais difusa.
- O cluster usa só o tipo de interesse, não o preço. `preco` chega no contrato mas não entra no score.
- O serviço não sabe quais anúncios o morador já viu: o back envia só candidatos que ele ainda não viu nem anunciou.

### Como retreinar

```bash
cd ml-service
python -m scripts.train_recommender   # regrava artifacts/recommender_model.joblib e docs/img/ml-recommend-k-selection.png
pytest
```
