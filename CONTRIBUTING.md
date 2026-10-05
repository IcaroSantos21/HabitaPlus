# Como contribuir

Somos 5 pessoas e pouco tempo. Estas regras existem para evitar dois problemas: conflito de merge e PR sem revisão.

## Fluxo em resumo

1. Pegue uma issue no quadro e mova o card para **Em andamento**.
2. Crie a branch a partir da `main` atualizada.
3. Faça commits pequenos e frequentes.
4. Abra o PR, mova o card para **Em revisão** e peça revisão.
5. Com 1 aprovação e o CI verde, faça o merge. O card vai para **Pronto**.

Ninguém dá push direto na `main`. O GitHub bloqueia, então nem vale tentar.

## Branches

Formato: `tipo/CODIGO-descricao`

| Parte | Regra |
|---|---|
| `tipo` | `feat`, `fix`, `test`, `refactor`, `docs`, `chore` ou `ci` |
| `CODIGO` | código da issue: `BE-05`, `FE-07`, `ML-03`... |
| `descricao` | poucas palavras, minúsculas, separadas por hífen |

Exemplos: `feat/BE-02-auth`, `fix/FE-07-erro-no-login`, `feat/ML-03-regressao`.

Uma branch por issue. Se a issue ficou grande demais, divida em duas.

## Commits

Seguimos o [Conventional Commits](https://www.conventionalcommits.org/pt-br/): `tipo: descrição curta`, com a descrição no imperativo e sem ponto final.

```
feat: adiciona login com JWT
fix: corrige total da cobrança com desconto
test: cobre conflito de contrato ativo na unidade
docs: atualiza contrato do POST /recommend
```

Tipos: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `ci`. Se o commit precisa de "e" para ser explicado, provavelmente são dois commits.

## Pull requests

- Abra o PR contra a `main`. O template já traz o que precisa ser preenchido.
- O título também segue Conventional Commits (ex.: `feat: autenticação com JWT`), porque ele vira o commit na `main`.
- Escreva `Closes #n` no corpo para a issue fechar sozinha no merge.
- Precisa de **1 aprovação** e do **CI verde**. Se o CI falhar, o botão de merge fica bloqueado.
- Quem abriu o PR não aprova o próprio PR.
- PR pequeno é revisado mais rápido. Prefira vários PRs curtos a um gigante.
- Mudou algo visual no front? Coloque um print em 375px e em 1280px.
- Mexeu em modelo do ml-service? Coloque as métricas e a comparação com o baseline no corpo do PR.
- O merge é feito com **squash**, para a `main` ter um commit por PR.

## Evitando conflito de merge

- Antes de começar e antes de abrir o PR, atualize sua branch: `git fetch origin && git rebase origin/main`.
- Não reformate arquivos que você não mexeu.
- Combine no grupo antes de mexer em arquivo compartilhado (`docker-compose.yml`, `docs/api-contracts.md`, `.github/`).
- Mudou contrato da API ou modelo de dados? Atualize o doc no mesmo PR e avise o time.

## O que o CI roda

O workflow `.github/workflows/ci.yml` roda em todo PR, com um job por pacote. Rode o mesmo comando localmente antes de abrir o PR:

| Job | Comandos |
|---|---|
| Backend | `npm ci`, `npm run lint:check`, `npm run build`, `npm test`, `npm run test:e2e` (dentro de `backend/`) |
| Frontend | `npm ci`, `npm run lint`, `npm run build` (dentro de `frontend/`) |
| ML Service | `pip install -r requirements.txt`, `pytest` (dentro de `ml-service/`) |

Dica: no backend, `npm run lint` corrige os arquivos (`--fix`) e `npm run lint:check` só aponta os erros, que é o que o CI usa. No front, mantenha o script `lint` sem `--fix` pelo mesmo motivo.

## Configuração do repositório (feita por quem administra)

A proteção da `main` fica em *Settings → Branches → Add branch ruleset* (ou *branch protection rule*) para `main`:

- exigir pull request antes do merge, com 1 aprovação;
- exigir os status checks `Backend`, `Frontend` e `ML Service`;
- exigir branch atualizada com a `main` antes do merge;
- bloquear push direto, inclusive de administradores.