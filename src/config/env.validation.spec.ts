import { parseCorsOrigins, validateEnv } from './env.validation';

describe('validateEnv', () => {
  it('falla cuando falta GEMINI_API', () => {
    expect(() => validateEnv({ GEMINI_API: '', FOOD_API: 'usda-key' })).toThrow(
      /GEMINI_API/,
    );
  });

  it('falla cuando falta FOOD_API', () => {
    expect(() =>
      validateEnv({ GEMINI_API: 'gemini-key', FOOD_API: '   ' }),
    ).toThrow(/FOOD_API/);
  });

  it('falla cuando ambas claves están ausentes', () => {
    expect(() => validateEnv({})).toThrow(/GEMINI_API[\s\S]*- FOOD_API/);
  });

  it('con valores válidos aplica el default de GEMINI_MODEL', () => {
    const config = validateEnv({
      GEMINI_API: 'gemini-key',
      FOOD_API: 'usda-key',
    });

    expect(config.GEMINI_MODEL).toBe('gemini-3.5-flash-lite');
  });

  it('respeta GEMINI_MODEL si ya viene configurado', () => {
    const config = validateEnv({
      GEMINI_API: 'gemini-key',
      FOOD_API: 'usda-key',
      GEMINI_MODEL: 'gemini-2.5-flash-lite',
    });

    expect(config.GEMINI_MODEL).toBe('gemini-2.5-flash-lite');
  });
});

describe('CORS_ORIGINS', () => {
  const base = { GEMINI_API: 'g', FOOD_API: 'f' };

  it('acepta una lista separada por comas y la normaliza', () => {
    expect(
      parseCorsOrigins(' http://localhost:8082/, https://app.example.com '),
    ).toEqual(['http://localhost:8082', 'https://app.example.com']);
    expect(parseCorsOrigins(undefined)).toEqual([]);
    expect(parseCorsOrigins('')).toEqual([]);
  });

  it('valida que cada origen sea http(s)://host', () => {
    expect(() =>
      validateEnv({ ...base, CORS_ORIGINS: 'http://localhost:8082' }),
    ).not.toThrow();
    expect(() =>
      validateEnv({ ...base, CORS_ORIGINS: 'localhost:8082' }),
    ).toThrow(/CORS_ORIGINS contains invalid origins/);
    expect(() =>
      validateEnv({ ...base, CORS_ORIGINS: 'http://a.com/path' }),
    ).toThrow(/CORS_ORIGINS/);
  });
});
