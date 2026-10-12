import { Test, TestingModule } from '@nestjs/testing';
import { FoodAnalysisController } from './food-analysis.controller';
import { FoodAnalysisService } from './food-analysis.service';

describe('FoodAnalysisController', () => {
  let controller: FoodAnalysisController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FoodAnalysisController],
      providers: [FoodAnalysisService],
    }).compile();

    controller = module.get<FoodAnalysisController>(FoodAnalysisController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
