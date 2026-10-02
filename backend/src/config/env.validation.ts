const REQUIRED = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];

export function validateEnv(env: Record<string, unknown>): Record<string, unknown> {
    const missing = REQUIRED.filter((key) => !env[key]);
    if (missing.length > 0) {
        throw new Error(`Variaveis de ambiente faltando: ${missing.join(', ')}`);
    }
    return env;
}