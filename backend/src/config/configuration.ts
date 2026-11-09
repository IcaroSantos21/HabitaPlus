
// Descreve as configurações tipadas usadas pelo backend.
export interface AppConfig {
  nodeEnv: string;
  port: number;
  corsOrigin: string;
  jwtSecret: string;
  jwtExpiresInSeconds: number;

  charges: {
    valorPadrao: number;
    diaVencimento: number;
  };

  stripe: {
    secretKey: string;
    webhookSecret: string;
    successUrl: string;
    cancelUrl: string;
  };

  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
  };

  mlService: {
    url: string;
  };
}

// Lê as variáveis de ambiente e fornece valores padrão.
export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',

  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtExpiresInSeconds: parseInt(
    process.env.JWT_EXPIRES_IN_SECONDS ?? '3600',
    10,
  ),

  charges: {
    valorPadrao: Number(process.env.CHARGE_AMOUNT ?? 650),
    diaVencimento: parseInt(process.env.CHARGE_DUE_DAY ?? '10', 10),
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
    successUrl:
      process.env.STRIPE_SUCCESS_URL ?? 'http://localhost:5173/success',
    cancelUrl:
      process.env.STRIPE_CANCEL_URL ?? 'http://localhost:5173/cancel',
  },

  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    user: process.env.DB_USER ?? '',
    password: process.env.DB_PASSWORD ?? '',
    name: process.env.DB_NAME ?? '',
  },

  mlService: {
    url: process.env.ML_SERVICE_URL ?? 'http://127.0.0.1:8000',
  },
});
