# syntax=docker/dockerfile:1

# Instala dependências em uma etapa separada para aproveitar o cache da imagem.
FROM node:24-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Compila o backend para produção.
FROM deps AS build
COPY . .
RUN npm run build

# Instala somente as dependências necessárias para executar o serviço.
FROM node:24-slim AS prod-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Monta a imagem final com o usuário sem privilégios e a aplicação compilada.
FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main"]