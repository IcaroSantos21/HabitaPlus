# Habita+ Backend

API em NestJS + TypeScript + PostgreSQL + TypeORM.

## Requisitos

- Node.js 20+
- Docker (para o Postgres local) ou um Postgres 16 já instalado

## Como rodar

```bash
cd backend
cp .env.example .env        # ajuste a senha do banco
docker compose up -d        # sobe o Postgres
npm install
npm run start:dev
```

- API: http://localhost:3000/api
- Health check: http://localhost:3000/api/health
- Swagger: http://localhost:3000/docs

## Testes

```bash
npm test            # unitários
npm run test:e2e    # endpoints
```

## Migrations

O `synchronize` fica sempre desligado. Toda mudança de schema vira migration.

```bash
npx typeorm-ts-node-commonjs migration:generate -d src/database/data-source.ts src/database/migrations/NomeDaMigration
npx typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts
```

## Estrutura

```
src/
  config/        configuração tipada e validação do .env
  database/      data-source e migrations
  common/        filtros, guards, decorators, DTOs compartilhados
  modules/       um módulo por domínio
```

## Convenções

Leia `CONTEXTO-BACKEND.md` antes de abrir PR: arquitetura em camadas, SOLID, DTOs e testes.