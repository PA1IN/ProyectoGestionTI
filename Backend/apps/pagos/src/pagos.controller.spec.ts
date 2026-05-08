import { Test, TestingModule } from '@nestjs/testing';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';

describe('PagosController', () => {
  let pagosController: PagosController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [PagosController],
      providers: [PagosService],
    }).compile();

    pagosController = app.get<PagosController>(PagosController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(pagosController.getHello()).toBe('Hello World!');
    });
  });
});
