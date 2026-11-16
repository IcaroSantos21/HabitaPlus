# Relatório de Machine Learning do `ml-service`

**HabitaPlus --- avaliação dos modelos ML-03, ML-05 e ML-04**

Todos os resultados deste relatório foram obtidos com dados
**sintéticos**, gerados por `ml-service/scripts/generate_data.py` (ver
`docs/ml-dataset.md`). Eles demonstram o funcionamento do pipeline e
permitem comparar abordagens em um cenário controlado; não comprovam que
os modelos terão o mesmo desempenho em um condomínio real.

O serviço possui três modelos de Machine Learning avaliados neste
documento: previsão de despesas, agrupamento para recomendação de
anúncios e classificação de intenções do chatbot. A análise de
manutenção baseada em regras não é um modelo treinado de Machine
Learning e, portanto, não recebe métricas como MAE, silhouette ou F1.

------------------------------------------------------------------------

## ML-03: previsão de despesas (`POST /predict/expenses`)

**Código:** `ml-service/scripts/train_expenses.py` (treinamento),
`ml-service/app/services/expense_features.py` (features) e
`ml-service/app/services/expense_predictor.py` (inferência).

### Objetivo e funcionamento

O modelo estima o total de despesas do condomínio para um mês futuro a
partir do histórico mensal. A previsão utiliza padrões recentes de
gastos e uma representação cíclica do mês para que o modelo possa
aprender possíveis variações sazonais.

O pipeline compara um método de referência simples (baseline), uma
regressão linear regularizada (Ridge) e um conjunto de árvores de
decisão (Random Forest). A escolha é feita na validação temporal; o
conjunto de teste é reservado para medir o desempenho final.

### Método

-   **Dados:** `expenses_total.csv`, com 36 meses, de 2023-11 a 2026-10.
    As três primeiras linhas são necessárias para construir os lags;
    restam 33 exemplos supervisionados.
-   **Features:** mês-alvo representado por seno e cosseno; valores dos
    últimos 1, 2 e 3 meses (`lags`); e média móvel dos últimos 3 meses.
-   **Divisão temporal, sem embaralhar:** treino de 27 meses (2024-02 a
    2026-04) e teste dos 6 meses mais recentes (2026-05 a 2026-10).
-   **Ausência de contaminação do teste por choques:** o último choque
    sintético ocorre em 2026-01 e afeta os lags até 2026-04. Assim, ele
    não alcança o período de teste nem os lags usados nele.
-   **Pipeline:** `StandardScaler` seguido do estimador. O scaler é
    ajustado somente com os dados de treino, evitando que informações do
    teste participem do ajuste.
-   **Validação:** validação de origem móvel (*walk-forward*) dentro do
    período de treino. São feitas 12 previsões de um mês à frente; a
    cada etapa o modelo é treinado novamente com os dados disponíveis
    até aquele momento.
-   **Candidatos:** baseline (repete o último mês); `Ridge` (alpha entre
    1, 10 e 100, selecionado na validação); e `RandomForestRegressor`
    (200 árvores, profundidade máxima 4 e `random_state=42`).

### Como interpretar as métricas

-   **MAE (Mean Absolute Error):** média dos valores absolutos das
    diferenças entre o valor real e o previsto. É expresso em reais; por
    exemplo, MAE de R\$ 500 significa erro absoluto médio de R\$ 500.
    Quanto menor, melhor.
-   **RMSE (Root Mean Squared Error):** raiz da média dos erros ao
    quadrado. Também é expresso em reais e penaliza mais os erros
    grandes. Quanto menor, melhor.
-   **MAPE (Mean Absolute Percentage Error):** média dos erros absolutos
    em proporção ao valor real, apresentada em porcentagem. Um MAPE de
    2,77% representa erro percentual absoluto médio de 2,77%. Quanto
    menor, melhor. Essa métrica requer valores reais diferentes de zero.

