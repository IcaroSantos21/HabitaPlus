import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { AppConfig } from '../../config/configuration';
import { PagamentoStripeGateway } from './pagamento-stripe.gateway';

const WEBHOOK_SECRET = 'whsec_segredo_de_teste';

describe('PagamentoStripeGateway', () => {
  const create = jest.fn();
  // Cliente real só para assinar/validar webhooks (não faz chamada de rede).
  const stripeReal = new Stripe('sk_test_nao_usado');
  const stripe = {
    checkout: { sessions: { create } },
    webhooks: stripeReal.webhooks,
  } as unknown as Stripe;
  const config = {
    get: () => ({ webhookSecret: WEBHOOK_SECRET }),
  } as unknown as ConfigService<AppConfig, true>;

  let gateway: PagamentoStripeGateway;

  beforeEach(() => {
    jest.resetAllMocks();
    gateway = new PagamentoStripeGateway(stripe, config);
  });

  function assinar(payload: string, segredo = WEBHOOK_SECRET): string {
    return stripeReal.webhooks.generateTestHeaderString({
      payload,
      secret: segredo,
    });
  }

  function eventoCheckout(
    sessao: Record<string, unknown>,
    tipo = 'checkout.session.completed',
  ): string {
    return JSON.stringify({
      id: 'evt_1',
      object: 'event',
      type: tipo,
      data: {
        object: { id: 'cs_test_1', object: 'checkout.session', ...sessao },
      },
    });
  }

  describe('criarCheckout', () => {
    const input = {
      cobrancaId: 10,
      pagadorId: 1,
      descricao: 'Taxa condominial - bloco B, unidade 302',
      valor: 650.5,
      successUrl: 'http://localhost:5173/pagamento/sucesso?cobranca=10',
      cancelUrl: 'http://localhost:5173/pagamento/cancelado?cobranca=10',
    };

    it('deve criar a sessão em centavos, em BRL, com os metadados da cobrança', async () => {
      create.mockResolvedValue({ id: 'cs_test_1', url: 'https://stripe/pay' });

      const resultado = await gateway.criarCheckout(input);

      expect(resultado).toEqual({
        url: 'https://stripe/pay',
        sessionId: 'cs_test_1',
      });
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          client_reference_id: '10',
          metadata: { cobrancaId: '10', pagadorId: '1' },
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: 'brl',
                unit_amount: 65050,
                product_data: { name: input.descricao },
              },
            },
          ],
        }),
      );
    });

    it('deve arredondar valores que geram erro de ponto flutuante (19.99 -> 1999)', async () => {
      create.mockResolvedValue({ id: 'cs_test_1', url: 'https://stripe/pay' });

      await gateway.criarCheckout({ ...input, valor: 19.99 });

      const [params] = create.mock.calls[0] as [
        { line_items: { price_data: { unit_amount: number } }[] },
      ];
      expect(params.line_items[0].price_data.unit_amount).toBe(1999);
    });

    it('deve responder 503 em português quando o Stripe falha', async () => {
      create.mockRejectedValue(new Error('rede fora do ar'));

      const chamada = gateway.criarCheckout(input);

      await expect(chamada).rejects.toThrow(ServiceUnavailableException);
      await expect(chamada).rejects.toThrow(
        'Não foi possível iniciar o pagamento agora. Tente novamente em instantes.',
      );
    });

    it('deve responder 503 quando a sessão vem sem URL', async () => {
      create.mockResolvedValue({ id: 'cs_test_1', url: null });

      await expect(gateway.criarCheckout(input)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('parseWebhook', () => {
    const sessaoPaga = {
      payment_status: 'paid',
      amount_total: 65000,
      metadata: { cobrancaId: '10', pagadorId: '1' },
    };

    it('deve converter checkout.session.completed pago em PAGAMENTO_CONFIRMADO', async () => {
      const corpo = eventoCheckout(sessaoPaga);

      await expect(
        gateway.parseWebhook(Buffer.from(corpo), assinar(corpo)),
      ).resolves.toEqual({
        tipo: 'PAGAMENTO_CONFIRMADO',
        sessionId: 'cs_test_1',
        cobrancaId: 10,
        pagadorId: 1,
        valor: 650,
      });
    });

    it('deve rejeitar assinatura inválida com 400', async () => {
      const corpo = eventoCheckout(sessaoPaga);
      const assinaturaErrada = assinar(corpo, 'whsec_outro_segredo');

      await expect(
        gateway.parseWebhook(Buffer.from(corpo), assinaturaErrada),
      ).rejects.toThrow(
        new BadRequestException('Assinatura do webhook inválida.'),
      );
    });

    it('deve rejeitar corpo adulterado depois de assinado', async () => {
      const corpo = eventoCheckout(sessaoPaga);
      const adulterado = corpo.replace('65000', '100');

      await expect(
        gateway.parseWebhook(Buffer.from(adulterado), assinar(corpo)),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve rejeitar assinatura mal formada', async () => {
      const corpo = eventoCheckout(sessaoPaga);

      await expect(
        gateway.parseWebhook(Buffer.from(corpo), 'lixo'),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve ignorar eventos de outros tipos', async () => {
      const corpo = eventoCheckout(sessaoPaga, 'charge.refunded');

      await expect(
        gateway.parseWebhook(Buffer.from(corpo), assinar(corpo)),
      ).resolves.toMatchObject({ tipo: 'EVENTO_IGNORADO' });
    });

    it('deve ignorar sessão concluída mas ainda não paga', async () => {
      const corpo = eventoCheckout({ ...sessaoPaga, payment_status: 'unpaid' });

      await expect(
        gateway.parseWebhook(Buffer.from(corpo), assinar(corpo)),
      ).resolves.toMatchObject({
        tipo: 'EVENTO_IGNORADO',
        motivo: 'pagamento ainda não confirmado',
      });
    });

    it.each([
      ['sem metadados', undefined],
      ['com cobrancaId não numérico', { cobrancaId: 'abc', pagadorId: '1' }],
      ['sem pagadorId', { cobrancaId: '10' }],
    ])('deve ignorar sessão %s', async (_caso, metadata) => {
      const corpo = eventoCheckout({ ...sessaoPaga, metadata });

      await expect(
        gateway.parseWebhook(Buffer.from(corpo), assinar(corpo)),
      ).resolves.toMatchObject({ tipo: 'EVENTO_IGNORADO' });
    });
  });
});
