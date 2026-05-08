import { Test, TestingModule } from '@nestjs/testing';
import { AnaliticaController } from './analitica.controller';
import { AnaliticaService } from './analitica.service';

describe('AnaliticaController', () => {
  let analiticaController: AnaliticaController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AnaliticaController],
      providers: [AnaliticaService],
    }).compile();

    analiticaController = app.get<AnaliticaController>(AnaliticaController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(analiticaController.getHello()).toBe('Hello World!');
    });
  });
});
