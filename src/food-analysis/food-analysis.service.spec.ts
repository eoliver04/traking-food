import { FoodAnalysisService } from './food-analysis.service';
import { IdentifiedFood } from 'src/food-recognition/dto/food-identification.dto';
import { FoodSearchResult } from 'src/nutrition/dto/nutrition-values.dto';

describe('FoodAnalysisService', () => {
  let service: FoodAnalysisService;
  let recognitionService: { identifyFoods: jest.Mock };
  let nutritionService: { getNutritionData: jest.Mock };
  let calculationService: { calculateNutrition: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    recognitionService = { identifyFoods: jest.fn() };
    nutritionService = { getNutritionData: jest.fn() };
    calculationService = { calculateNutrition: jest.fn() };

    service = new FoodAnalysisService(
      recognitionService as never,
      nutritionService as never,
      calculationService,
    );
  });

  it('orquesta: identifica -> busca en USDA -> calcula', async () => {
    const identified: IdentifiedFood[] = [
      {
        name: 'Patata',
        usdaQuery: 'roasted potato',
        estimatedGrams: 150,
        confidence: 0.8,
      },
    ];

    recognitionService.identifyFoods.mockResolvedValue({ foods: identified });
    nutritionService.getNutritionData.mockResolvedValue([
      {
        fdcId: 1,
        name: 'potato roasted',
        calories: 149,
        protein: 2,
        carbohydrates: 30,
        fat: 1,
      } as FoodSearchResult,
    ]);

    await service.analyzeFood(Buffer.from('img'));

    expect(recognitionService.identifyFoods).toHaveBeenCalled();
    expect(nutritionService.getNutritionData).toHaveBeenCalledWith(
      'roasted potato',
    );
    expect(calculationService.calculateNutrition).toHaveBeenCalledWith({
      foods: [
        {
          name: 'Patata',
          estimatedGrams: 150,
          confidence: 0.8,
          nutrition: [
            {
              fdcId: 1,
              name: 'potato roasted',
              calories: 149,
              protein: 2,
              carbohydrates: 30,
              fat: 1,
            },
          ],
        },
      ],
    });
  });

  it('no consulta USDA si Gemini no identifica nada', async () => {
    recognitionService.identifyFoods.mockResolvedValue({ foods: [] });

    const result = await service.analyzeFood(Buffer.from('img'));

    expect(nutritionService.getNutritionData).not.toHaveBeenCalled();
    expect(result.totals.calories).toBe(0);
  });
});
