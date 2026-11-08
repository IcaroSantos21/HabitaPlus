import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { AppConfig } from '../../config/configuration';
import {
  CheckoutCriado,
  CriarCheckoutInput,
  EventoPagamento,
  GatewayPagamento,
} from './interfaces/gateway-pagamento.interface';
import { STRIPE_CLIENT } from './stripe.constants';

const MOEDA = 'brl';

@Injectable()
export class PagamentoStripeGateway implements GatewayPagamento {
  private readonly logger = new Logger(PagamentoStripeGateway.name);

  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async criarCheckout(input: CriarCheckoutInput): Promise<CheckoutCriado> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: MOEDA,
              unit_amount: Math.round(input.valor * 100),
              product_data: { name: input.descricao },
            },
          },
        ],
        client_reference_id: input.cobrancaId.toString(),
        // Volta no webhook: é como ligamos o pagamento à cobrança e ao pagador.
        metadata: {
          cobrancaId: input.cobrancaId.toString(),
          pagadorId: input.pagadorId.toString(),
        },
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
      });
      if (!session.url) {
        throw new Error('A sessão do Stripe veio sem URL de pagamento');
      }
      return { url: session.url, sessionId: session.id };
    } catch (error) {
      // Loga só a mensagem: o objeto de erro do SDK pode carregar dados da requisição.
      this.logger.error(
        `Erro ao criar checkout da cobrança ${input.cobrancaId}: ${error instanceof Error ? error.message : 'erro desconhecido'}`,
      );
      throw new ServiceUnavailableException(
        'Não foi possível iniciar o pagamento agora. Tente novamente em instantes.',
      );
    }
  }

  // async para a assinatura inválida virar rejeição da Promise, não um throw síncrono.
  // eslint-disable-next-line @typescript-eslint/require-await
  async parseWebhook(
    rawBody: Buffer,
    signature: string,
  ): Promise<EventoPagamento> {
    const { webhookSecret } = this.config.get('stripe', { infer: true });

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch {
      throw new BadRequestException('Assinatura do webhook inválida.');
    }

    if (event.type !== 'checkout.session.completed') {
      return {
        tipo: 'EVENTO_IGNORADO',
        motivo: `evento ${event.type} não tratado`,
      };
    }

    const session = event.data.object;

    // Cartão confirma na hora; meios assíncronos chegam como "unpaid".
    if (session.payment_status !== 'paid') {
      return {
        tipo: 'EVENTO_IGNORADO',
        motivo: 'pagamento ainda não confirmado',
      };
    }

    const cobrancaId = Number(session.metadata?.cobrancaId);
    const pagadorId = Number(session.metadata?.pagadorId);
    if (!Number.isInteger(cobrancaId) || !Number.isInteger(pagadorId)) {
      return {
        tipo: 'EVENTO_IGNORADO',
        motivo: 'sessão sem metadados da cobrança',
      };
    }

    return {
      tipo: 'PAGAMENTO_CONFIRMADO',
      sessionId: session.id,
      cobrancaId,
      pagadorId,
      valor: (session.amount_total ?? 0) / 100,
    };
  }
}
