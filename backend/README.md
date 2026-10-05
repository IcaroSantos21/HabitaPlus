# Habita+ Backend

API em NestJS + TypeScript + PostgreSQL + TypeORM.

## Requisitos

- Node.js 20+
- Docker (para o Postgres local) ou um Postgres 16 já instalado

## Como rodar

```bash
  cp .env.example .env              # na raiz do repo; ajuste a senha
  docker compose up -d postgres     # só o banco, na raiz
  cd backend
  cp .env.example .env              # mesmos DB_USER/DB_PASSWORD/DB_NAME
  npm install
  npm run start:dev
```
  Para subir tudo em containers, veja o README da raiz.

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