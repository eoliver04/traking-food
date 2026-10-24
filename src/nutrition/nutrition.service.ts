import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FoodSearchResult, UsdaSearchFood } from './dto/nutrition-values.dto';
import { mapFood } from './utils/map-food';

const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const REQUEST_TIMEOUT_MS = 10_000;
const PAGE_SIZE = 3;

@Injectable()
export class NutritionService {
  private readonly logger = new Logger(NutritionService.name);

  constructor(private readonly configService: ConfigService) {}

  async getNutritionData(queryInEnglish: string): Promise<FoodSearchResult[]> {
    if (
      !queryInEnglish ||
      queryInEnglish.trim() === '' ||
      queryInEnglish === 'desconocido'
    ) {
      return [];
    }

    const cleanQuery = queryInEnglish.trim();
    const apiKey = this.configService.getOrThrow<string>('FOOD_API');

    // 1. Intento estricto (alimentos base no procesados)
    let results = await this.search(cleanQuery, apiKey, 'Foundation,SR Legacy');

    // 2. Fallback: Si no encuentra nada, busca en todas las categorías de USDA
    if (results.length === 0) {
      results = await this.search(cleanQuery, apiKey);
    }

    if (results.length === 0) {
      this.logger.warn(`No USDA results for query: "${queryInEnglish}"`);
    }

    return results;
  }

  private async search(
    query: string,
    apiKey: string,
    dataType?: string,
  ): Promise<FoodSearchResult[]> {
    const params = new URLSearchParams({
      query,
      api_key: apiKey,
      pageSize: String(PAGE_SIZE),
    });
    if (dataType) {
      params.set('dataType', dataType);
    }

    let response: Response;
    try {
      response = await fetch(`${USDA_BASE_URL}?${params}`, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.error(
        `USDA request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }

    if (!response.ok) {
      this.logger.error(
        `USDA search failed with status ${response.status} for query: "${query}"`,
      );
      return [];
    }

    let data: { foods?: UsdaSearchFood[] };
    try {
      data = (await response.json()) as { foods?: UsdaSearchFood[] };
    } catch (error) {
      this.logger.error(
        `USDA returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }

    return (data.foods ?? []).map(mapFood);
  }
}
