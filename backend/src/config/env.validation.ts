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

  const chargeAmount = Number(env.CHARGE_AMOUNT ?? 650);
  if (
    !Number.isFinite(chargeAmount) ||
    chargeAmount <= 0 ||
    Math.abs(chargeAmount * 100 - Math.round(chargeAmount * 100)) > 1e-6
  ) {
    throw new Error(
      'CHARGE_AMOUNT deve ser um valor positivo com até duas casas decimais',
    );
  }

  const chargeDueDay = Number(env.CHARGE_DUE_DAY ?? 10);
  if (
    !Number.isInteger(chargeDueDay) ||
    chargeDueDay < 1 ||
    chargeDueDay > 28
  ) {
    throw new Error('CHARGE_DUE_DAY deve ser um inteiro entre 1 e 28');
  }

  return env;
}
