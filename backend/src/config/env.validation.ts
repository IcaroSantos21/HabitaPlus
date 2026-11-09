// Define as variáveis que precisam existir para conectar ao banco de dados.
const REQUIRED = [
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
];

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

  // Escopo do projeto: só modo teste. Barrar chave live evita cobrança real por engano.
  const stripeKey =
    typeof env.STRIPE_SECRET_KEY === 'string' ? env.STRIPE_SECRET_KEY : '';
  if (!/^(sk|rk)_test_/.test(stripeKey)) {
    throw new Error(
      'STRIPE_SECRET_KEY deve ser uma chave de teste válida do Stripe',
    );
  }
  if (
    typeof env.STRIPE_WEBHOOK_SECRET !== 'string' ||
    !env.STRIPE_WEBHOOK_SECRET.startsWith('whsec_')
  ) {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET deve ser uma chave de webhook do Stripe (começa com whsec_)',
    );
  }
  for (const nome of ['STRIPE_SUCCESS_URL', 'STRIPE_CANCEL_URL']) {
    const valor = env[nome];
    if (
      valor !== undefined &&
      !(typeof valor === 'string' && URL.canParse(valor))
    ) {
      throw new Error(`${nome} deve ser uma URL válida`);
    }
  }
  return env;
}