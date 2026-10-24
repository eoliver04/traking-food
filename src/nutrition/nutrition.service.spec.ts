import { ConfigService } from '@nestjs/config';
import { NutritionService } from './nutrition.service';

describe('NutritionService', () => {
  let service: NutritionService;
  let configService: ConfigService;
  let fetchMock: jest.Mock<(...args: unknown[]) => Promise<unknown>>;

  beforeEach(() => {
    configService = {
      getOrThrow: jest.fn().mockReturnValue('usda-test-key'),
    } as unknown as ConfigService;
    service = new NutritionService(configService);

    fetchMock = jest.fn() as jest.Mock<
      (...args: unknown[]) => Promise<unknown>
    >;
    (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;
  });

  afterEach(() => {
    (globalThis as unknown as { fetch: unknown }).fetch = fetch;
  });

  it('devuelve [] si el query está vacío o desconocido', async () => {
    expect(await service.getNutritionData('')).toEqual([]);
    expect(await service.getNutritionData('desconocido')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('mapea correctamente los nutrientes de la respuesta USDA', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          foods: [
            {
              fdcId: 42,
              description: 'Chicken, broilers, meat, cooked',
              foodNutrients: [
                { nutrientName: 'Energy', value: 195 },
                { nutrientName: 'Protein', value: 27 },
                {
                  nutrientName: 'Carbohydrate, by difference',
                  value: 0,
                },
                { nutrientName: 'Total lipid (fat)', value: 8 },
              ],
            },
          ],
        }),
    });

    const results = await service.getNutritionData('chicken cooked');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = (fetchMock.mock.calls[0] ?? []) as [string];
    expect(url).toContain('query=chicken+cooked');
    expect(url).toContain('dataType=Foundation%2CSR+Legacy');
    expect(results).toEqual([
      {
        fdcId: 42,
        name: 'Chicken, broilers, meat, cooked',
        calories: 195,
        protein: 27,
        carbohydrates: 0,
        fat: 8,
      },
    ]);
  });

  it('hace fallback de búsqueda amplia si el intento estricto no encuentra nada', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ foods: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            foods: [{ fdcId: 7, description: 'Some food' }],
          }),
      });

    const results = await service.getNutritionData('rare food');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(results).toEqual([
      {
        fdcId: 7,
        name: 'Some food',
        calories: null,
        protein: null,
        carbohydrates: null,
        fat: null,
      },
    ]);
  });

  it('devuelve [] y loguea si la USDA falla', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    const results = await service.getNutritionData('beef');

    expect(results).toEqual([]);
  });
});
