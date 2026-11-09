import { validateEnv } from './env.validation';

describe('validateEnv (configuração de cobranças)', () => {
  const base = {
    DB_USER: 'habita',
    DB_PASSWORD: 'senha',
    DB_NAME: 'habitaplus',
    JWT_SECRET: 'segredo',
    STRIPE_SECRET_KEY: 'sk_test_abc123',
    STRIPE_WEBHOOK_SECRET: 'whsec_abc123',
  };

  it('deve aceitar o ambiente sem as variáveis de cobrança (usa os padrões)', () => {
    expect(() => validateEnv(base)).not.toThrow();
  });

  it.each(['650', '19.99', '0.07', '1200.5'])(
    'deve aceitar CHARGE_AMOUNT=%s',
    (valor) => {
      expect(() =>
        validateEnv({ ...base, CHARGE_AMOUNT: valor }),
      ).not.toThrow();
    },
  );

  it.each(['0', '-10', 'abc', '10.999'])(
    'deve rejeitar CHARGE_AMOUNT=%s',
    (valor) => {
      expect(() => validateEnv({ ...base, CHARGE_AMOUNT: valor })).toThrow(
        'CHARGE_AMOUNT',
      );
    },
  );

  it.each(['1', '10', '28'])('deve aceitar CHARGE_DUE_DAY=%s', (dia) => {
    expect(() => validateEnv({ ...base, CHARGE_DUE_DAY: dia })).not.toThrow();
  });

  it.each(['0', '29', '31', '5.5', 'x'])(
    'deve rejeitar CHARGE_DUE_DAY=%s',
    (dia) => {
      expect(() => validateEnv({ ...base, CHARGE_DUE_DAY: dia })).toThrow(
        'CHARGE_DUE_DAY',
      );
    },
  );
});

describe('validateEnv (Stripe em modo teste)', () => {
  const base = {
    DB_USER: 'habita',
    DB_PASSWORD: 'senha',
    DB_NAME: 'habitaplus',
    JWT_SECRET: 'segredo',
    STRIPE_SECRET_KEY: 'sk_test_abc123',
    STRIPE_WEBHOOK_SECRET: 'whsec_abc123',
  };

  it.each(['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'])(
    'deve exigir %s',
    (chave) => {
      expect(() => validateEnv({ ...base, [chave]: undefined })).toThrow(chave);
    },
  );

  it.each(['sk_live_abc123', 'abc123', 'pk_test_abc123'])(
    'deve rejeitar chave secreta fora do modo teste (%s)',
    (chave) => {
      expect(() => validateEnv({ ...base, STRIPE_SECRET_KEY: chave })).toThrow(
        'chave de teste',
      );
    },
  );

  it('deve rejeitar segredo de webhook fora do formato whsec_', () => {
    expect(() =>
      validateEnv({ ...base, STRIPE_WEBHOOK_SECRET: 'segredo' }),
    ).toThrow('whsec_');
  });

  it.each(['STRIPE_SUCCESS_URL', 'STRIPE_CANCEL_URL'])(
    'deve rejeitar %s que não seja URL',
    (chave) => {
      expect(() => validateEnv({ ...base, [chave]: 'nao-e-url' })).toThrow(
        chave,
      );
    },
  );

  it('deve aceitar URLs de retorno válidas', () => {
    expect(() =>
      validateEnv({
        ...base,
        STRIPE_SUCCESS_URL: 'http://localhost:5173/pagamento/sucesso',
        STRIPE_CANCEL_URL: 'http://localhost:5173/pagamento/cancelado',
      }),
    ).not.toThrow();
  });
});
