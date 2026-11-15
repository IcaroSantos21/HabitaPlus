# Habita+ — Documentação Técnica

Projeto ExpoTech 2026 · Categoria Inteligência · UniFECAF

Repositório: https://github.com/IcaroSantos21/HabitaPlus

Equipe: Icaro Rodrigues Santos, Dan Nakada, Denilson Severino, Rafael Matos Celestino e Samuel Neves.

## 1. Visão geral

O Habita+ é um sistema de gestão condominial para síndicos, administradores e moradores. Ele reúne em um só lugar o cadastro de unidades e moradores, a locação de imóveis, os chamados de manutenção, a cobrança de taxas com pagamento online, um marketplace interno entre moradores e um assistente conversacional.

A parte de inteligência está em um serviço de Machine Learning separado, que faz três coisas: prevê a despesa total do próximo mês, interpreta mensagens do morador (intenção e dados da frase) e recomenda anúncios do marketplace de acordo com o histórico de interesse de cada um.

Todos os dados de treino são sintéticos, gerados por script com semente fixa. Os números de ML deste documento mostram que o pipeline funciona, não que o modelo valeria em um condomínio real.

## 2. Arquitetura

O projeto é um monorepo com quatro partes que conversam por HTTP:

| Componente | Tecnologia | Responsabilidade |
| --- | --- | --- |
| Frontend | React 19, Vite, Tailwind CSS, React Router 7, Axios, Recharts | Telas para morador, síndico e administrador |
| Backend | NestJS 11, TypeScript, TypeORM, Swagger | API REST, autenticação, regras de negócio, integração com Stripe |
| ML service | Python 3.11, FastAPI, scikit-learn, pandas | Previsão de despesas, NLU e recomendação |
| Banco de dados | PostgreSQL 16 (Neon na versão publicada) | Persistência, com schema controlado por migrations |

Fluxo principal: o navegador chama o backend; o backend valida o token, aplica as regras e, quando a funcionalidade é de inteligência, chama o ml-service pela rede interna (`ML_SERVICE_URL`). O front nunca fala direto com o ml-service. O pagamento é feito no Checkout hospedado pelo Stripe, que avisa o backend por webhook.

## 3. Perfis e controle de acesso

A autenticação usa JWT (`POST /api/auth/login`), com senha guardada como hash bcrypt. Cada usuário tem um perfil e as rotas validam esse perfil:

| Perfil | O que faz |
| --- | --- |
| MORADOR | Vê as próprias cobranças e paga, abre chamados, usa o marketplace, recebe notificações, fala com o assistente |
| SINDICO | Gera cobranças, acompanha chamados, inadimplência e painel financeiro, publica comunicados |
| ADMIN | Acesso total, incluindo cadastro de unidades e vínculos |

## 4. Módulos do backend

A API fica em `/api` e a documentação interativa (Swagger) em `/docs`. Listagens usam resposta paginada e erros seguem um formato único, definidos em `docs/api-contracts.md`.

| Módulo | Rotas principais | Observação |
| --- | --- | --- |
| Autenticação | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | JWT com expiração configurável |
| Unidades | `/units` (CRUD), `GET /units/available`, `POST /units/:id/residents`, `DELETE /units/:id/residents/:usuarioId` | Vínculo de proprietário ou inquilino |
| Locação | `/rentals` (CRUD), `PATCH /rentals/:id/end`, `GET /units/:id/rentals` | Contratos com início, fim e status |
| Chamados | `POST /tickets`, `GET /tickets`, `PATCH /tickets/:id/status`, `GET /tickets/history`, `GET /tickets/stats` | Fluxo ABERTO → EM\_ANDAMENTO → ENCERRADO; chamado pode ser de área comum |
| Cobranças | `POST /charges/generate?competencia=YYYY-MM`, `GET /charges`, `GET /charges/me` | Uma cobrança por unidade e competência |
| Pagamento | `POST /charges/:id/checkout`, `POST /webhooks/stripe` | Stripe em modo teste |
| Transações | `/transactions` (CRUD), `GET /transactions/monthly-summary` | Receitas e despesas por competência |
| Financeiro | `GET /finance/delinquency`, `GET /finance/dashboard` | Inadimplência e indicadores |
| Marketplace | `/listings` (CRUD), `GET /listings/categories`, `GET /listings/mine`, `POST /listings/:id/view`, `PATCH /listings/:id/status` | Cada visualização é registrada |
| Mensagens | `POST` e `GET /listings/:id/messages`, `GET /messages/inbox`, `PATCH /messages/:id/read` | Conversa entre comprador e vendedor |
| Notificações | `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/read-all`, `POST /notifications/run-daily` | Alertas gerados por rotina diária |
| Comunicados | `/announcements` (CRUD) | Avisos do síndico |
| Inteligência | `GET /predictions/expenses`, `POST /nlu/parse`, `POST /chatbot/message`, `GET /recommendations/me`, `GET /residents/me/recommendations`, `GET /residents/me/interest-profile` | Chamam o ml-service |
| Saúde | `GET /health` | Usado nos healthchecks |

