import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { AppConfig } from '../../config/configuration';
import { PAGAMENTO_GATEWAY } from './interfaces/gateway-pagamento.interface';
import { PagamentoStripeGateway } from './pagamento-stripe.gateway';
import { STRIPE_CLIENT } from './stripe.constants';

@Module({
  providers: [
    {
      provide: STRIPE_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) =>
        new Stripe(config.get('stripe', { infer: true }).secretKey, {
          timeout: 10_000,
          maxNetworkRetries: 1,
        }),
    },
    { provide: PAGAMENTO_GATEWAY, useClass: PagamentoStripeGateway },
  ],
  exports: [PAGAMENTO_GATEWAY],
})
export class PagamentosModule {}
