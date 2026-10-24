import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import sharp from 'sharp';
import { AppModule } from '../src/app.module';
import { FoodRecognitionService } from 'src/food-recognition/food-recognition.service';
import { FoodIdentification } from 'src/food-recognition/dto/food-identification.dto';
import { NutritionAnalysisResult } from 'src/nutrition/nutrition-calculation.service';

// Fallback de variables de entorno para entornos sin .env (CI)
process.env.GEMINI_API = process.env.GEMINI_API ?? 'e2e-dummy';
process.env.FOOD_API = process.env.FOOD_API ?? 'e2e-dummy';

/**
 * Tests funcionales e2e de POST /food-analysis.
 *
 * Arrancan la app completa con Nest (controladores, validación, filtros,
 * cálculo nutricional reales) y mockean SOLO las fronteras externas:
 * - Gemini (FoodRecognitionService)
 * - USDA (fetch global)
 */
describe('FoodAnalysisController (e2e)', () => {
  let app: INestApplication<App>;
  let identifyFoodsMock: jest.Mock;

  const realFetch = globalThis.fetch;
  let usdaFetchMock: jest.Mock;

  let identification: FoodIdentification;

  const jpegImage = async (): Promise<Buffer> =>
    sharp({
      create: { width: 32, height: 32, channels: 3, background: 'red' },
    })
      .jpeg()
      .toBuffer();

  /** Construye la respuesta simulada de la USDA para un query dado */
  const usdaResponse = (
    foods: Array<Record<string, unknown>>,
  ): Record<string, unknown> => ({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ foods }),
  });

  const USDA_FIXTURES: Record<string, Array<Record<string, unknown>>> = {
    'chicken cooked': [
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
    'rice cooked': [
      {
        fdcId: 20444,
        description: 'Rice, white, long-grain, cooked',
        foodNutrients: [
          { nutrientName: 'Energy', value: 130 },
          { nutrientName: 'Protein', value: 3 },
          { nutrientName: 'Carbohydrate, by difference', value: 28 },
          { nutrientName: 'Total lipid (fat)', value: 1 },
        ],
      },
    ],
    'sauce with meat': [
      {
        fdcId: 999,
        description: 'Sauce, homemade',
        // Sin nutrientKey Energy → obliga al fallback Atwater
        foodNutrients: [
          { nutrientName: 'Protein', value: 5 },
          { nutrientName: 'Carbohydrate, by difference', value: 10 },
          { nutrientName: 'Total lipid (fat)', value: 8 },
        ],
      },
    ],
  };

  const handleUsdaRequest = (fetchInput: unknown): unknown => {
    const url =
      typeof fetchInput === 'string' ? fetchInput : (fetchInput as Request).url;
    const query = new URL(url).searchParams.get('query') ?? '';
    const fixture = USDA_FIXTURES[query];

    if (fixture) {
      return usdaResponse(fixture);
    }
    return usdaResponse([]);
  };

  beforeAll(() => {
    usdaFetchMock = jest.fn(handleUsdaRequest);
    globalThis.fetch = usdaFetchMock;

    identifyFoodsMock = jest.fn((): FoodIdentification => identification);
  });

  beforeEach(async () => {
    // App nueva por test => storage del rate limiter fresco
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FoodRecognitionService)
      .useValue({ identifyFoods: identifyFoodsMock })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    usdaFetchMock.mockClear();
    identifyFoodsMock.mockClear();
    identification = { foods: [] };
  });

  afterEach(async () => {
    await app?.close();
  });

  afterAll(() => {
    globalThis.fetch = realFetch;
  });

  it('analiza la foto completa: identifica, consulta USDA y calcula totales', async () => {
    identification = {
      foods: [
        {
          name: 'Pechuga de pollo',
          usdaQuery: 'chicken cooked',
          estimatedGrams: 200,
          confidence: 0.9,
        },
        {
          name: 'Arroz',
          usdaQuery: 'rice cooked',
          estimatedGrams: 100,
          confidence: 0.8,
        },
      ],
    };

    const res = await request(app.getHttpServer())
      .post('/food-analysis')
      .attach('image', await jpegImage(), {
        filename: 'plato.jpg',
        contentType: 'image/jpeg',
      })
      .expect(200);

    // Se consultó USDA por cada alimento
    const usdaQueries = (usdaFetchMock.mock.calls as unknown[][]).map(
      (call) => String(call[0]).match(/query=([^&]*)/)?.[1] ?? '',
    );
    expect(usdaQueries).toContain('chicken+cooked');
    expect(usdaQueries).toContain('rice+cooked');

    expect(res.body).toMatchObject({
      foods: [
        {
          name: 'Pechuga de pollo',
          usdaMatch: 'Chicken, broilers, breast, meat, cooked',
          fdcId: 171505,
          grams: 200,
          calories: 300, // 150 kcal/100g * 200g
          protein: 54, // 27 * 2
          carbohydrates: 0,
          fat: 10, // 5 * 2
        },
        {
          name: 'Arroz',
          usdaMatch: 'Rice, white, long-grain, cooked',
          fdcId: 20444,
          grams: 100,
          calories: 130,
          protein: 3,
          carbohydrates: 28,
          fat: 1,
        },
      ],
      totals: {
        calories: 430,
        protein: 57,
        carbohydrates: 28,
        fat: 11,
      },
    });
  });

  it('usa el fallback Atwater cuando la USDA no trae Energía', async () => {
    identification = {
      foods: [
        {
          name: 'Salsa de carne',
          usdaQuery: 'sauce with meat',
          estimatedGrams: 100,
          confidence: 0.6,
        },
      ],
    };

    const res = await request(app.getHttpServer())
      .post('/food-analysis')
      .attach('image', await jpegImage(), {
        filename: 'plato.jpg',
        contentType: 'image/jpeg',
      })
      .expect(200);

    // Atwater: 5*4 + 10*4 + 8*9 = 132
    const body = res.body as NutritionAnalysisResult;
    expect(body.foods[0]).toMatchObject({
      usdaMatch: 'Sauce, homemade',
      calories: 132,
      protein: 5,
      carbohydrates: 10,
      fat: 8,
    });
  });

  it('clamp de grams y confidence que devuelve el modelo', async () => {
    identification = {
      foods: [
        {
          name: 'Patata',
          usdaQuery: 'roasted potato',
          estimatedGrams: 99999,
          confidence: 42,
        },
      ],
    };

    const res = await request(app.getHttpServer())
      .post('/food-analysis')
      .attach('image', await jpegImage(), {
        filename: 'plato.jpg',
        contentType: 'image/jpeg',
      })
      .expect(200);

    const body = res.body as NutritionAnalysisResult;
    expect(body.foods[0].grams).toBe(2000);
  });

  it('devuelve 200 con totals en cero si no hay alimentos identificados', async () => {
    identification = { foods: [] };

    const res = await request(app.getHttpServer())
      .post('/food-analysis')
      .attach('image', await jpegImage(), {
        filename: 'plato.jpg',
        contentType: 'image/jpeg',
      })
      .expect(200);

    expect(res.body).toEqual({
      foods: [],
      totals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0 },
    });
    expect(usdaFetchMock).not.toHaveBeenCalled();
  });

  it('devuelve zeros y usdaMatch null si la USDA no encuentra el alimento', async () => {
    identification = {
      foods: [
        {
          name: 'Platillo exótico',
          usdaQuery: 'unknown exotic dish',
          estimatedGrams: 150,
          confidence: 0.4,
        },
      ],
    };

    const res = await request(app.getHttpServer())
      .post('/food-analysis')
      .attach('image', await jpegImage(), {
        filename: 'plato.jpg',
        contentType: 'image/jpeg',
      })
      .expect(200);

    const body = res.body as NutritionAnalysisResult;
    expect(body.foods[0]).toMatchObject({
      name: 'Platillo exótico',
      usdaMatch: null,
      fdcId: null,
      grams: 150,
      calories: 0,
    });
  });

  it('rechaza la petición sin imagen (400)', async () => {
    const res = await request(app.getHttpServer())
      .post('/food-analysis')
      .expect(400);

    expect(res.body).toMatchObject({
      statusCode: 400,
      message: 'Image is required',
    });
    expect(identifyFoodsMock).not.toHaveBeenCalled();
  });

  it('rechaza archivos que no son imagen (400)', async () => {
    const res = await request(app.getHttpServer())
      .post('/food-analysis')
      .attach('image', Buffer.from('texto plano'), {
        filename: 'nota.txt',
        contentType: 'text/plain',
      })
      .expect(400);

    const errorBody = res.body as { message: string };
    expect(errorBody.message).toContain('Unsupported file type "text/plain"');
    expect(identifyFoodsMock).not.toHaveBeenCalled();
  });

  it('rechaza imágenes mayores a 5 MB (413)', async () => {
    const bigJpeg = Buffer.alloc(6 * 1024 * 1024);

    await request(app.getHttpServer())
      .post('/food-analysis')
      .attach('image', bigJpeg, {
        filename: 'big.jpg',
        contentType: 'image/jpeg',
      })
      .expect(413);

    expect(identifyFoodsMock).not.toHaveBeenCalled();
  });

  it('devuelve 500 con formato consistente si Gemini falla', async () => {
    identifyFoodsMock.mockRejectedValueOnce(
      new Error('Gemini is temporarily unavailable'),
    );

    const res = await request(app.getHttpServer())
      .post('/food-analysis')
      .attach('image', await jpegImage(), {
        filename: 'plato.jpg',
        contentType: 'image/jpeg',
      })
      .expect(500);

    expect(res.body).toEqual(
      expect.objectContaining({
        statusCode: 500,
        path: '/food-analysis',
      }),
    );
  });

  // La rechazo de imágenes corruptas se cubre en
  // src/image-processing/normalized-image.spec.ts porque la normalización
  // vive dentro de FoodRecognitionService, que aquí está mockeado.

  describe('identificación (IdentifiedFood)', () => {
    it('no rompe la última referencia: identification se lee al momento de la llamada', async () => {
      identification = {
        foods: [
          {
            name: 'Huevo',
            usdaQuery: 'fried egg',
            estimatedGrams: 50,
            confidence: 0.85,
          },
        ],
      };

      const res = await request(app.getHttpServer())
        .post('/food-analysis')
        .attach('image', await jpegImage(), {
          filename: 'plato.jpg',
          contentType: 'image/jpeg',
        })
        .expect(200);

      const body = res.body as NutritionAnalysisResult;
      expect(body.foods).toHaveLength(1);
      expect(body.foods[0].name).toBe('Huevo');
    });
  });
});