### Regras de negócio que valem destacar

- **Cobrança única:** existe no máximo uma cobrança por unidade e competência (índice único no banco). Por isso gerar o mês duas vezes não duplica nada.
- **Atraso automático:** um job diário (`@nestjs/schedule`) marca como ATRASADA a cobrança pendente que passou do vencimento.
- **Pagamento vira receita:** quando a cobrança é paga, uma transação de receita (categoria taxa condominial) é criada na mesma operação, e o resumo mensal já a inclui.
- **Webhook seguro:** o endpoint do Stripe valida a assinatura usando o corpo bruto da requisição. Só `checkout.session.completed` marca a cobrança como PAGA.
- **Notificações sem repetição:** as mensagens agendadas usam uma chave única, então rodar a rotina duas vezes no mesmo dia não gera avisos repetidos.

## 5. Modelo de dados

O acesso ao banco é feito pelo TypeORM. O `synchronize` fica desligado e toda mudança de estrutura passa por migration. O detalhamento completo, com diagrama ER, está em `docs/modelo-de-dados.md`.

| Entidade | Papel |
| --- | --- |
| Usuario | Pessoa com perfil MORADOR, SINDICO ou ADMIN |
| Unidade | Apartamento: bloco, número, quartos, área, aluguel sugerido, disponível para locação |
| Vinculo | Liga usuário e unidade (PROPRIETARIO ou INQUILINO) |
| ContratoLocacao | Locação de uma unidade a um locatário |
| Chamado | Solicitação de manutenção, de unidade ou de área comum |
| Transacao | Receita ou despesa de uma competência |
| Cobranca | Taxa de uma unidade: PENDENTE, PAGA ou ATRASADA |
| Anuncio | Item à venda no marketplace: DISPONIVEL ou VENDIDO |
| Visualizacao | Registro de que um usuário viu um anúncio (base da recomendação) |
| Mensagem | Conversa sobre um anúncio |
| Notificacao | Aviso para um usuário |

## 6. Serviço de Machine Learning

O ml-service é uma aplicação FastAPI organizada em `routers`, `schemas` e `services`. Os modelos são treinados por scripts em `ml-service/scripts`, salvos em `artifacts/` e carregados na subida do serviço. Os contratos de entrada e saída estão em `docs/api-contracts.md` e o relatório completo, com gráficos, em `docs/ml-report.md`.

| Endpoint | Função |
| --- | --- |
| `GET /health` | Verificação de saúde |
| `POST /predict/expenses` | Despesa total prevista para um mês |
| `POST /nlu/parse` | Intenção e dados extraídos de uma mensagem |
| `POST /recommend` | Anúncios sugeridos para um morador |

### 6.1 Previsão de despesas

- **Dados:** 36 meses de despesas sintéticas, com choques pontuais para simular imprevistos.
- **Features:** seno e cosseno do mês (sazonalidade), lags de 1 a 3 meses e média móvel de 3 meses.
- **Avaliação:** divisão temporal, sem embaralhar (27 meses de treino, 6 de teste). O modelo foi escolhido por validação de origem móvel dentro do treino, e o teste só mediu o escolhido.
- **Candidatos:** baseline (repetir o último mês), Ridge e Random Forest.

| Modelo | MAE (R$) | RMSE (R$) | MAPE |
| --- | --- | --- | --- |
| Baseline | 699,14 | 779,41 | 3,45% |
| Ridge | 548,92 | 683,02 | 2,77% |
| Random Forest (escolhido) | 692,16 | 772,41 | 3,42% |

O Random Forest ganhou na validação, mas no teste ele supera o baseline por cerca de 1%, e com 6 pontos essa diferença não é confiável. O Ridge teve MAE de teste menor, só que escolher o modelo olhando o teste seria usar o conjunto de teste para decidir, então a escolha original foi mantida. Essa discussão está registrada no relatório.

### 6.2 Interpretação de mensagens (NLU)

- **Intenções (10):** saudação, consultar apartamentos, abrir chamado, status de chamado, segunda via de boleto, status financeiro, previsão de despesas, recomendar produtos, regras do condomínio e fora de escopo.
- **Divisão treino/teste:** agrupada por frase-modelo, para que nenhuma frase e suas variações apareçam dos dois lados. Um split aleatório simples daria F1 em torno de 0,98 e esconderia o problema.
- **Modelo escolhido:** TF-IDF de caracteres com Regressão Logística (C = 100). O TF-IDF de caracteres foi o melhor porque o dataset tem erros de digitação e gírias que quebram o vocabulário por palavra.
- **Confiança:** abaixo de 0,5 a API responde `fora_de_escopo`.
- **Entidades:** extraídas por regras (Regex) para preencher os campos da intenção.

| Métrica no teste | Valor |
| --- | --- |
| Accuracy | 0,875 |
| F1 macro (com o limite de confiança, como a API responde) | 0,873 (meta do projeto: 0,85) |
| Baseline (classe mais frequente) | accuracy 0,132 e F1 macro 0,023 |

