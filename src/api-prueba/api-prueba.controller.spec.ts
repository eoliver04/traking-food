import { Test, TestingModule } from '@nestjs/testing';
import { ApiPruebaController } from './api-prueba.controller';
import { ApiPruebaService } from './api-prueba.service';

describe('ApiPruebaController', () => {
  let controller: ApiPruebaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiPruebaController],
      providers: [ApiPruebaService],
    }).compile();

    controller = module.get<ApiPruebaController>(ApiPruebaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
