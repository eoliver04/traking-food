/**
 * Valores por defecto de entorno para los tests e2e.
 *
 * Se carga vía `setupFiles` (jest-e2e.json) ANTES de importar cualquier
 * módulo del test, de modo que `ConfigModule.forRoot({ validate })` en
 * AppModule encuentra las claves requeridas aunque no exista un `.env`.
 */
process.env.GEMINI_API = process.env.GEMINI_API ?? 'e2e-dummy';
process.env.FOOD_API = process.env.FOOD_API ?? 'e2e-dummy';