Os erros mais comuns são saudações e consultas de status caindo em `fora_de_escopo` por confiança baixa, e regras do condomínio confundidas com abertura de chamado quando a frase fala de obra.

### 6.3 Recomendação de anúncios

- **Dados:** 240 perfis sintéticos de moradores.
- **Vetor de interesse:** por categoria, 1 ponto por visualização, 2 por anúncio publicado e 3 por conversa com o vendedor, normalizado em proporção.
- **Modelo:** K-Means. O k foi escolhido por cotovelo e silhouette: k = 4, com silhouette 0,597.
- **Moradores sem histórico (cold start):** recebem recomendação padrão, em vez de um agrupamento sem base.

## 7. Pagamentos

A integração com o Stripe usa só o modo de teste. O morador pede o checkout de uma cobrança, o backend cria a sessão e devolve a URL, o morador paga na página do Stripe e o Stripe chama o webhook do backend, que marca a cobrança como paga. As chaves ficam em variáveis de ambiente e o passo a passo com o Stripe CLI está em `docs/stripe-teste.md`.

## 8. Testes e integração contínua

- **Backend:** testes unitários com Jest (arquivos `*.spec.ts` ao lado do código) e testes e2e para autenticação, chamados, cobranças, pagamentos e health.
- **ML service:** testes com pytest.
- **CI:** o GitHub Actions roda em todo pull request para a `main`: lint, build, testes unitários e e2e do backend, além do lint do frontend.
- **Fluxo de trabalho:** cada tarefa vira uma issue, entra por pull request com revisão e segue o modelo em `.github/pull_request_template.md`. As regras estão no `CONTRIBUTING.md`.

## 9. Como executar

Pré-requisitos: Node.js 24, Python 3.11, Docker com Compose v2 e, para testar pagamento, o Stripe CLI.

```bash
git clone https://github.com/IcaroSantos21/HabitaPlus.git
cd HabitaPlus
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker compose up --build
docker compose exec backend npm run migration:run
docker compose exec backend npm run seed
```

Depois disso:

| Serviço | Endereço |
| --- | --- |
| API | http://localhost:3000/api |
| Swagger | http://localhost:3000/docs |
| Health do backend | http://localhost:3000/api/health |
| ML service | http://localhost:8000/health |

O frontend roda localmente com `npm install` e `npm run dev` dentro de `frontend/` (porta 5173). O comando `npm run seed` limpa e recria os dados de demonstração: 1 administrador, 1 síndico, cerca de 20 moradores, unidades com vínculos, contratos (alguns perto do vencimento), mais de 12 meses de transações, cobranças (algumas atrasadas), chamados e anúncios. As credenciais de demonstração estão no README.

## 10. Implantação

- **Plano B (Docker Compose):** `docker-compose.yml` na raiz sobe PostgreSQL 16 (com volume e healthcheck), backend e ml-service. É o caminho usado para demonstrar sem depender da internet.
- **Versão publicada:** o banco fica no Neon, com SSL ativado por `DB_SSL=true`. A URL pública está no README.
- **Kubernetes:** `k8s/habitaplus.yaml` descreve o deploy em um cluster local k3d, com ConfigMap, Secret criado por `kubectl create secret`, probes em `/api/health` e banco externo no Neon. O manifesto foi validado como YAML, mas ainda não foi aplicado em um cluster real.

## 11. Segurança

- Senhas com hash bcrypt; nunca trafegam nem são devolvidas pela API.
- Rotas protegidas por JWT e por perfil.
- Validação de entrada com `class-validator` e DTOs.
- Assinatura do webhook do Stripe conferida antes de qualquer alteração.
- Segredos (JWT, Stripe, banco) só em variáveis de ambiente; o repositório traz apenas arquivos `.env.example`.
- CORS restrito à origem configurada em `CORS_ORIGIN`.
- Estrutura do banco alterada somente por migrations.

## 12. Limitações conhecidas

- Os modelos de ML foram treinados com dados sintéticos. Com dados reais, seria preciso retreinar e reavaliar todas as métricas.
- Na previsão de despesas, o ganho sobre o baseline é pequeno e testado em apenas 6 meses.
- A NLU cobre 10 intenções fixas; frases fora desse vocabulário tendem a cair em `fora_de_escopo`.
- O Stripe está em modo teste, sem cobrança real.
- O manifesto do Kubernetes ainda não foi validado em um cluster.

## 13. Documentos complementares no repositório

| Arquivo | Conteúdo |
| --- | --- |
| `docs/api-contracts.md` | Contratos da API e do ml-service |
| `docs/modelo-de-dados.md` | Entidades e diagrama ER |
| `docs/ml-report.md` | Relatório completo de ML, com gráficos |
| `docs/ml-dataset.md` | Premissas do dataset sintético |
| `docs/stripe-teste.md` | Pagamento em modo teste com Stripe CLI |
| `docs/rodar-local.md` | Passo a passo para rodar localmente |
