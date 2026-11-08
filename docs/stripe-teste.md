# Pagamento de cobranças com Stripe (modo teste)

O projeto usa o Stripe **só em modo teste**. Não precisa de conta verificada, nenhum dinheiro real passa por aqui e o backend se recusa a subir com uma chave que não seja `sk_test_...`.

## Como o fluxo funciona

```
Morador -> POST /api/charges/:id/checkout -> API cria a Checkout Session -> devolve { url }
Morador paga na página do Stripe (cartão de teste)
Stripe -> POST /api/webhooks/stripe (checkout.session.completed) -> API marca a cobrança como PAGA
```

- A confirmação do pagamento vem **só do webhook**. A tela de sucesso do front apenas consulta a cobrança (`GET /api/charges/me`) para ver se já virou `PAGA`; ela não é prova de pagamento.
- Ao virar `PAGA`, a API lança a receita em `transacoes` na mesma operação (regra da BE-07).
- Reenvios do mesmo evento são seguros: o segundo não cria outra receita.

## 1. Pegar as chaves

1. Entre no [dashboard do Stripe](https://dashboard.stripe.com/test/apikeys) com o **modo de teste** ligado.
2. Copie a **Secret key** (`sk_test_...`).
3. O `STRIPE_WEBHOOK_SECRET` (`whsec_...`) sai do passo 3 abaixo.

## 2. Configurar o `.env` da raiz do repositório

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
# Opcionais (os valores abaixo são os padrões)
STRIPE_SUCCESS_URL=http://localhost:5173/success
STRIPE_CANCEL_URL=http://localhost:5173/cancel
```

O backend carrega o arquivo `.env` da raiz do repositório. Nunca commite essas
chaves. O backend acrescenta `?cobranca=<id>` às duas URLs de retorno.

## 3. Encaminhar os webhooks para a sua máquina

Instale o [Stripe CLI](https://docs.stripe.com/stripe-cli), faça `stripe login` e deixe rodando em um terminal:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

O CLI imprime `Your webhook signing secret is whsec_...`. Cole esse valor em `STRIPE_WEBHOOK_SECRET` e reinicie o backend. Esse segredo vale para o `stripe listen` da sua máquina; em outra máquina, ele será outro.

## 4. Testar o pagamento

1. Gere as cobranças do mês (como síndico): `POST /api/charges/generate?competencia=2026-11`.
2. Entre como morador que mora em uma unidade ocupada e pegue o `id` da cobrança em `GET /api/charges/me`.
3. Crie o checkout:

   ```bash
   curl -X POST http://localhost:3000/api/charges/ID/checkout \
     -H "Authorization: Bearer SEU_TOKEN"
   # {"url":"https://checkout.stripe.com/c/pay/cs_test_..."}
   ```
4. Abra a `url` no navegador e pague com:

   | Campo | Valor |
   |---|---|
   | Cartão | `4242 4242 4242 4242` |
   | Validade | qualquer data futura |
   | CVC | qualquer 3 dígitos |

5. No terminal do `stripe listen` aparece `checkout.session.completed` com resposta `200`. Confira `GET /api/charges/me`: a cobrança deve estar `PAGA`.

Para ver uma falha de pagamento, use o cartão `4000 0000 0000 0002` (recusado).

## 5. Verificar a assinatura inválida

```bash
curl -i -X POST http://localhost:3000/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=1,v1=invalida" \
  -d '{}'
# HTTP/1.1 400  {"message":"Assinatura do webhook inválida."}
```

## Respostas do `POST /api/charges/:id/checkout`

| Status | Quando |
|---|---|
| 201 | Sessão criada, corpo `{ "url": "..." }` |
| 400 | `id` não numérico |
| 401 | Sem login |
| 403 | Morador tentando pagar cobrança de outra unidade |
| 404 | Cobrança não existe |
| 409 | Cobrança já paga |
| 503 | Stripe indisponível |

Síndico e administrador podem iniciar o pagamento de qualquer cobrança. Quem paga fica registrado como autor da receita.

## Observações

- `stripe trigger checkout.session.completed` gera um evento de exemplo **sem** os metadados da nossa cobrança. A API responde `200` e ignora esse evento, que é o comportamento esperado.
- Ter um evento ignorado ou um valor divergente não gera erro HTTP para o Stripe não ficar reenviando; o motivo aparece no log do backend.
- Cada chamada ao checkout cria uma sessão nova e sobrescreve `stripeSessionId` da cobrança. Um pagamento feito em sessão anterior ainda é aceito, porque a cobrança é identificada pelos metadados assinados pelo Stripe.
