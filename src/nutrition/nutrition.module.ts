import { Module } from '@nestjs/common';
import { NutritionService } from './nutrition.service';
import { NutritionController } from './nutrition.controller';
import { NutritionCalculationService } from './nutrition-calculation.service';

@Module({
  controllers: [NutritionController],
  providers: [NutritionService, NutritionCalculationService],
  exports: [NutritionService, NutritionCalculationService],
})
export class NutritionModule {}
