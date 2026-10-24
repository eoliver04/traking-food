import sharp from 'sharp';
import { GoogleGenAI } from '@google/genai';
import { FoodRecognitionService } from './food-recognition.service';

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
}));

describe('FoodRecognitionService', () => {
  const generateContentMock = jest.fn();
  const googleGenAIConstructor = jest.mocked(
    GoogleGenAI,
  ) as unknown as jest.Mock;

  let service: FoodRecognitionService;
  let testImage: Buffer;

  beforeAll(async () => {
    // Generamos un JPEG real para pasar por sharp sin hacer peticiones reales
    testImage = await sharp({
      create: { width: 20, height: 20, channels: 3, background: 'red' },
    })
      .jpeg()
      .toBuffer();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    googleGenAIConstructor.mockImplementation(() => ({
      models: { generateContent: generateContentMock },
    }));

    const configService = {
      getOrThrow: jest.fn().mockReturnValue('gemini-test-key'),
      get: jest.fn().mockReturnValue('gemini-3.5-flash-lite'),
    } as never;

    service = new FoodRecognitionService(configService);
  });

  it('sanitiza los valores que devuelve Gemini (clamps y filtros)', async () => {
    generateContentMock.mockResolvedValue({
      text: JSON.stringify({
        foods: [
          {
            name: 'Patata',
            usdaQuery: 'roasted potato',
            estimatedGrams: 99999,
            confidence: 5,
          },
          {
            name: 'Sombra',
            usdaQuery: '',
            estimatedGrams: 50,
            confidence: 0.9,
          },
          {
            name: 'Vaso',
            usdaQuery: 'glass',
            estimatedGrams: -10,
            confidence: 0.5,
          },
        ],
      }),
    });

    const result = await service.identifyFoods(testImage);

    // Se pidió el modelo configurado
    expect(generateContentMock).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-3.5-flash-lite' }),
    );

    // 1er item clamped: gramos 2000, confianza 1
    expect(result.foods[0]).toMatchObject({
      name: 'Patata',
      usdaQuery: 'roasted potato',
      estimatedGrams: 2000,
      confidence: 1,
    });
    // Los items sin usdaQuery o con gramos <= 0 se descartan
    expect(result.foods).toHaveLength(1);
  });

  it('lanza error si Gemini devuelve respuesta vacía', async () => {
    generateContentMock.mockResolvedValue({ text: undefined });

    await expect(service.identifyFoods(testImage)).rejects.toThrow(
      'Gemini returned an empty response',
    );
  });
});
