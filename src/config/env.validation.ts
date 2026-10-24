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

  return config;
}
