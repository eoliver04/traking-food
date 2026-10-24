import { Module } from '@nestjs/common';
import { FoodRecognitionService } from './food-recognition.service';

@Module({
  providers: [FoodRecognitionService],
  exports: [FoodRecognitionService],
})
export class FoodRecognitionModule {}
