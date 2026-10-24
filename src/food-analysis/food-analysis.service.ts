import { Injectable, Logger } from '@nestjs/common';
import { FoodRecognitionService } from 'src/food-recognition/food-recognition.service';
import {
  NutritionCalculationService,
  NutritionAnalysisResult,
  NutritionDataInput,
} from 'src/nutrition/nutrition-calculation.service';
import { NutritionService } from 'src/nutrition/nutrition.service';

@Injectable()
export class FoodAnalysisService {
  private readonly logger = new Logger(FoodAnalysisService.name);

  constructor(
    private readonly foodRecognitionService: FoodRecognitionService,
    private readonly nutritionService: NutritionService,
    private readonly nutritionCalculationService: NutritionCalculationService,
  ) {}

  async analyzeFood(imageBuffer: Buffer): Promise<NutritionAnalysisResult> {
    // 1. Gemini identifica los alimentos y genera el término en inglés
    const identification =
      await this.foodRecognitionService.identifyFoods(imageBuffer);

    if (identification.foods.length === 0) {
      this.logger.warn('No food items identified in image');
      return {
        foods: [],
        totals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0 },
      };
    }

    // 2. Buscamos la nutrición en la USDA usando el query en inglés
    const foods = await Promise.all(
      identification.foods.map(async (food): Promise<NutritionDataInput> => {
        const nutrition = await this.nutritionService.getNutritionData(
          food.usdaQuery,
        );

        return {
          name: food.name,
          estimatedGrams: food.estimatedGrams,
          confidence: food.confidence,
          nutrition,
        };
      }),
    );

    // 3. Calculamos los nutrientes según los gramos estimados
    return this.nutritionCalculationService.calculateNutrition({ foods });
  }
}
