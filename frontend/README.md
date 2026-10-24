# Habita+ — Front-end

Front-end React + Vite + Tailwind CSS.

## Requisitos

- Node.js 24
- npm

## Instalação no Windows (PowerShell)

Execute os comandos dentro desta pasta (`frontend`):

```powershell
npm.cmd install
npx.cmd msw init public --save
Copy-Item .env.example .env
npm.cmd run dev
```

Se o arquivo `.env` já existir, não o sobrescreva sem conferir. Ele deve conter:

```env
VITE_API_URL=http://localhost:3000
VITE_USE_MOCKS=true
```

Abra o endereço que o Vite mostrar, normalmente `http://localhost:5173`.

## Modo de mocks (MSW)

`VITE_USE_MOCKS=true` ativa o Mock Service Worker durante o desenvolvimento. O backend não precisa estar ligado para experimentar login, cadastro e os módulos demonstrativos.

Contas de demonstração:

| Perfil | E-mail | Senha |
|---|---|---|
| Morador | `morador@habitaplus.com` | `Habita123!` |
| Síndico | `sindico@habitaplus.com` | `Habita123!` |
| Administrador | `admin@habitaplus.com` | `Habita123!` |

Também é possível cadastrar um novo morador no formulário. As contas cadastradas no modo mock ficam salvas apenas na sessão atual do navegador.

Para testar a API real, altere `VITE_USE_MOCKS=false` no `.env`, confira se o backend está em execução e reinicie o Vite. O cliente de autenticação usa os endpoints atualmente implementados pelo backend (`/api/auth/login`, `/api/auth/register` e `/api/auth/me`). Os demais serviços seguem os caminhos planejados em `docs/api-contracts.md`; parte dos endpoints de domínio ainda depende de implementação no backend.

## Serviços da API

Cada módulo tem seu próprio serviço em `src/services/`, por exemplo `authService`, `unitsService`, `ticketsService`, `chargesService`, `announcementsService` e `notificationsService`. As telas chamam esses serviços; a camada Axios define URL base, token Bearer e tratamento de HTTP 401.

## Rotas e perfis

- `/login`: autenticação.
- `/dev/components`: catálogo de componentes.
- `/morador`: área do perfil MORADOR.
- `/sindico`: área do perfil SINDICO.
- `/admin`: área do perfil ADMIN.
- Demais módulos autenticados: unidades, locações, chamados, transações, cobranças, anúncios, mensagens, notificações, assistente, previsão e recomendações.

Ao receber HTTP 401 de uma requisição autenticada, o cliente remove o token local e a sessão volta à tela de login. O menu lateral muda conforme o perfil.

## Verificação

```powershell
npm.cmd run lint
npm.cmd run build
```

## Build e Docker

```powershell
npm.cmd run build
```

A imagem Docker do frontend e o fallback do Nginx permanecem configurados nos arquivos `Dockerfile` e `nginx.conf`.


## Ajustes complementares da FE-03

- O serviço `src/services/nluService.js` chama `POST /api/v1/nlu/parse`.
- Com `VITE_USE_MOCKS=true`, o MSW oferece uma resposta demonstrativa para interpretação de texto.
- A rota de locações é restrita a síndico e administrador, como no menu autenticado. O menu de síndico também apresenta o assistente virtual, cuja rota é acessível aos perfis autenticados.


## Login e cadastro (FE-04)

- `/login`: acesso por e-mail e senha.
- `/cadastro`: cadastro público de morador com nome, e-mail, senha e confirmação da senha.
- O formulário valida campos obrigatórios, formato de e-mail, tamanho mínimo da senha e igualdade das senhas. Erros retornados pela API são exibidos no formulário.
- Depois do login ou cadastro, a navegação segue o perfil recebido (`MORADOR`, `SINDICO` ou `ADMIN`). O token é persistido pelo `AuthContext` em `localStorage`, e `/auth/me` restaura a sessão após recarregar a página.
- O botão de sair permanece no layout autenticado e remove o token local.
- O layout usa o painel de marca azul `#124170` e se reorganiza verticalmente em telas pequenas.

Para testar com MSW, mantenha `VITE_USE_MOCKS=true` no `.env`. Para testar contra o backend real, configure `VITE_USE_MOCKS=false`, confirme que o backend está ativo e reinicie o Vite. Os endpoints de autenticação reais do backend são `/api/auth/login`, `/api/auth/register` e `/api/auth/me`.
