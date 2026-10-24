import { Controller, Get, Query } from '@nestjs/common';
import { NutritionService } from './nutrition.service';

@Controller('nutrition')
export class NutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  @Get('search')
  async searchFood(@Query('foodName') foodName: string) {
    const nutritionData =
      await this.nutritionService.getNutritionData(foodName);
    return nutritionData;
  }
}
