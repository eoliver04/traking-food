import {
  FoodSearchResult,
  UsdaSearchFood,
} from 'src/nutrition/dto/nutrition-values.dto';

export function mapFood(food: UsdaSearchFood): FoodSearchResult {
  const getNutrient = (name: string): number | null => {
    return (
      food.foodNutrients?.find(
        (nutrient: { nutrientName: string }) => nutrient.nutrientName === name,
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
