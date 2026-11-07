const REQUIRED_KEYS = ['GEMINI_API', 'FOOD_API'] as const;

/**
 * Valida las variables de entorno al arrancar la app.
 * Si falta algún valor requerido, la aplicación no arranca.
 */
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const errors: string[] = [];

  for (const key of REQUIRED_KEYS) {
    const value = config[key];
    if (typeof value !== 'string' || value.trim() === '') {
      errors.push(`${key} is missing or empty`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n  - ${errors.join('\n  - ')}`,
    );
  }

  // Defaults
  if (!config.GEMINI_MODEL) {
    config.GEMINI_MODEL = 'gemini-3.5-flash-lite';
  }

  // CORS_ORIGINS: lista separada por comas de orígenes web permitidos.
  // Vacía o ausente → CORS desactivado (solo clientes nativos).
  if (config.CORS_ORIGINS !== undefined && config.CORS_ORIGINS !== null) {
    if (typeof config.CORS_ORIGINS !== 'string') {
      throw new Error(
        'Environment validation failed:\n  - CORS_ORIGINS must be a comma-separated string',
      );
    }
    const invalid = parseCorsOrigins(config.CORS_ORIGINS).filter(
      (origin) => !/^https?:\/\/[^/\s]+$/.test(origin),
    );
    if (invalid.length > 0) {
      throw new Error(
        `Environment validation failed:\n  - CORS_ORIGINS contains invalid origins: ${invalid.join(', ')}`,
      );
    }
  }

  return config;
}

/** "http://a:8082, https://b.com" → ["http://a:8082", "https://b.com"] */
export function parseCorsOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter((origin) => origin !== '');
}
