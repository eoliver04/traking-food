import { Module } from '@nestjs/common';
import { ApiPruebaModule } from 'src/api-prueba/api-prueba.module';
import { NutritionModule } from 'src/nutrition/nutrition.module';
import { FoodAnalysisService } from './food-analysis.service';
import { FoodAnalysisController } from './food-analysis.controller';

@Module({
  imports: [ApiPruebaModule, NutritionModule],
  controllers: [FoodAnalysisController],
  providers: [FoodAnalysisService],
})
export class FoodAnalysisModule {}
