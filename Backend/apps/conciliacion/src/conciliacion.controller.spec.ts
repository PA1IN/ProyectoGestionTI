import { Test, TestingModule } from '@nestjs/testing';
import { ConciliacionController } from './conciliacion.controller';
import { ConciliacionService } from './conciliacion.service';

describe('ConciliacionController', () => {
  let conciliacionController: ConciliacionController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ConciliacionController],
      providers: [ConciliacionService],
    }).compile();

    conciliacionController = app.get<ConciliacionController>(ConciliacionController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(conciliacionController.getHello()).toBe('Hello World!');
    });
  });
});
