import { Injectable } from '@nestjs/common';

@Injectable()
export class NutritionCalculationService {
  //function to calculete the total calories and nutriten based on the food data of gemini and USDA

  calculateNutrition(foodData: any) {
    const detailFood = foodData.foods.map((item) => {
      const selectedFood = item.nutrition?.[0]; //firts array's element

      if (!selectedFood) {
        return {
          name: item.name,
          grams: item.estimatedGrams,
          calories: 0,
          protein: 0,
          carbohydrates: 0,
          fat: 0,
        };
      }

      const ratio = item.estimatedGrams / 100;

      const protein = (selectedFood.protein ?? 0) * ratio;
      const carbohydrates = (selectedFood.carbohydrates ?? 0) * ratio;
      const fat = (selectedFood.fat ?? 0) * ratio;

      // Calorías de la USDA o Fallback Atwater (4-9-4)
      let calories =
        selectedFood.calories !== null ? selectedFood.calories * ratio : null;
      if (calories === null) {
        calories = protein * 4 + carbohydrates * 4 + fat * 9;
      }

      return {
        name: item.name,
        usdaMatch: selectedFood.name,
        fdcId: selectedFood.fdcId,
        grams: item.estimatedGrams,
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