### Resultados no teste temporal (2026-05 a 2026-10)

  -------------------------------------------------------------------------------
  Modelo                         MAE       MAPE (%)         MAE na 
                    (R$) | RMSE (R$)                     validação 
                                                             (R\$) 
  --------------- ------------------ -------------- -------------- --------------
  baseline                    699,14         779,41           3,45       2.205,18
  (último mês)                                                     

  Ridge                       548,92         683,02           2,77       2.013,20
  (alpha=100)                                                      

  **Random Forest         **692,16**     **772,41**       **3,42**   **1.453,16**
  (escolhido)**                                                    
  -------------------------------------------------------------------------------

![Gráfico de valores reais e previstos para a previsão de
despesas](img/ml-expenses-real-vs-predicted.png)

**Arquivo:** `docs/img/ml-expenses-real-vs-predicted.png`.

O `RandomForestRegressor` foi selecionado porque apresentou o menor MAE
na validação temporal: R\$ 1.453,16. No teste, seu MAE foi R\$ 692,16,
apenas R\$ 6,98 (aproximadamente 1%) abaixo do baseline. Essa diferença
é pequena e, com apenas seis observações de teste, não é evidência
estatística confiável de superioridade.

### Por que o Ridge não foi escolhido, apesar do melhor resultado no teste

-   A seleção deve ser feita na validação, e não no teste. Usar o
    resultado do teste para escolher o modelo seria adaptar a decisão
    aos dados reservados para avaliação final.
-   A validação inclui os choques sintéticos de 2024-08 e 2025-03 e os
    meses seguintes, nos quais o lag 1 pode permanecer elevado. O
    baseline e os modelos lineares são mais afetados por esses valores;
    a floresta apresentou o menor erro médio de validação.
-   No teste, não há choque. O Ridge com `alpha=100` produz previsões
    mais regulares e teve melhor desempenho nesse trecho de seis meses.
-   Portanto, o resultado de teste do Ridge deve ser reportado, mas não
    usado para alterar retrospectivamente a escolha feita na validação.

### Decisões de modelagem

-   **Seno e cosseno do mês:** representam o calendário como um ciclo.
    Dezembro e janeiro ficam próximos na representação, permitindo
    aprender sazonalidade com duas colunas, em vez de usar 11 variáveis
    indicadoras com apenas 33 exemplos.
-   **Lags de 1 a 3 meses:** fornecem ao modelo os valores recentes e
    ajudam a representar o nível e a inércia dos gastos.
-   **Média móvel de 3 meses:** resume os gastos recentes e reduz a
    influência de oscilações isoladas.
-   **Baseline:** repetir o último mês estabelece uma referência
    simples. A utilidade de um modelo mais complexo deve ser julgada em
    comparação com essa referência.

### Limitações

-   **Dados sintéticos:** os valores foram produzidos por regras
    artificiais de tendência, sazonalidade, ruído e choques. O
    desempenho não representa necessariamente despesas reais.
-   **Poucas observações:** há 36 meses de histórico e somente 27
    exemplos no treino após a construção dos lags. Esse volume é
    limitado, principalmente para o Random Forest.
-   **Teste curto:** as métricas finais usam apenas seis meses.
    Diferenças pequenas podem decorrer das características específicas
    desse período.
-   **Choques artificiais:** o dataset contém três eventos pontuais
    (reforma da fachada, vazamento e manutenção da garagem). Eventos
    reais podem ter frequência, magnitude e relações diferentes.
-   **Eventos ausentes:** o dataset não inclui 13º salário em
    novembro/dezembro; inflação e reajustes de tarifas são representados
    de forma agregada pela tendência.
-   **Generalização:** o modelo precisa ser reavaliado com um histórico
    real mais longo e com acompanhamento de erros ao longo do tempo.

### Como retreinar

Execute a partir da pasta `ml-service`, com o ambiente virtual ativado.
O comando abaixo salva um artefato específico da avaliação ML-07 e não
substitui o modelo ativo da API.

``` powershell
python .\scripts\train_expenses.py `
    --out .\artifacts\expense_model_ml07.joblib `
    --plot-path ..\docs\img\ml-expenses-real-vs-predicted.png
```

------------------------------------------------------------------------

## ML-05: recomendação de anúncios (`POST /recommend`)

