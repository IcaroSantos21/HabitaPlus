# Habita+ Backend

API em NestJS + TypeScript + PostgreSQL + TypeORM.

## Requisitos

- Node.js 20+
- Docker (para o Postgres local) ou um Postgres 16 já instalado
- `JWT_SECRET` definido no `.env` da raiz (também usado pelo Docker Compose)

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

## Autenticação

Configure `JWT_SECRET` com uma chave aleatória longa antes de iniciar a API.
`JWT_EXPIRES_IN_SECONDS` define a duração do token em segundos (padrão: `3600`).
O registro público aceita `nome`, `email` e `senha` (mínimo de 8 caracteres)
e sempre cria um usuário `MORADOR`.

- `POST /api/auth/register`: cadastra morador; não retorna senha nem hash.
- `POST /api/auth/login`: recebe `email` e `senha`, retorna `{ accessToken, user }`.
- `GET /api/auth/me`: retorna o usuário do token Bearer.

As rotas são protegidas por padrão. Use `@Public()` para liberar uma rota e
`@Roles(PerfilUsuario.SINDICO, PerfilUsuario.ADMIN)` para restringir acesso.
`senhaHash` não é carregada em consultas comuns e não faz parte do DTO público.
Para testar autorização, `GET /api/sindico` aceita perfis `SINDICO` e `ADMIN`,
enquanto `GET /api/admin` aceita somente `ADMIN`. Ambas exigem um token Bearer;
um morador recebe `403` com a mensagem “Você não tem permissão para acessar
este recurso.”. As mensagens de validação e de erro da API são apresentadas em
português do Brasil.

Para criar um usuário privilegiado inicialmente, defina `SEED_USER_NAME`,
`SEED_USER_EMAIL`, `SEED_USER_PASSWORD` e `SEED_USER_PROFILE` (`SINDICO` ou
`ADMIN`) somente no ambiente seguro de execução e rode:

```bash
npm run seed:privileged-user
```

Esse seed falha se o e-mail já existir e nunca é exposto por uma rota pública.

## Testes

```bash
npm test            # unitários
npm run test:e2e    # endpoints
```

## Migrations

O `synchronize` fica sempre desligado. Toda mudança de schema vira migration.

```bash
node -r ts-node/register ./node_modules/typeorm/cli.js migration:generate src/database/migrations/NomeDaMigration -d src/database/data-source.ts
npm run migration:run
```

As migrations não são executadas automaticamente quando o backend inicia.
Isso evita que múltiplas réplicas tentem alterar o schema ao mesmo tempo.
Em ambiente local, execute `npm run migration:run` dentro de `backend`. No
Docker Compose, com o serviço backend em execução, rode a partir da raiz:

```bash
docker compose exec backend npm run migration:run:prod
```

O comando de produção usa os arquivos JavaScript compilados em `dist/`; a
migration incremental mantém compatibilidade com bancos que já executaram a
migration inicial anterior. Para listar migrations pendentes no container sem
aplicá-las, use `docker compose exec backend npm run migration:show:prod`.

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