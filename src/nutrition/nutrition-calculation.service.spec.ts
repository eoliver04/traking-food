import { NutritionCalculationService } from './nutrition-calculation.service';

describe('NutritionCalculationService', () => {
  let service: NutritionCalculationService;

  beforeEach(() => {
    service = new NutritionCalculationService();
  });

  it('calcula macros en proporción a los gramos estimados', () => {
    const result = service.calculateNutrition({
      foods: [
        {
          name: 'Pollo',
          estimatedGrams: 200,
          confidence: 0.9,
          nutrition: [
            {
              fdcId: 1,
              name: 'chicken cooked',
              calories: 150,
              protein: 27,
              carbohydrates: 0,
              fat: 5,
            },
          ],
        },
      ],
    });

    expect(result.foods[0]).toMatchObject({
      grams: 200,
      calories: 300, // 150 * 2
      protein: 54, // 27 * 2
      fat: 10,
      usdaMatch: 'chicken cooked',
    });
    expect(result.totals.calories).toBe(300);
  });

  it('usa el fallback de Atwater (4-9-4) cuando la USDA no trae calorías', () => {
    const result = service.calculateNutrition({
      foods: [
        {
          name: 'Salsa',
          estimatedGrams: 100,
          confidence: 0.5,
          nutrition: [
            {
              fdcId: 2,
              name: 'some sauce',
              calories: null,
              protein: 5,
              carbohydrates: 10,
              fat: 8,
            },
          ],
        },
      ],
    });

    // 5*4 + 10*4 + 8*9 = 132
    expect(result.foods[0].calories).toBe(132);
  });

  it('clamp gramos negativos o por encima del máximo', () => {
    const result = service.calculateNutrition({
      foods: [
        {
          name: 'Ghost food',
          estimatedGrams: -50,
          confidence: 0.9,
          nutrition: [
            {
              fdcId: 3,
              name: 'rice cooked',
              calories: 130,
              protein: 3,
              carbohydrates: 28,
              fat: 1,
            },
          ],
        },
        {
          name: 'Monster food',
          estimatedGrams: 99999,
          confidence: 0.9,
          nutrition: [],
        },
      ],
    });

    expect(result.foods[0].grams).toBe(0);
    expect(result.foods.every((food) => food.calories >= 0)).toBe(true);

    const monster = service.calculateNutrition({
      foods: [
        {
          name: 'Monster food',
          estimatedGrams: 99999,
          confidence: 0.9,
          nutrition: [
            {
              fdcId: 4,
              name: 'beef cooked',
              calories: 250,
              protein: 26,
              carbohydrates: 0,
              fat: 15,
            },
          ],
        },
      ],
    });
    expect(monster.foods[0].grams).toBe(2000);
  });

  it('devuelve ceros cuando no hay match en la USDA pero conserva los gramos', () => {
    const result = service.calculateNutrition({
      foods: [
        {
          name: 'Alimento desconocido',
          estimatedGrams: 120,
          confidence: 0.3,
          nutrition: [],
        },
      ],
    });

    expect(result.foods[0]).toMatchObject({
      usdaMatch: null,
      fdcId: null,
      grams: 120,
      calories: 0,
    });
  });
});
