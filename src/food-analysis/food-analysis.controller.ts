import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import { FoodAnalysisService } from './food-analysis.service';

@Controller('food-analysis')
export class FoodAnalysisController {
  constructor(
    private readonly foodAnalysisService: FoodAnalysisService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async analyzeFood(
    @UploadedFile() file: { buffer: Buffer; mimetype: string },
  ) {
    if (!file) {
      throw new BadRequestException('Image is required');
    }

    return this.foodAnalysisService.analyzeFood(
      file.buffer,
      file.mimetype,
    );
  }
}