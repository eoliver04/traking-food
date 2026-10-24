import { BadRequestException } from '@nestjs/common';
import { FoodAnalysisController } from './food-analysis.controller';

describe('FoodAnalysisController', () => {
  let controller: FoodAnalysisController;
  const analyzeFood = jest.fn().mockResolvedValue([]);

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new FoodAnalysisController({
      analyzeFood,
    } as never);
  });

  it('lanza BadRequestException si no se subió imagen', async () => {
    await expect(controller.analyzeFood(undefined)).rejects.toThrow(
      BadRequestException,
    );
    expect(analyzeFood).not.toHaveBeenCalled();
  });

  it('delega en el servicio cuando se sube una imagen', async () => {
    const file = {
      buffer: Buffer.from('x'),
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    await controller.analyzeFood(file);

    expect(analyzeFood).toHaveBeenCalledWith(file.buffer);
  });
});
