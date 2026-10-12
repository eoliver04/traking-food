import { FoodSearchResult } from 'src/nutrition/dto/nutritio.values.dto';

export function mapFood(food: any): FoodSearchResult {
  const getNutrient = (name: string): number | null => {
    return (
      food.foodNutrients?.find(
        (nutrient: any) => nutrient.nutrientName === name,
      )?.value ?? null
    );
  };

  return {
    fdcId: food.fdcId,
    name: food.description,
    calories: getNutrient('Energy'),
    protein: getNutrient('Protein'),
    carbohydrates: getNutrient('Carbohydrate, by difference'),
    fat: getNutrient('Total lipid (fat)'),
  };
}