**Código:** `ml-service/scripts/train_recommender.py` (treinamento),
`ml-service/app/services/recommender_features.py` (vetor de interesse) e
`ml-service/app/services/recommender.py` (inferência).

### Objetivo e funcionamento

O recomendador identifica moradores com padrões de interesse semelhantes
e usa esses agrupamentos para ordenar os anúncios do marketplace. O
algoritmo K-Means não prevê uma categoria de produto comprada; ele
agrupa perfis de comportamento. Na inferência, o cluster do morador
ajuda a calcular a afinidade de cada anúncio com o perfil.

### Método

-   **Dados:** `resident_profiles.csv`, com 240 moradores. Oito perfis
    não possuem histórico (vetor zero) e são reservados para testar o
    caminho de *cold start*. Os outros 232 são utilizados no
    agrupamento.
-   **Vetor de interesse:** para cada categoria, combina
    `1 × visualizações + 2 × anunciadas + 3 × conversas`. Conversas
    recebem maior peso porque representam uma interação mais forte do
    que apenas visualizar um anúncio.
-   **Categorias:** `moveis`, `eletronicos`, `utensilios`, `esporte` e
    `outros`.
-   **Normalização:** `Normalizer(norm="l1")` transforma as contagens em
    proporções cuja soma é 1. Assim, moradores com volumes diferentes de
    atividade, mas distribuição de interesses semelhante, podem ficar
    próximos no espaço de características.
-   **Uso de `grupo_latente`:** essa coluna existe apenas para avaliar
    os clusters em relação aos grupos artificiais criados pelo gerador.
    Ela não entra no vetor de entrada do K-Means.
-   **Algoritmo:** K-Means com `n_init=10` e `random_state=42`, testando
    valores de K entre 2 e 8.
-   **Escolha de K:** utiliza inércia (método do cotovelo) e silhouette.
    O maior silhouette seleciona K; o cotovelo funciona como uma
    verificação complementar.

### Como interpretar as métricas de agrupamento

-   **Inércia (*inertia*):** soma das distâncias quadráticas dos pontos
    aos centroides de seus clusters. Em geral diminui quando K aumenta,
    porque mais grupos permitem representar os pontos com distâncias
    menores. Por isso, não se escolhe K apenas pelo menor valor de
    inércia; procura-se um ponto de cotovelo, em que o ganho adicional
    passa a ser menor.
-   **Silhouette:** compara a proximidade de cada ponto ao próprio
    cluster com a proximidade ao cluster vizinho. Varia de -1 a 1:
    valores próximos de 1 indicam grupos mais separados; valores
    próximos de 0 indicam sobreposição; valores negativos podem indicar
    pontos atribuídos ao grupo errado. Quanto maior, melhor a separação
    interna.
-   **ARI (Adjusted Rand Index):** compara os agrupamentos encontrados
    com rótulos de referência, ajustando a concordância esperada ao
    acaso. Valor 1 indica concordância perfeita; valores próximos de 0
    indicam concordância semelhante à aleatória. Neste projeto, os
    rótulos de referência são sintéticos.

### Escolha do número de clusters

        K    Inércia   Silhouette
  ------- ---------- ------------
        2      35,04        0,374
        3      19,53        0,502
    **4**   **9,47**    **0,597**
        5       8,24        0,511
        6       7,16        0,447
        7       6,44        0,377
        8       5,94        0,354

![Gráfico do método do cotovelo e da métrica silhouette para seleção de
K](img/ml-recommend-k-selection.png)

**Arquivo:** `docs/img/ml-recommend-k-selection.png`.

**Resultado: K = 4.** O maior silhouette foi 0,5965 em K=4. A inércia
também apresenta uma queda acentuada de K=3 para K=4 (aproximadamente
51%) e uma redução menor de K=4 para K=5 (aproximadamente 13%),
indicando o cotovelo em quatro grupos.

### Clusters encontrados

