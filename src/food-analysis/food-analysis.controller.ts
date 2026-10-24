import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { imageUploadOptions } from 'src/config/upload-options';
import { NutritionAnalysisResult } from 'src/nutrition/nutrition-calculation.service';
import { FoodAnalysisService } from './food-analysis.service';

@Controller('food-analysis')
export class FoodAnalysisController {
  constructor(private readonly foodAnalysisService: FoodAnalysisService) {}

  /**
   * Analiza una foto de comida y devuelve calorías y macros estimados.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image', imageUploadOptions))
  async analyzeFood(
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<NutritionAnalysisResult> {
    if (!file) {
      throw new BadRequestException('Image is required');
    }

    return this.foodAnalysisService.analyzeFood(file.buffer);
  }
}
