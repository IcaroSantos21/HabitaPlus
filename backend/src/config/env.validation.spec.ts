import { validateEnv } from './env.validation';

describe('validateEnv (configuração de cobranças)', () => {
  const base = {
    DB_USER: 'habita',
    DB_PASSWORD: 'senha',
    DB_NAME: 'habitaplus',
    JWT_SECRET: 'segredo',
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