As médias abaixo representam a proporção de interesse por categoria em
cada centroide.

  --------------------------------------------------------------------------------------------------
    Cluster   Moradores      Móveis   Eletrônicos   Utensílios     Esporte      Outros Leitura do
                                                                                       perfil
  --------- ----------- ----------- ------------- ------------ ----------- ----------- -------------
          0          60       0,070     **0,655**        0,067       0,100       0,108 Eletrônicos

          1          68   **0,508**         0,081    **0,320**       0,029       0,063 Montando a
                                                                                       casa

          2          48       0,094         0,124        0,155       0,072   **0,554** Diversos

          3          56       0,060         0,121        0,066   **0,571**       0,181 Esporte
  --------------------------------------------------------------------------------------------------

Os números dos clusters (0, 1, 2 e 3) são identificadores atribuídos
pelo algoritmo; podem mudar em outro treinamento. Os nomes dos perfis
são interpretações humanas das maiores proporções, não classes
fornecidas ao modelo.

### Validação em relação aos grupos latentes

  -----------------------------------------------------------------------
  Medida                                                        Resultado
  ------------------------------ ----------------------------------------
  Silhouette nos 232 perfis                                        0,5965
  ativos                         

  ARI em relação aos grupos                                         0,861
  latentes                       

  ARI nos moradores fora do                                         0,766
  ajuste (20%, aproximadamente   
  47 perfis)                     
  -----------------------------------------------------------------------

O ARI de 0,861 indica que os agrupamentos recuperam boa parte da
estrutura de quatro grupos criada pelo gerador. O resultado de 0,766 no
subconjunto fora do ajuste é menor, mas ainda indica concordância
relevante com os rótulos sintéticos.

**Cuidado na interpretação:** esses valores não comprovam que as
recomendações serão úteis ou que os moradores comprarão os anúncios.
Além disso, a escolha de K foi feita na análise dos perfis ativos antes
da avaliação adicional do subconjunto fora do ajuste; portanto, esse ARI
não deve ser apresentado como uma avaliação completamente independente
da seleção de K.

### Como a recomendação é calculada na API

1.  O serviço monta o vetor de interesse do morador usando
    visualizações, anúncios publicados e conversas, e aplica o pipeline
    de normalização e K-Means para identificar o cluster.

2.  Para cada anúncio candidato, recupera a proporção da categoria
    correspondente no centroide daquele cluster. Esse valor é a
    `category_score` usada diretamente pelo código.

3.  Normaliza a popularidade dos anúncios dividindo a popularidade de
    cada candidato pela maior popularidade entre os candidatos. Se todos
    tiverem popularidade zero, todos recebem popularidade normalizada
    igual a zero.

4.  Calcula o score:

    `score = 0,80 × category_score + 0,20 × popularidade_normalizada`

5.  Ordena os anúncios pelo score decrescente. Em caso de empate,
    utiliza o menor `listing_id`. Retorna a quantidade solicitada em
    `top_n`.

6.  **Cold start:** se o morador não possui nenhuma interação, o serviço
    não tenta atribuir um cluster. Retorna `cluster = -1` e ordena os
    candidatos somente pela popularidade normalizada.

Os pesos de 80% para afinidade por categoria e 20% para popularidade são
os valores implementados atualmente em `recommender.py`. Eles dão maior
influência ao interesse identificado pelo cluster; a popularidade
funciona como fator complementar. Esses pesos são parâmetros definidos
pela implementação, não foram otimizados com dados reais.

### Limitações

-   **Dados sintéticos:** os quatro grupos latentes foram criados pelo
    gerador. Um condomínio real pode apresentar interesses mais
    variados, misturados ou sem separações tão claras.
-   **ARI com rótulos artificiais:** o ARI mede concordância com os
    grupos criados pelo próprio gerador, não satisfação, cliques ou
    compras reais.
-   **Silhouette não mede qualidade comercial:** a métrica avalia a
    separação dos clusters, não se os anúncios recomendados são
    relevantes para o morador.
-   **Preço não participa do score:** embora o contrato possa trazer o
    preço, o código atual não o utiliza no cálculo da recomendação.
-   **Anúncios já vistos:** o serviço depende do backend para enviar
    candidatos que o morador ainda não viu nem anunciou.
-   **Cold start:** sem histórico, a recomendação depende apenas da
    popularidade.
-   **Pesos não calibrados:** a combinação 80%/20% ainda precisa ser
    avaliada com dados reais e indicadores de uso.

