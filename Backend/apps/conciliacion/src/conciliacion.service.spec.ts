import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConciliacionService } from './conciliacion.service';
import { DiscrepanciaConciliacion, EstadoDiscrepancia } from './procesamiento/entities/discrepancia-conciliacion.entity';
import { RabbitMqService, CONCILIATION_ALERTS_ANALYTICS_QUEUE } from '@app/rmq';

describe('ConciliacionService', () => {
  let service: ConciliacionService;

  // Mock del QueryBuilder para TypeORM
  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    execute: jest.fn(),
  };

  // Mock del Repositorio
  const mockDiscrepanciaRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  // Mock del ConfigService
  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'CONCILIATION_WEBHOOK_URL') return 'http://webhook.conciliacion.local';
      if (key === 'SYSTEM_ID') return 'P04';
      return null;
    }),
  };

  // Mock del RabbitMqService
  const mockRabbitMqService = {
    publish: jest.fn(),
  };

  // Mock del QueryRunner y DataSource
  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      query: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(() => mockQueryRunner),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConciliacionService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RabbitMqService, useValue: mockRabbitMqService },
        { provide: getRepositoryToken(DiscrepanciaConciliacion), useValue: mockDiscrepanciaRepository },
      ],
    }).compile();

    service = module.get<ConciliacionService>(ConciliacionService);

    jest.clearAllMocks();
  });

  describe('getDiscrepancyByRrn', () => {
    it('debe retornar una discrepancia si existe', async () => {
      const mockDiscrepancia = { id: 1, rrn: 123456, estado: 'ABIERTA' };
      mockQueryBuilder.getOne.mockResolvedValue(mockDiscrepancia);

      const result = await service.getDiscrepancyByRrn(123456);

      expect(mockDiscrepanciaRepository.createQueryBuilder).toHaveBeenCalledWith('discrepancia');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('discrepancia.rrn = :rrn', { rrn: 123456 });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('discrepancia.created_at', 'DESC');
      expect(result).toEqual(mockDiscrepancia);
    });

    it('debe retornar null si no encuentra la discrepancia', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const result = await service.getDiscrepancyByRrn(999999);

      expect(result).toBeNull();
    });
  });

  describe('closeDiscrepancyByRrn', () => {
    it('debe cerrar la discrepancia y retornar la entidad actualizada', async () => {
      const rrn = 123456;
      const resueltoPor = 'user-uuid-123';
      const mockActualizado = { id: 1, rrn, estado: EstadoDiscrepancia.CERRADA, resuelto_por: resueltoPor };
      
      mockQueryBuilder.execute.mockResolvedValue({ raw: [mockActualizado] });

      const result = await service.closeDiscrepancyByRrn(rrn, resueltoPor);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(DiscrepanciaConciliacion);
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({
        estado: EstadoDiscrepancia.CERRADA,
        resuelto_por: resueltoPor,
      });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('rrn = :rrn', { rrn });
      expect(mockQueryBuilder.returning).toHaveBeenCalledWith('*');
      expect(result).toEqual(mockActualizado);
    });

    it('debe retornar null si la discrepancia a cerrar no existe', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ raw: [] });

      const result = await service.closeDiscrepancyByRrn(999999, 'admin-uuid');

      expect(result).toBeNull();
    });
  });

  describe('conciliar', () => {
    const fechaHora = new Date('2026-07-07T10:00:00Z');
    const archivoId = 'archivo-001';

    it('debe ejecutar la conciliación, procesar discrepancias y publicar alertas', async () => {
      // Setup de la respuesta cruda (raw) de la base de datos
      const rawDbResult = [
        {
          id: 1,
          rrn: 111,
          id_transaccion: 'tx-1',
          tipo: 'DIFERENCIA_DE_MONTO',
          estado: 'ABIERTA',
          monto_interno: 1000,
          monto_banco: 1500,
          archivo_id: archivoId,
        },
        {
          id: 2,
          rrn: 222,
          id_transaccion: null,
          tipo: 'EXISTE_EN_BANCO',
          estado: 'ABIERTA',
          monto_interno: null,
          monto_banco: 3000,
          archivo_id: archivoId,
        }
      ];

      mockQueryRunner.manager.query.mockResolvedValue(rawDbResult);

      // Ejecución
      const result = await service.conciliar(fechaHora, archivoId);

      // Verificaciones de Transacción (Base de datos)
      expect(mockDataSource.createQueryRunner).toHaveBeenCalled();
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.query).toHaveBeenCalledTimes(1); // El INSERT con SELECT
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();

      // Verificaciones de RabbitMQ
      // 2 discrepancias * 2 publicaciones (analítica + webhook) = 4 llamadas
      expect(mockRabbitMqService.publish).toHaveBeenCalledTimes(4);

      // Verificamos la alerta de DIFERENCIA_DE_MONTO
      expect(mockRabbitMqService.publish).toHaveBeenCalledWith(
        CONCILIATION_ALERTS_ANALYTICS_QUEUE,
        expect.objectContaining({
          sistema_id: 'P04',
          payload: expect.objectContaining({
            tipo_discrepancia: 'DIFERENCIA_DE_MONTO',
            rrn: 111,
            monto_interno: 1000,
            monto_banco: 1500,
          }),
        })
      );

      // Verificamos la alerta de EXISTE_EN_BANCO
      expect(mockRabbitMqService.publish).toHaveBeenCalledWith(
        'pagos.notificaciones.webhooks',
        expect.objectContaining({
          targetUrl: 'http://webhook.conciliacion.local',
          payload: expect.objectContaining({
            payload: expect.objectContaining({
              tipo_discrepancia: 'EXISTE_EN_BANCO',
              rrn: 222,
            })
          })
        })
      );

      // Verificamos el mapeo de retorno
      expect(result).toHaveLength(2);
      expect(result[0].montoInterno).toBe(1000);
      expect(result[1].idTransaccion).toBeNull();
    });

    it('debe retornar un arreglo vacío si no hay discrepancias', async () => {
      mockQueryRunner.manager.query.mockResolvedValue([]);

      const result = await service.conciliar(fechaHora, archivoId);

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockRabbitMqService.publish).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('debe hacer rollback y propagar el error si falla la consulta SQL', async () => {
      const dbError = new Error('Database Timeout');
      mockQueryRunner.manager.query.mockRejectedValue(dbError);

      await expect(service.conciliar(fechaHora, archivoId)).rejects.toThrow(dbError);

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(mockRabbitMqService.publish).not.toHaveBeenCalled();
    });
  });
});