import { Module } from '@nestjs/common';
import { ApiPruebaService } from './api-prueba.service';
import { ApiPruebaController } from './api-prueba.controller';

@Module({
  controllers: [ApiPruebaController],
  providers: [ApiPruebaService],
  exports: [ApiPruebaService],
})
export class ApiPruebaModule {}
