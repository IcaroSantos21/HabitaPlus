// Define as variáveis que precisam existir para conectar ao banco de dados.
const REQUIRED = ['DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];

// Interrompe a inicialização se alguma configuração obrigatória estiver ausente.
export function validateEnv(
  env: Record<string, unknown>,
): Record<string, unknown> {
  const missing = REQUIRED.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Variaveis de ambiente faltando: ${missing.join(', ')}`);
  }

  const expiresInSeconds = Number(env.JWT_EXPIRES_IN_SECONDS ?? 3600);
  if (!Number.isInteger(expiresInSeconds) || expiresInSeconds <= 0) {
    throw new Error('JWT_EXPIRES_IN_SECONDS deve ser um inteiro positivo');
  }

  return env;
}
