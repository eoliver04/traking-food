export interface FoodSearchResult {
  fdcId: number;
  name: string;
  calories: number | null;
  protein: number | null;
  carbohydrates: number | null;
  fat: number | null;
}