### Como retreinar

Execute a partir da pasta `ml-service`. O artefato com sufixo `_ml07`
preserva o modelo ativo utilizado pela aplicação.

``` powershell
python .\scripts\train_recommender.py `
    --out .\artifacts\recommender_model_ml07.joblib `
    --plot-path ..\docs\img\ml-recommend-k-selection.png
```

------------------------------------------------------------------------

## ML-04: NLU --- classificação de intenções (`POST /nlu/parse`)

**Código:** `ml-service/app/services/text_preprocessing.py`,
`intent_classifier.py`, `entity_extractor.py`, `nlu_parser.py` e
`ml-service/scripts/train_intents.py` (treinamento).

### Objetivo e funcionamento

O componente NLU interpreta mensagens do morador para identificar a
intenção principal, como abrir um chamado, consultar apartamentos, pedir
segunda via de boleto ou solicitar recomendações.

O classificador transforma o texto em características numéricas e
utiliza um algoritmo supervisionado para escolher uma intenção. A API
também verifica a confiança da previsão. A extração de entidades (por
exemplo, unidade, bloco, equipamento, quartos, valor e data) é realizada
por regras/expressões regulares em `entity_extractor.py`; ela
complementa a classificação, mas não é um segundo modelo de
classificação treinado.

### Método

-   **Dados:** `intents.csv`, com 1.364 frases e 10 intenções. O
    conjunto utilizado no teste final ficou com 1.092 frases de treino
    (340 templates) e 272 frases de teste (84 templates).
-   **Pré-processamento:** texto em minúsculas, remoção de acentos e
    tokenização, conforme `text_preprocessing.py`, dentro do pipeline.
-   **Separação por grupo:** `StratifiedGroupKFold` usando `base_id`.
    Uma frase original e suas variações ficam sempre no mesmo lado da
    divisão. Isso evita que uma versão da frase esteja no treino e outra
    quase idêntica esteja no teste.
-   **Validação:** validação cruzada agrupada de quatro dobras dentro do
    conjunto de treino. O F1 macro com a regra de confiança da API é
    utilizado para escolher o candidato.
-   **Representações de texto comparadas:** TF-IDF por palavras,
    Bag-of-Words por palavras e TF-IDF por caracteres.
-   **Classificadores comparados:** `LogisticRegression`, `LinearSVC` e
    `Multinomial Naive Bayes`, com grades pequenas de hiperparâmetros.
-   **Confiança:** o modelo selecionado fornece `predict_proba`. Quando
    a maior probabilidade fica abaixo de 0,5, a API devolve
    `fora_de_escopo`.

### Como interpretar as métricas

-   **Acurácia (*accuracy*):** proporção total de frases classificadas
    corretamente. Pode esconder desempenho fraco em classes menores.
-   **Precision:** entre as frases que o modelo atribuiu a uma intenção,
    quantas realmente pertenciam a ela. Precision baixa indica mais
    falsos positivos.
-   **Recall:** entre as frases que realmente pertenciam a uma intenção,
    quantas foram encontradas pelo modelo. Recall baixo indica frases
    daquela intenção que passaram despercebidas.
-   **F1:** média harmônica entre precision e recall. Equilibra os dois
    aspectos; quanto maior, melhor.
-   **F1 macro:** calcula o F1 de cada intenção e depois tira a média
    simples entre as classes. Assim, cada intenção tem o mesmo peso na
    métrica, independentemente da quantidade de exemplos.
-   **Matriz de confusão:** tabela que compara a intenção real com a
    intenção prevista. Na matriz gerada pelo script, as linhas
    representam as classes reais e as colunas as classes previstas. A
    diagonal contém os acertos; os valores fora da diagonal mostram
    quais intenções foram confundidas.

### Resultado do modelo selecionado: TF-IDF de caracteres + Logistic Regression (`C=100`)

  Métrica no teste                                   Resultado
  -------------------------------------------- ---------------
  Acurácia                                       0,875 (87,5%)
  F1 macro com limiar de confiança 0,5               **0,873**
  F1 macro sem aplicar o limiar                          0,907
  Meta mínima de F1 macro                                0,850
  Baseline (classe mais frequente): acurácia             0,132
  Baseline (classe mais frequente): F1 macro             0,023

