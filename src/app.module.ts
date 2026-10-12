import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApiPruebaModule } from './api-prueba/api-prueba.module';
import { NutritionModule } from './nutrition/nutrition.module';
import { FoodAnalysisModule } from './food-analysis/food-analysis.module';

@Module({
  imports: [ApiPruebaModule, NutritionModule, FoodAnalysisModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
