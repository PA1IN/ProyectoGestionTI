import { Test, TestingModule } from '@nestjs/testing';
import { ProcesamientoController } from './procesamiento.controller';
import { ProcesamientoService } from './procesamiento.service';

describe('ProcesamientoController', () => {
  let controller: ProcesamientoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProcesamientoController],
      providers: [ProcesamientoService],
    }).compile();

    controller = module.get<ProcesamientoController>(ProcesamientoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
