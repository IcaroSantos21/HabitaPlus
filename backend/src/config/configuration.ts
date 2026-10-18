// Descreve as configurações tipadas usadas pelo backend.
export interface AppConfig {
  nodeEnv: string;
  port: number;
  corsOrigin: string;
  jwtSecret: string;
  jwtExpiresInSeconds: number;
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
  };
}

// Lê as variáveis de ambiente e fornece valores padrão para configurações opcionais.
export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtExpiresInSeconds: parseInt(
    process.env.JWT_EXPIRES_IN_SECONDS ?? '3600',
    10,
  ),
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    user: process.env.DB_USER ?? '',
    password: process.env.DB_PASSWORD ?? '',
    name: process.env.DB_NAME ?? '',
  },
});
