import { Module } from '@nestjs/common';
import { FoodRecognitionModule } from 'src/food-recognition/food-recognition.module';
import { NutritionModule } from 'src/nutrition/nutrition.module';
import { FoodAnalysisService } from './food-analysis.service';
import { FoodAnalysisController } from './food-analysis.controller';

@Module({
  imports: [FoodRecognitionModule, NutritionModule],
  controllers: [FoodAnalysisController],
  providers: [FoodAnalysisService],
})
export class FoodAnalysisModule {}
