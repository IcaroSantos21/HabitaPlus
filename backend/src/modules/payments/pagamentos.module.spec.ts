import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import configuration from '../../config/configuration';
import { PAGAMENTO_GATEWAY } from './interfaces/gateway-pagamento.interface';
import { PagamentosModule } from './pagamentos.module';
import { PagamentoStripeGateway } from '../payments/pagamento-stripe.gateway';

describe('PaymentsModule', () => {
  const ambiente = { ...process.env };

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_nao_usado';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_nao_usado';
  });

  afterEach(() => {
    process.env = { ...ambiente };
  });

  it('deve entregar o gateway do Stripe quando alguém pede PAYMENT_GATEWAY', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
        PagamentosModule,
      ],
    }).compile();

    expect(moduleRef.get(PAGAMENTO_GATEWAY)).toBeInstanceOf(
      PagamentoStripeGateway,
    );
  });
});
