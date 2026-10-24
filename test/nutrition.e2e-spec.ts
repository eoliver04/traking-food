import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

// Fallback de variables de entorno para entornos sin .env (CI)
process.env.GEMINI_API = process.env.GEMINI_API ?? 'e2e-dummy';
process.env.FOOD_API = process.env.FOOD_API ?? 'e2e-dummy';

/**
 * Tests funcionales e2e de GET /nutrition/search.
 * Arranca la app completa y mockea SOLO la USDA (fetch global).
 */
describe('NutritionController (e2e)', () => {
  let app: INestApplication<App>;

  const realFetch = globalThis.fetch;
  let usdaFetchMock: jest.Mock;

  const usdaResponse = (body: unknown): Record<string, unknown> => ({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  });

  beforeAll(() => {
    usdaFetchMock = jest.fn((fetchInput: unknown) => {
      const url =
        typeof fetchInput === 'string'
          ? fetchInput
          : (fetchInput as Request).url;

      const query = new URL(url).searchParams.get('query') ?? '';

      if (query.includes('chicken')) {
        return usdaResponse({
          foods: [
            {
              fdcId: 171505,
              description: 'Chicken, broilers, breast, meat, cooked',
              foodNutrients: [
                { nutrientName: 'Energy', value: 150 },
                { nutrientName: 'Protein', value: 27 },
                { nutrientName: 'Carbohydrate, by difference', value: 0 },
                { nutrientName: 'Total lipid (fat)', value: 5 },
              ],
            },
          ],
        });
      }

      return usdaResponse({ foods: [] });
    });
    globalThis.fetch = usdaFetchMock;
  });

  afterAll(() => {
    globalThis.fetch = realFetch;
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    usdaFetchMock.mockClear();
  });

  afterEach(async () => {
    await app?.close();
  });

  it('busca y mapea los macros de la USDA', async () => {
    const res = await request(app.getHttpServer())
      .get('/nutrition/search?foodName=chicken')
      .expect(200);

    expect(res.body).toEqual([
      {
        fdcId: 171505,
        name: 'Chicken, broilers, breast, meat, cooked',
        calories: 150,
        protein: 27,
        carbohydrates: 0,
        fat: 5,
      },
    ]);

    // Solo consulta la USDA una vez (match en intento estricto)
    expect(usdaFetchMock).toHaveBeenCalledTimes(1);
  });

  it('devuelve una lista vacía si el foodName queda vacío', async () => {
    await request(app.getHttpServer())
      .get('/nutrition/search?foodName=')
      .expect(200)
      .expect([]);

    expect(usdaFetchMock).not.toHaveBeenCalled();
  });

  it('devuelve [] (sin romper) cuando la USDA no tiene resultados', async () => {
    const res = await request(app.getHttpServer())
      .get('/nutrition/search?foodName=unknownfood')
      .expect(200);

    expect(res.body).toEqual([]);
    // Intento estricto + fallback amplio
    expect(usdaFetchMock).toHaveBeenCalledTimes(2);
  });

  it('devuelve [] (sin 500) cuando la USDA responde con error', async () => {
    usdaFetchMock.mockImplementation(
      // Degradación controlada ante upstream caído
      () => ({ ok: false, status: 500, json: () => Promise.resolve({}) }),
    );

    const res = await request(app.getHttpServer())
      .get('/nutrition/search?foodName=chicken')
      .expect(200);

    expect(res.body).toEqual([]);
  });
});
