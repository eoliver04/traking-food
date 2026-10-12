import { Test, TestingModule } from '@nestjs/testing';
import { FoodAnalysisService } from './food-analysis.service';

describe('FoodAnalysisService', () => {
  let service: FoodAnalysisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FoodAnalysisService],
    }).compile();

    service = module.get<FoodAnalysisService>(FoodAnalysisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
