// Define as variáveis que precisam existir para conectar ao banco de dados.
const REQUIRED = ['DB_USER', 'DB_PASSWORD', 'DB_NAME'];

// Interrompe a inicialização se alguma configuração obrigatória estiver ausente.
export function validateEnv(
  env: Record<string, unknown>,
): Record<string, unknown> {
  const missing = REQUIRED.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Variaveis de ambiente faltando: ${missing.join(', ')}`);
  }
  return env;
}
