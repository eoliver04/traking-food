import { Injectable } from '@nestjs/common';
import { ApiPruebaService } from 'src/api-prueba/api-prueba.service';
import { NutritionCalculationService } from 'src/nutrition/nutrition-calculation.service';
import { NutritionService } from 'src/nutrition/nutrition.service';

@Injectable()
export class FoodAnalysisService {
  constructor(
    private readonly geminiService: ApiPruebaService,
    private readonly nutritionService: NutritionService,
    private readonly nutritionCalculationService: NutritionCalculationService,
  ) {}

  async analyzeFood(imageBuffer: Buffer, mimeType: string) {
    // 1. Gemini identifica los alimentos y genera el término en inglés
    const identification = await this.geminiService.estimateFood(
      imageBuffer,
      mimeType,
    );

    // 2. Buscamos la nutrición en la USDA usando el query en inglés
    const foods = await Promise.all(
      identification.foods.map(async (food) => {
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
    return this.nutritionCalculationService.calculateNutrition({
      foods,
    });
  }
}