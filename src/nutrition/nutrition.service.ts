import { Injectable } from '@nestjs/common';
import { foodApiKey } from 'config/apiExportConfig';
import { mapFood } from 'config/mapFood';

@Injectable()
export class NutritionService {
  async getNutritionData(queryInEnglish: string) {
    if (!queryInEnglish || queryInEnglish.trim() === '' || queryInEnglish === 'desconocido') {
      return [];
    }

    const cleanQuery = encodeURIComponent(queryInEnglish.trim());

    // 1. Intento estricto (alimentos base no procesados)
    let url =
      `https://api.nal.usda.gov/fdc/v1/foods/search` +
      `?api_key=${foodApiKey}` +
      `&query=${cleanQuery}` +
      `&dataType=Foundation,SR%20Legacy` +
      `&pageSize=3`;

    let response = await fetch(url);
    if (!response.ok) return [];

    let data = await response.json();

    // 2. Fallback: Si no encuentra nada, busca en todas las categorías de USDA
    if (!data.foods || data.foods.length === 0) {
      url =
        `https://api.nal.usda.gov/fdc/v1/foods/search` +
        `?api_key=${foodApiKey}` +
        `&query=${cleanQuery}` +
        `&pageSize=3`;

      response = await fetch(url);
      if (!response.ok) return [];
      data = await response.json();
    }

    if (!data.foods || data.foods.length === 0) {
      return [];
    }

    return data.foods.map(mapFood);
  }
}