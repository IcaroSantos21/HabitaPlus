# Habita+ - Gestão Condominial

Sistema de gestão condominial com moradores, locação, manutenção, financeiro (cobranças com Stripe), marketplace interno, assistente e previsões de ML.

O repositório é um monorepo:

| Pasta | O que tem |
|---|---|
| `backend/` | API em NestJS, TypeORM e PostgreSQL |
| `frontend/` | Interface em React, Vite e Tailwind |
| `ml-service/` | Serviço de ML em Python (FastAPI) |
| `docs/` | Documentação técnica |

## Como rodar

Há dois caminhos. Para desenvolver e testar pagamento, use o **local** (o webhook do Stripe precisa do Stripe CLI rodando na sua máquina). Para subir backend, banco e ml-service juntos, use o **Docker**.

### Rodando localmente (recomendado para desenvolvimento)

Pré-requisitos: Node.js 24, Docker com Compose v2 (só para o Postgres) e o [Stripe CLI](https://docs.stripe.com/stripe-cli).

1. Copie o `.env` da raiz e preencha as credenciais do banco, o `JWT_SECRET` e as chaves de teste do Stripe. Use `DB_SSL=false` para o Postgres local.

   ```bash
   cp .env.example .env
   ```

2. Suba o banco, aplique as migrations e rode o seed:

   ```bash
   docker compose up -d postgres
   cd backend
   npm install
   npm run migration:run
   npm run seed
   ```

3. Em outro terminal, abra o webhook do Stripe, copie o `whsec_...` que ele imprime para o `STRIPE_WEBHOOK_SECRET` do `.env`:

   ```bash
   stripe listen --events checkout.session.completed --forward-to localhost:3000/api/webhooks/stripe
   ```

4. Suba o backend (reinicie sempre que mudar o `.env`):

   ```bash
   cd backend
   npm run start:dev
   ```

5. Crie o `frontend/.env` e suba o front:

   ```env
   VITE_API_URL=http://localhost:3000
   VITE_USE_MOCKS=false
   ```

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

O front abre em `http://localhost:5173`. O passo a passo completo do teste de pagamento, com a solução dos problemas mais comuns, está em [`docs/rodar-local.md`](docs/rodar-local.md).

> Com `VITE_USE_MOCKS=true`, o front usa uma API simulada e o pagamento **não** passa pelo backend nem pelo Stripe.

### Rodando com Docker

Pré-requisito: Docker com Compose v2.

```bash
cp .env.example .env    # ajuste a senha do banco, o JWT_SECRET e as chaves do Stripe
docker compose up --build
```

Na primeira vez o build leva alguns minutos. As migrations não rodam sozinhas na subida; veja como executá-las em [`backend/README.md`](backend/README.md).

| Serviço | Endereço | Verificação |
|---|---|---|
| Backend | http://localhost:3000/api | `/api/health` (Swagger em `/docs`) |
| ml-service | http://localhost:8000 | `/health` |
| Postgres | `127.0.0.1:5432` (só acessível da própria máquina) | healthcheck do Compose |

O frontend ainda não está no Compose.

```bash
docker compose ps                  # estado e healthcheck de cada serviço
docker compose logs -f backend     # acompanhar logs de um serviço
docker compose up -d postgres      # subir só o banco
docker compose down                # para tudo e mantém os dados do banco
docker compose down -v             # para tudo e APAGA o volume do Postgres
```

## Variáveis de ambiente

Vêm do `.env` da raiz (modelo em `.env.example`). Se faltar uma obrigatória, o backend ou o Compose avisa qual.

| Variável | Para que serve | Padrão |
|---|---|---|
| `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Credenciais e nome do banco (obrigatórias) | sem padrão |
| `DB_PORT` | Porta do Postgres na sua máquina | `5432` |
| `DB_SSL` | `true` para bancos na nuvem (Neon); `false` no Postgres local | `false` |
| `JWT_SECRET` | Chave de assinatura dos tokens (obrigatória) | sem padrão |
| `STRIPE_SECRET_KEY` | Chave secreta de **teste** (`sk_test_...`, obrigatória) | sem padrão |
| `STRIPE_WEBHOOK_SECRET` | Segredo do webhook (`whsec_...`, obrigatória) | sem padrão |
| `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL` | Para onde o Stripe devolve o usuário | `http://localhost:5173/success` e `/cancel` |
| `BACKEND_PORT` | Porta do backend na sua máquina | `3000` |
| `ML_PORT` | Porta do ml-service na sua máquina | `8000` |
| `CORS_ORIGIN` | Origem liberada no backend | `http://localhost:5173` |

## Pagamentos (Stripe, modo teste)

O Stripe é usado só em modo teste. A confirmação do pagamento vem do webhook, e a tela de sucesso do front apenas consulta o status da cobrança.

- Como obter as chaves e como o fluxo funciona: [`docs/stripe-teste.md`](docs/stripe-teste.md)
- Passo a passo para testar localmente: [`docs/rodar-local.md`](docs/rodar-local.md)

Cartão de teste: `4242 4242 4242 4242`, com qualquer validade futura e qualquer CVC.

## Dados para demonstração

Para recriar os registros de demonstração, aplique as migrations e rode o seed a partir do backend:

```bash
cd backend
npm run migration:run
npm run seed
```

O comando pode ser repetido: ele remove e recria somente os registros de demonstração (usuários `@demo.habitaplus.local`, unidades do bloco `DEMO` e comunicados com prefixo `[DEMO]`) e preserva o resto do banco. Para as despesas, usa o dataset `ml-service/data/expenses.csv`, que alimenta 36 meses alinhados com a previsão.

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | `admin@demo.habitaplus.local` | `HabitaDemo2026!` |
| Síndico | `sindico@demo.habitaplus.local` | `HabitaDemo2026!` |
| Moradores | `morador01@demo.habitaplus.local` a `morador20@demo.habitaplus.local` | `HabitaDemo2026!` |

Use essas credenciais só em ambiente local de demonstração. O seed se recusa a rodar com `NODE_ENV=production`.

No painel do síndico ou administrador, **Verificar alertas** executa a verificação diária sob demanda. Ela é idempotente no mesmo dia.

## Dados e migrations

Os dados do Postgres ficam no volume `pgdata` e sobrevivem a `docker compose down`. Para recomeçar com o banco vazio, use `docker compose down -v`. O schema vem de migrations (o `synchronize` fica desligado).

## Contribuindo

Branches, commits e regras de PR estão em [CONTRIBUTING.md](CONTRIBUTING.md).