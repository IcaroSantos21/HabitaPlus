# Habita+ - Gestão Condominial
## Subindo o sistema com Docker

Pré-requisito: Docker com Compose v2.

```bash
cp .env.example .env    # ajuste a senha do banco
docker compose up --build
```

Na primeira vez o build leva alguns minutos. Depois disso, `docker compose up` sobe tudo.

| Serviço | Endereço | Verificação |
|---|---|---|
| Backend | http://localhost:3000/api | `/api/health` (Swagger em `/docs`) |
| ml-service | http://localhost:8000 | `/health` |
| Postgres | `127.0.0.1:5432` (só acessível da própria máquina) | healthcheck do Compose |

### Comandos úteis

```bash
docker compose ps                  # estado e healthcheck de cada serviço
docker compose logs -f backend     # acompanhar logs de um serviço
docker compose up -d postgres      # subir só o banco (para rodar o backend fora do Docker)
docker compose down                # para tudo e mantém os dados do banco
docker compose down -v             # para tudo e APAGA o volume do Postgres
```

### Variáveis de ambiente

As variáveis vêm do `.env` da raiz (modelo em `.env.example`).

| Variável | Para que serve | Padrão |
|---|---|---|
| `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Credenciais e nome do banco (obrigatórias) | sem padrão |
| `DB_PORT` | Porta do Postgres exposta na sua máquina | `5432` |
| `BACKEND_PORT` | Porta do backend na sua máquina | `3000` |
| `ML_PORT` | Porta do ml-service na sua máquina | `8000` |
| `CORS_ORIGIN` | Origem liberada no backend | `http://localhost:5173` |

Se faltar uma variável obrigatória, o `docker compose` para com uma mensagem dizendo qual.

### Rodando o backend fora do Docker

Para desenvolver com `npm run start:dev`, suba só o banco. O backend usa o `.env`
da raiz do repositório, assim como o Docker Compose:

```bash
docker compose up -d postgres
cd backend
npm run start:dev
```

Antes de iniciar, configure no `.env` da raiz as credenciais do banco, `JWT_SECRET`
e as chaves Stripe de teste (`STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET`).
Consulte [`docs/stripe-teste.md`](docs/stripe-teste.md) para obter as chaves.

### Dados e migrations

Os dados do Postgres ficam no volume `pgdata` e sobrevivem a `docker compose down`. Para recomeçar com o banco vazio, use `docker compose down -v`.

O schema vem de migrations (o `synchronize` fica desligado), e elas **não rodam sozinhas na subida**. Veja como executá-las em `backend/README.md`.

### Frontend

Ainda não está no Compose. Entra quando o frontend tiver Dockerfile.

## Contribuindo

Branches, commits e regras de PR estão em [CONTRIBUTING.md](CONTRIBUTING.md).

## Dados para demonstracao

Para recriar os registros de demonstracao localmente, aplique as migrations e
execute o seed a partir do backend:

```powershell
cd backend
npm run migration:run
npm run seed
```

O comando e repetivel: remove e recria somente os registros identificados como
dados demo (usuarios `@demo.habitaplus.local`, unidades do bloco `DEMO` e
comunicados com prefixo `[DEMO]`). Ele preserva os demais dados do banco e usa
o dataset `ml-service/data/expenses.csv` para alimentar 36 meses de despesas,
alinhados aos meses recentes da previsao.

Credenciais locais de demonstracao:

| Perfil        | E-mail                                                                | Senha             |
| ------------- | --------------------------------------------------------------------- | ----------------- |
| Administrador | `admin@demo.habitaplus.local`                                         | `HabitaDemo2026!` |
| Sindico       | `sindico@demo.habitaplus.local`                                       | `HabitaDemo2026!` |
| Moradores     | `morador01@demo.habitaplus.local` a `morador20@demo.habitaplus.local` | `HabitaDemo2026!` |

Use essas credenciais apenas em ambiente local de demonstracao. O seed se
recusa a executar quando `NODE_ENV=production`.

No painel do síndico ou administrador, use **Verificar alertas** para executar
a mesma verificação diária sob demanda; a execução é idempotente no mesmo dia.
