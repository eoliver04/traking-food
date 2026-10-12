import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors } from '@nestjs/common';
import { ApiPruebaService } from './api-prueba.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('api-prueba')
export class ApiPruebaController {
  constructor(private readonly apiPruebaService: ApiPruebaService) {}

  @Post('estimate-food')
  @UseInterceptors(FileInterceptor('image'))
  async estimateFood ( @UploadedFile() file: {
  buffer: Buffer;
  mimetype: string;
}) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.apiPruebaService.estimateFood(file.buffer, file.mimetype);
  }

}
