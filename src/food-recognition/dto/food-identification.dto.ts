export interface IdentifiedFood {
  /** Nombre del alimento en español */
  name: string;
  /** Término de búsqueda en inglés optimizado para la USDA */
  usdaQuery: string;
  /** Gramos estimados por Gemini */
  estimatedGrams: number;
  /** Confianza de la estimación (0-1) */
  confidence: number;
}

export interface FoodIdentification {
  foods: IdentifiedFood[];
}
