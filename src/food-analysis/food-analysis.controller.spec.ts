import { BadRequestException } from '@nestjs/common';
import { AuthUser } from 'src/auth/auth.types';
import { FoodAnalysisController } from './food-analysis.controller';

describe('FoodAnalysisController', () => {
  let controller: FoodAnalysisController;
  const analyzeFood = jest.fn().mockResolvedValue([]);
  const user: AuthUser = { id: 'user-1', email: 'u@test.com' };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new FoodAnalysisController({
      analyzeFood,
    } as never);
  });

  it('lanza BadRequestException si no se subió imagen', async () => {
    await expect(controller.analyzeFood(user, undefined)).rejects.toThrow(
      BadRequestException,
    );
    expect(analyzeFood).not.toHaveBeenCalled();
  });

  it('delega en el servicio con el id del usuario autenticado', async () => {
    const file = {
      buffer: Buffer.from('x'),
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    await controller.analyzeFood(user, file);

    expect(analyzeFood).toHaveBeenCalledWith('user-1', file.buffer);
  });
});