O F1 macro de 0,873, calculado com o limiar utilizado pela API, supera a
meta de 0,85 estabelecida para a avaliação.

### Comparação dos modelos

O F1 de validação é usado para escolher o modelo; as métricas de teste
servem para reportar o desempenho após a escolha.

  -------------------------------------------------------------------------------------
  Modelo           Hiperparâmetro   F1 validação     Acurácia     F1 macro       F1 sem
                                                        teste        teste       limiar
  ---------------- ---------------- ------------ ------------ ------------ ------------
  tfidf_word +     C = 100                 0,771        0,849        0,854        0,868
  logreg                                                                   

  tfidf_word +     C = 1                   0,795        0,871        0,876        0,876
  linear_svc                                                               

  tfidf_word +     alpha = 0,1             0,794        0,794        0,802        0,803
  naive_bayes                                                              

  bow_word +       C = 100                 0,751        0,842        0,838        0,842
  logreg                                                                   

  bow_word +       C = 1                   0,763        0,860        0,852        0,852
  linear_svc                                                               

  bow_word +       alpha = 0,1             0,812        0,809        0,808        0,796
  naive_bayes                                                              

  **tfidf_char +   **C = 100**         **0,842**    **0,875**    **0,873**    **0,907**
  logreg**                                                                 

  tfidf_char +     C = 1                   0,853        0,926        0,927        0,927
  linear_svc                                                               

  tfidf_char +     alpha = 0,1             0,825        0,901        0,900        0,901
  naive_bayes                                                              
  -------------------------------------------------------------------------------------

O `LinearSVC` com TF-IDF de caracteres teve o maior F1 de teste, mas não
fornece `predict_proba` na implementação utilizada. Como a API precisa
de uma estimativa de confiança para aplicar o limite de 0,5, ele não
atende ao requisito operacional do classificador. Entre os candidatos
compatíveis com esse requisito, `tfidf_char + logreg` teve a melhor
validação (0,842), superando o Naive Bayes com TF-IDF de caracteres
(0,825).

O TF-IDF de caracteres utiliza sequências de caracteres (n-gramas de 2 a
5), ajudando a reconhecer palavras mesmo com abreviações, gírias e erros
de digitação. Isso é útil no conjunto utilizado, que contém variações
como palavras sem acento e erros de digitação.

### Matriz de confusão e resultados por intenção

![Matriz de confusão do classificador de intenções no conjunto de
teste](img/ml-intents-confusion-matrix.png)

**Arquivo:** `docs/img/ml-intents-confusion-matrix.png`.

  Intenção                   Precision   Recall      F1   Suporte
  ------------------------ ----------- -------- ------- ---------
  saudacao                       1,000    0,562   0,720        16
  consultar_apartamentos         0,944    0,944   0,944        36
  abrir_chamado                  0,818    1,000   0,900        36
  status_chamado                 0,893    0,806   0,847        31
  segunda_via_boleto             1,000    0,810   0,895        21
  status_financeiro              1,000    0,931   0,964        29
  previsao_despesas              1,000    1,000   1,000        24
  recomendar_produtos            1,000    0,917   0,957        24
  regras_condominio              0,889    0,727   0,800        22
  fora_de_escopo                 0,596    0,848   0,700        33

As classes `previsao_despesas`, `status_financeiro` e
`recomendar_produtos` apresentaram F1 elevado no teste. Os principais
pontos de atenção foram `saudacao` (recall 0,562), `regras_condominio`
(F1 0,800) e `fora_de_escopo` (F1 0,700).

Os erros mais frequentes observados foram mensagens de `saudacao` e
`status_chamado` classificadas como `fora_de_escopo`, em grande parte
por confiança abaixo de 0,5, e mensagens de `regras_condominio`
confundidas com `abrir_chamado`, especialmente quando mencionavam
reforma ou obra. A baixa precision de `fora_de_escopo` indica que
algumas mensagens válidas foram recolhidas por essa regra de confiança.

