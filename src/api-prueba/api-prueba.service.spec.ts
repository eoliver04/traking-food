import { Test, TestingModule } from '@nestjs/testing';
import { ApiPruebaService } from './api-prueba.service';

describe('ApiPruebaService', () => {
  let service: ApiPruebaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApiPruebaService],
    }).compile();

    service = module.get<ApiPruebaService>(ApiPruebaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
