import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnaliticaController } from './analitica.controller';
import { AnaliticaService } from './analitica.service';
import { AlertaHistorica } from './entities/alerta-historica.entity';
import { RabbitMqService } from '@app/rmq';

describe('AnaliticaController', () => {
  let analiticaController: AnaliticaController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AnaliticaController],
      providers: [
        AnaliticaService,
        { provide: RabbitMqService, useValue: { consume: jest.fn(), publish: jest.fn() } },
        { provide: getRepositoryToken(AlertaHistorica), useValue: { save: jest.fn(), find: jest.fn() } },
      ],
    }).compile();

    analiticaController = app.get<AnaliticaController>(AnaliticaController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(analiticaController.getHello()).toBe('Hello World!');
    });
  });
});