### Ampliação dos exemplos

A primeira versão dos dados tinha 289 templates e obteve F1 macro
próximo de 0,80 no teste agrupado, abaixo da meta. Foram acrescentados
135 templates, chegando a 424 templates, com exemplos adicionais para as
intenções e negativos difíceis em `fora_de_escopo`. Os novos templates
foram adicionados ao final das listas para preservar os `base_id`
antigos. A avaliação final reportada acima utiliza os dados ampliados.

### Extração de entidades

A extração de entidades é feita por expressões regulares, com uma função
por entidade em `entity_extractor.py`. Ela foi verificada com testes
positivos e negativos.

  -----------------------------------------------------------------------
  Entidade                Exemplos reconhecidos   Saída
  ----------------------- ----------------------- -----------------------
  `unidade`               "apto 302", "ap. 302",  `"302"`
                          "apartamento nº 58",    
                          "unidade 1204"          

  `bloco`                 "bloco b", "Bloco B",   `"B"`
                          "bl. c"                 

  `equipamento`           elevador, portão,       `"portao"` (id ASCII)
                          bomba, interfone,       
                          iluminação e lâmpada    

  `quartos`               "2 quartos", "dois      `2`
                          quartos", "um quarto"   

  `valorMax`              "até 2 mil", "R\$       `2500.0`
                          2.500", "1500 reais",   
                          "R\$ 2,5 mil"           

  `data`                  "amanhã", "dia 10",     expressão normalizada,
                          "dia 15/11",            por exemplo `"amanha"`
                          "segunda-feira", "15 de 
                          novembro"               
  -----------------------------------------------------------------------

A extração de data retorna a expressão identificada no texto; a
resolução de termos relativos como "amanhã" para uma data de calendário
fica a cargo do backend.

### Limitações

-   **Dados sintéticos:** as frases foram escritas em templates e suas
    variações foram geradas por regras. O F1 de 0,873 demonstra o
    desempenho nesse conjunto, não garante o mesmo resultado com
    mensagens espontâneas de moradores.
-   **Cobertura de linguagem:** gírias, erros e formas de expressão
    reais podem ser diferentes dos exemplos do dataset. `saudacao`
    apresentou recall de 0,562.
-   **Classe fora de escopo:** o limiar de 0,5 pode rejeitar mensagens
    válidas com baixa confiança; por isso, a precision de
    `fora_de_escopo` ficou em 0,596.
-   **Ambiguidade:** mensagens sobre obras, rateios ou despesas podem
    compartilhar vocabulário entre intenções.
-   **Entidades:** a data não é convertida para calendário pelo
    extrator; valores são tratados como `valorMax`; e os blocos
    reconhecidos estão limitados a A--D pela configuração atual.
-   **Generalização:** é necessário testar com mensagens reais,
    consentidas e devidamente protegidas, e revisar periodicamente os
    erros.

### Como retreinar

Execute a partir da pasta `ml-service`, com o ambiente virtual ativado.
O comando abaixo salva o artefato de avaliação sem sobrescrever o modelo
ativo.

``` powershell
python .\scripts\train_intents.py `
    --out .\artifacts\intent_model_ml07.joblib `
    --plot-path ..\docs\img\ml-intents-confusion-matrix.png
```

Se houver alteração em `scripts/intent_templates.py`, gere novamente os
dados antes de treinar:

``` powershell
python -m scripts.generate_data
```

Não é necessário executar `generate_data.py` para repetir uma avaliação
com os CSVs atuais.

### Testes automatizados

Depois dos treinamentos, execute:

``` powershell
python -m pytest
```

**Atenção:** não execute `python -m scripts.generate_data` apenas para
avaliar os modelos atuais. Esse comando recria os CSVs. Ele deve ser
utilizado quando as premissas dos dados ou os templates de intenção
forem alterados; nesse caso, os CSVs gerados devem ser revisados e
versionados junto com as mudanças.

Os artefatos `*_ml07.joblib` são cópias de avaliação. Para atualizar os
modelos ativos, é necessário revisar os resultados, confirmar a
compatibilidade com os serviços e realizar a substituição de forma
controlada.
