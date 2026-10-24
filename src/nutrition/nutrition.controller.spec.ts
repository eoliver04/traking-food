import { NutritionController } from './nutrition.controller';

describe('NutritionController', () => {
  let controller: NutritionController;
  const getNutritionData = jest.fn().mockResolvedValue([]);

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new NutritionController({ getNutritionData } as never);
  });

  it('delega el término de búsqueda en el servicio', async () => {
    await controller.searchFood('chicken');

    expect(getNutritionData).toHaveBeenCalledWith('chicken');
  });
});
