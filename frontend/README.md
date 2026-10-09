# Habita+ — Front-end

Front-end da plataforma Habita+, desenvolvido com React, Vite e Tailwind CSS.

## Tecnologias

- React
- Vite
- JavaScript (JSX)
- React Router
- Axios
- Tailwind CSS
- Nginx e Docker para execução em container

## Pré-requisitos

- Node.js 24
- npm
- Docker Desktop, para executar a versão em container

## Instalação local

Abra um terminal dentro da pasta `frontend`.

### Windows PowerShell

Copie o arquivo de exemplo das variáveis de ambiente:

```powershell
Copy-Item .env.example .env
```

Instale as dependências:

```powershell
npm.cmd install
```

Inicie o ambiente de desenvolvimento:

```powershell
npm.cmd run dev
```

### Linux, macOS ou Git Bash

```bash
cp .env.example .env
npm install
npm run dev
```

O Vite exibirá o endereço local da aplicação no terminal, normalmente `http://localhost:5173/`.

Se essa porta já estiver ocupada, utilize o endereço alternativo que o Vite informar.

## Variáveis de ambiente

As variáveis de ambiente são configuradas por meio de `.env.example`.

| Variável | Descrição | Valor local padrão |
|---|---|---|
| `VITE_API_URL` | Endereço base da API do backend | `http://localhost:3000` |
| `VITE_USE_MOCKS` | Configuração prevista para o uso de mocks | `true` |

Para o desenvolvimento local, crie o arquivo `.env` a partir de `.env.example`.

Não versione o arquivo `.env` nem coloque senhas, tokens ou outras informações secretas nele.

A variável `VITE_USE_MOCKS` é uma configuração; sua presença, por si só, não ativa a integração com MSW.

## Estrutura do projeto

```text
frontend/
├── public/
├── src/
│   ├── components/
│   ├── hooks/
│   ├── mocks/
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Login.jsx
│   │   └── NotFound.jsx
│   ├── services/
│   │   └── api.js
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── .dockerignore
├── .env.example
├── Dockerfile
├── nginx.conf
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── vite.config.js
```

## Identidade visual

As cores do Habita+ estão configuradas como tokens no `tailwind.config.js`.

| Token | Cor |
|---|---|
| `brand-mint` | `#AAFFC7` |
| `brand-green` | `#67C090` |
| `brand-teal` | `#215B63` |
| `brand-navy` | `#124170` |
| `danger` | `#D64545` |
| `muted` | `#687280` |
| `surface` | `#8FAFAC` |
| `ink` | `#172024` |

## Build de produção

Para gerar a versão de produção:

```bash
npm run build
```

Os arquivos compilados serão gerados no diretório `dist/`.

Para visualizar a versão compilada localmente:

```bash
npm run preview
```

## Docker

Execute os comandos abaixo dentro da pasta `frontend`.

### Construir a imagem

```bash
docker build \
  --build-arg VITE_API_URL=http://localhost:3000 \
  --build-arg VITE_USE_MOCKS=true \
  -t habitaplus-frontend .
```

### Executar o container

```bash
docker run --rm -p 8080:80 habitaplus-frontend
```

A aplicação ficará disponível em `http://localhost:8080/`.

O Nginx está configurado para encaminhar as rotas da aplicação para `index.html`, permitindo atualizar diretamente endereços como `/login` sem receber erro 404 do servidor.

As variáveis `VITE_API_URL` e `VITE_USE_MOCKS` são incorporadas durante o build. Para alterar seus valores na imagem de produção, construa uma nova imagem com os argumentos correspondentes.