# Rodando o Habita+ localmente (com pagamento Stripe)

Este guia leva do repositório recém-clonado até um pagamento de teste confirmado de ponta a ponta: front, backend, banco e webhook do Stripe. O Stripe é usado só em modo teste, então nenhum dinheiro real passa por aqui.

O pagamento não depende do `ml-service`. Ele só é necessário para as previsões e o assistente.

## O que você precisa

- Node.js 24 e npm
- Docker com Compose v2 (só para o Postgres)
- [Stripe CLI](https://docs.stripe.com/stripe-cli) instalado
- Uma conta Stripe com o **modo de teste** ligado

## 1. Configurar o `.env` da raiz

O backend lê o `.env` da **raiz do repositório**, não o de `backend/`.

```bash
cp .env.example .env
```

Ajuste os valores:

```env
DB_HOST=localhost
DB_USER=habita
DB_PASSWORD=uma_senha_sua
DB_NAME=habitaplus
DB_SSL=false
JWT_SECRET=uma_chave_longa_e_aleatoria
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

- `DB_SSL=false` é para o Postgres local. O `true` do exemplo é para bancos na nuvem, como o Neon.
- `STRIPE_SECRET_KEY` vem de [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys). O backend se recusa a subir com chave que não comece com `sk_test_`.
- `STRIPE_WEBHOOK_SECRET` você só descobre no passo 4. Por enquanto pode deixar um valor começando com `whsec_`.

## 2. Subir o banco, rodar as migrations e o seed

```bash
docker compose up -d postgres
cd backend
npm install
npm run migration:run
npm run seed
```

No final, o seed imprime no terminal as contas de demonstração (admin, síndico e moradores). Anote as credenciais, você vai precisar delas.

## 3. Abrir o Stripe CLI

Em um terminal separado, deixe rodando durante todo o teste:

```bash
stripe login        # só na primeira vez
stripe listen --events checkout.session.completed --forward-to localhost:3000/api/webhooks/stripe
```

O CLI imprime algo como `Your webhook signing secret is whsec_...`. Copie esse valor.

> O `stripe listen` só encaminha eventos enquanto está aberto. Um pagamento feito antes dele subir se perde e a cobrança continua pendente.

## 4. Colocar o segredo do webhook e subir o backend

Cole o `whsec_...` em `STRIPE_WEBHOOK_SECRET` no `.env` da raiz e inicie o backend:

```bash
cd backend
npm run start:dev
```

O modo `--watch` recarrega o código, mas **não relê o `.env`**. Sempre que mudar uma variável, pare e suba o backend de novo.

O segredo do `stripe listen` vale para a sua máquina. Em outra máquina, ou depois de um novo `stripe login`, ele pode ser outro.

## 5. Subir o frontend sem mocks

Crie o `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000
VITE_USE_MOCKS=false
```

```bash
cd frontend
npm install
npm run dev
```

Abra `http://localhost:5173`. Essa porta importa: ela é o padrão do CORS do backend e das URLs de retorno do Stripe (`/success` e `/cancel`).

Com `VITE_USE_MOCKS=true`, o MSW intercepta as chamadas e simula o pagamento no navegador. Nada chega ao backend nem ao Stripe. Depois de mudar essa variável, reinicie o Vite.

## 6. Testar o pagamento

1. Entre como **síndico** e vá em **Cobranças**. Clique em "Gerar cobranças do mês" com a competência atual.
2. Saia e entre como **morador** de uma unidade com vínculo. Só unidades ocupadas recebem cobrança. Se um morador não vê nada, tente outro.
3. Clique em **Pagar**. Você vai para o `checkout.stripe.com`.
4. Pague com o cartão de teste:

   | Campo | Valor |
   |---|---|
   | Cartão | `4242 4242 4242 4242` |
   | Validade | qualquer data futura |
   | CVC | qualquer 3 dígitos |

   Para simular recusa, use `4000 0000 0000 0002`.
5. O Stripe devolve para `/success?cobranca=ID`. A tela consulta o status por alguns segundos e mostra "Pagamento confirmado".

### Como saber que funcionou

- No terminal do `stripe listen`: `checkout.session.completed` com resposta `[200]`.
- No log do backend: `Cobrança X marcada como paga via webhook`.
- Em **Cobranças**: o status passa para **Paga**.
- Como síndico, em **Receitas e despesas**: aparece uma receita nova na categoria "taxa condominial".

A confirmação vem **só do webhook**. A tela de sucesso apenas consulta a cobrança e não é prova de pagamento.

## Se algo der errado

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Botão Pagar não leva ao Stripe | Front ainda com mocks | `VITE_USE_MOCKS=false` e reiniciar o Vite |
| Voltou para `/success` mas continua "Pendente" e o `stripe listen` não mostrou nada | O CLI está escutando outra conta do Stripe, ou o pagamento foi feito antes de ele subir | Rode `stripe listen --api-key sk_test_... --events checkout.session.completed --forward-to ...` com a mesma chave do `.env`, atualize o `whsec_` e reinicie o backend |
| `[400]` no `stripe listen` | `STRIPE_WEBHOOK_SECRET` diferente do impresso pelo CLI, ou backend não reiniciado | Copiar o segredo de novo e reiniciar o backend |
| `[200]` no listen, mas a cobrança segue pendente | O backend ignorou ou recusou o evento | Ver o motivo no log: "sessão sem metadados", "pagamento ainda não confirmado", "Valor divergente" ou "Cobrança não encontrada" |
| `must specify events to forward` | Versões novas do CLI exigem `--events` | Usar o comando do passo 3 |
| Backend não sobe | Variável obrigatória ausente ou inválida | A mensagem de erro diz qual (`DB_*`, `JWT_SECRET`, `STRIPE_*`) |
| Erro de conexão com o banco | `DB_SSL=true` com Postgres local | Usar `DB_SSL=false` |

### Conferindo o webhook sem passar pelo front

Com o `stripe listen` aberto:

```bash
stripe trigger checkout.session.completed
```

O listen deve mostrar `[200]` e o backend registra "Webhook ignorado: sessão sem metadados da cobrança". É o comportamento esperado, porque o evento de exemplo não traz os dados de uma cobrança nossa. Serve só para confirmar que o caminho do webhook está de pé.

## Observação sobre o Docker Compose completo

Este guia usa o Compose apenas para o Postgres. O `docker compose up` completo ainda não repassa as variáveis `STRIPE_*` ao container do backend, então o backend não sobe por esse caminho até o `docker-compose.yml` ser ajustado. Enquanto isso, use o fluxo acima.