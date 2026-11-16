HabitaPlus — Resumo dos modelos de ML para a banca

O HabitaPlus utiliza três modelos de Machine Learning, desenvolvidos em Python, cada um com uma finalidade diferente.

1. ML-03 — Previsão de despesas
- Objetivo: prever os gastos futuros do condomínio com base no histórico.
- Método: compara Baseline, Ridge e Random Forest.
- Avaliação: MAE, RMSE e MAPE, que medem o tamanho dos erros das previsões.
- Resultado: Random Forest foi escolhido pela validação, com MAE de R$ 1.453,16. No teste, o Ridge apresentou o menor erro (MAE de R$ 548,92).
O modelo aprende com os gastos anteriores para estimar despesas futuras.

2. ML-05 — Recomendação de anúncios
- Objetivo: agrupar moradores com interesses semelhantes para recomendar anúncios.
- Método: K-Means, utilizando visualizações, anúncios publicados e conversas como indicadores de interesse.
- Avaliação: Silhouette mede a separação dos grupos; ARI compara os grupos encontrados com os grupos de referência.
- Resultado: 4 grupos, Silhouette de 0,5965 e ARI de 0,861 no conjunto total.
O modelo identifica perfis de interesse e ajuda a ordenar anúncios relevantes para cada morador.

3. ML-04 — Classificação de intenções (chatbot)
- Objetivo: identificar o que o morador deseja ao enviar uma mensagem.
- Método: TF-IDF de caracteres com Logistic Regression.
- Avaliação: Accuracy, Precision, Recall, F1-score e matriz de confusão.
- Resultado: Accuracy de 87,5% e F1 macro de 0,873.

O modelo interpreta a mensagem e identifica a intenção, como abrir chamado ou consultar informações.

Limitações e conclusão
Os dados utilizados são sintéticos, então os resultados ainda precisam ser validados com dados reais.

- ML-03: prevê gastos.
- ML-05: agrupa interesses e recomenda anúncios.
- ML-04: identifica intenções do chatbot.

Cada modelo resolve um problema diferente e foi avaliado com métricas adequadas à sua finalidade.