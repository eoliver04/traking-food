export interface FoodItem {
  name: string;
  estimatedGrams: number;
  estimatedCalories: number;
  confidence: number;
}

export interface FoodEstimation {
  foods: FoodItem[];
  totalCalories: number;
}