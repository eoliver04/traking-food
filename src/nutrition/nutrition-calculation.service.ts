import { Injectable } from '@nestjs/common';
import { FoodSearchResult } from './dto/nutrition-values.dto';

/** Item que entra al cálculo: resultado de Gemini + datos USDA */
export interface NutritionDataInput {
  name: string;
  estimatedGrams: number;
  confidence: number;
  nutrition: FoodSearchResult[];
}

/** Detalle nutricional calculado por alimento */
export interface NutritionDetail {
  name: string;
  usdaMatch: string | null;
  fdcId: number | null;
  grams: number;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
}

export interface NutritionTotals {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
}

export interface NutritionAnalysisResult {
  foods: NutritionDetail[];
  totals: NutritionTotals;
}

/** Cota superior de seguridad para los gramos que devuelve el modelo */
const MAX_GRAMS = 2000;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

@Injectable()
export class NutritionCalculationService {
  /**
   * Calcula calorías y macros de cada alimento en función de los gramos
   * estimados, y agrega los totales globales del plato.
   */
  calculateNutrition(foodData: {
    foods: NutritionDataInput[];
  }): NutritionAnalysisResult {
    const detailFood = foodData.foods.map((item): NutritionDetail => {
      const grams = clamp(item.estimatedGrams ?? 0, 0, MAX_GRAMS);
      const selectedFood = item.nutrition?.[0]; // primer resultado de la USDA

      if (!selectedFood) {
        return {
          name: item.name,
          usdaMatch: null,
          fdcId: null,
          grams,
          calories: 0,
          protein: 0,
          carbohydrates: 0,
          fat: 0,
        };
      }

      const ratio = grams / 100;

      const protein = (selectedFood.protein ?? 0) * ratio;
      const carbohydrates = (selectedFood.carbohydrates ?? 0) * ratio;
      const fat = (selectedFood.fat ?? 0) * ratio;

      // Calorías de la USDA o Fallback Atwater (4-9-4)
      let calories =
        selectedFood.calories != null ? selectedFood.calories * ratio : null;
      if (calories === null) {
        calories = protein * 4 + carbohydrates * 4 + fat * 9;
      }

      return {
        name: item.name,
        usdaMatch: selectedFood.name,
        fdcId: selectedFood.fdcId,
        grams,
        calories: Math.round(calories * 10) / 10,
        protein: Math.round(protein * 10) / 10,
        carbohydrates: Math.round(carbohydrates * 10) / 10,
        fat: Math.round(fat * 10) / 10,
      };
    });

    // Sumamos los totales globales del plato
    const totals = detailFood.reduce(
      (acc, food) => {
        acc.calories += food.calories;
        acc.protein += food.protein;
        acc.carbohydrates += food.carbohydrates;
        acc.fat += food.fat;
        return acc;
      },
      { calories: 0, protein: 0, carbohydrates: 0, fat: 0 },
    );

    return {
      foods: detailFood,
      totals: {
        calories: Math.round(totals.calories),
        protein: Math.round(totals.protein * 10) / 10,
        carbohydrates: Math.round(totals.carbohydrates * 10) / 10,
        fat: Math.round(totals.fat * 10) / 10,
      },
    };
  }
}
