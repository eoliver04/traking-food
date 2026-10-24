/** Nutriente tal como lo devuelve la API de USDA FoodData Central */
export interface UsdaNutrient {
  nutrientName: string;
  value: number;
}

/** Alimento dentro de la respuesta de búsqueda de USDA */
export interface UsdaSearchFood {
  fdcId: number;
  description: string;
  foodNutrients?: UsdaNutrient[];
}

/** Resultado de búsqueda con los macros que nos interesan */
export interface FoodSearchResult {
  fdcId: number;
  name: string;
  calories: number | null;
  protein: number | null;
  carbohydrates: number | null;
  fat: number | null;
}
