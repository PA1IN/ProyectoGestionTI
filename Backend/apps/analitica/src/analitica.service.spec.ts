import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { AnaliticaService } from './analitica.service';
import { AlertaHistorica, ErrorAlertaHistorica, TipoAlertaHistorica } from './entities/alerta-historica.entity';
import {
  RabbitMqService,
  TRANSACTION_EVENTS_ANALYTICS_QUEUE,
  TRANSACTION_ALERTS_ANALYTICS_QUEUE,
  CONCILIATION_ALERTS_ANALYTICS_QUEUE,
  AnalyticsTransactionEvent,
  TransactionAlert,
  ConciliationAlert,
} from '@app/rmq';

describe('AnaliticaService', () => {
  let service: AnaliticaService;

  // Mapa para capturar los callbacks de RabbitMQ y probar los métodos privados
  const rmqCallbacks: Record<string, Function> = {};

  const mockRabbitMqService = {
    consume: jest.fn().mockImplementation((queue: string, callback: Function) => {
      rmqCallbacks[queue] = callback;
    }),
    publish: jest.fn(),
  };

  const mockAlertaRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((dto) => dto), // Retorna el mismo DTO para facilitar aserciones
    save: jest.fn(),
  };

  const mockDate = new Date('2026-07-07T10:00:00Z');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnaliticaService,
        { provide: RabbitMqService, useValue: mockRabbitMqService },
        { provide: getRepositoryToken(AlertaHistorica), useValue: mockAlertaRepo },
      ],
    }).compile();

    service = module.get<AnaliticaService>(AnaliticaService);
    
    // Limpiar mocks y callbacks antes de cada prueba
    jest.clearAllMocks();
    for (const key in rmqCallbacks) delete rmqCallbacks[key];
  });

  describe('onModuleInit', () => {
    it('debe registrar los 3 consumidores de RabbitMQ', async () => {
      await service.onModuleInit();

      expect(mockRabbitMqService.consume).toHaveBeenCalledTimes(3);
      expect(mockRabbitMqService.consume).toHaveBeenCalledWith(TRANSACTION_EVENTS_ANALYTICS_QUEUE, expect.any(Function));
      expect(mockRabbitMqService.consume).toHaveBeenCalledWith(TRANSACTION_ALERTS_ANALYTICS_QUEUE, expect.any(Function));
      expect(mockRabbitMqService.consume).toHaveBeenCalledWith(CONCILIATION_ALERTS_ANALYTICS_QUEUE, expect.any(Function));
    });
  });

  describe('Consultas y Actualizaciones', () => {
    it('obtenerAlertasHistoricas debe retornar y formatear todas las alertas si no hay filtro', async () => {
      const alertasDb = [
        {
          id: '1',
          tipo: TipoAlertaHistorica.TRANSACCION,
          error: ErrorAlertaHistorica.NOT_EQUAL,
          createdAt: mockDate,
          revisado: false,
          payload: { monto_original: 1000, monto_cobrado: 2000 },
        },
      ];
      mockAlertaRepo.find.mockResolvedValue(alertasDb);

      const result = await service.obtenerAlertasHistoricas();

      expect(mockAlertaRepo.find).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
      });
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: '1',
          tipo: 'Transacción',
          nivel: 'Alto',
          fecha: '2026-07-07 10:00', // Formato esperado por formatearFecha
          descripcion: 'Monto original $1000 y cobrado $2000.',
        })
      );
    });

    it('marcarAlertaComoRevisada debe actualizar a true y retornar la alerta formateada', async () => {
      const alertaDb = {
        id: '1',
        tipo: TipoAlertaHistorica.CONCILIACION,
        error: ErrorAlertaHistorica.DIFERENCIA_DE_MONTO,
        createdAt: mockDate,
        revisado: false,
        payload: { id_transaccion: 'tx-1' },
      };
      
      mockAlertaRepo.findOne.mockResolvedValue(alertaDb);
      mockAlertaRepo.save.mockImplementation(async (entity) => entity);

      const result = await service.marcarAlertaComoRevisada('1');

      expect(mockAlertaRepo.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(mockAlertaRepo.save).toHaveBeenCalledWith(expect.objectContaining({ revisado: true }));
      expect(result.revisado).toBe(true);
      expect(result.nivel).toBe('Medio');
    });

    it('marcarAlertaComoRevisada debe lanzar NotFoundException si no existe', async () => {
      mockAlertaRepo.findOne.mockResolvedValue(null);

      await expect(service.marcarAlertaComoRevisada('99')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Consumidores de Analítica (Eventos RabbitMQ)', () => {
    beforeEach(async () => {
      // Inicializamos el módulo para atrapar los callbacks en rmqCallbacks
      await service.onModuleInit();
    });

    it('debe crear alerta de reintentos (RETRY_WARNING) al fallar 4 veces la misma tarjeta', async () => {
      const cb = rmqCallbacks[TRANSACTION_EVENTS_ANALYTICS_QUEUE];
      expect(cb).toBeDefined();

      const eventoBase = {
        source: 'payments',
        event_type: 'confirmar_pago',
        payload: {
          merchant_credential_id: 'comercio-1',
          payment_method_last4: '4444',
          approved: false,
          codigo_error: 'insufficient_funds',
          webhook_url: 'http://webhook.local',
        },
      } as AnalyticsTransactionEvent;

      // Simulamos 3 intentos fallidos (no debe gatillar alerta)
      for (let i = 1; i <= 3; i++) {
        await cb({ ...eventoBase, payload: { ...eventoBase.payload, transaction_id: `tx-${i}` } });
      }
      expect(mockAlertaRepo.save).not.toHaveBeenCalled();

      // Simulamos el 4to intento fallido
      await cb({ ...eventoBase, payload: { ...eventoBase.payload, transaction_id: 'tx-4' } });

      // Verificamos que se guardó en DB
      expect(mockAlertaRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: TipoAlertaHistorica.TRANSACCION,
          error: ErrorAlertaHistorica.RETRY_WARNING,
          payload: expect.objectContaining({
            ultimos_4: 4444,
            cantidad: 4,
            transacciones: ['tx-1', 'tx-2', 'tx-3', 'tx-4'],
          }),
        })
      );

      // Verificamos que se notificó al comercio por webhook
      expect(mockRabbitMqService.publish).toHaveBeenCalledWith(
        'pagos.notificaciones.webhooks',
        expect.objectContaining({
          targetUrl: 'http://webhook.local',
        })
      );
    });

    it('debe registrar alertas de discrepancia de transacciones (NOT_EQUAL)', async () => {
      const cb = rmqCallbacks[TRANSACTION_ALERTS_ANALYTICS_QUEUE];
      
      const alertaTransaccion: TransactionAlert = {
        sistema_id: 'P04',
        creado_en: new Date().toISOString(),
        payload: {
          tipo: 'Transaccion',
          error: 'NOT_EQUAL',
          id_transaccion: 'tx-99',
          monto_original: 1000,
          monto_cobrado: 2500,
        },
      };

      await cb(alertaTransaccion);

      expect(mockAlertaRepo.create).toHaveBeenCalled();
      expect(mockAlertaRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: TipoAlertaHistorica.TRANSACCION,
          error: ErrorAlertaHistorica.NOT_EQUAL,
          payload: expect.objectContaining({
            id_transaccion: 'tx-99',
            monto_original: 1000,
            monto_cobrado: 2500,
          }),
        })
      );
    });

    it('debe registrar alertas de conciliación (EXISTE_EN_BANCO)', async () => {
      const cb = rmqCallbacks[CONCILIATION_ALERTS_ANALYTICS_QUEUE];
      
      const alertaConciliacion: ConciliationAlert = {
        sistema_id: 'P04',
        creado_en: new Date().toISOString(),
        payload: {
          tipo: 'Conciliacion',
          tipo_discrepancia: 'EXISTE_EN_BANCO',
          rrn: 555555,
          id_transaccion: null,
          id_archivo: 'archivo-123',
        },
      };

      await cb(alertaConciliacion);

      expect(mockAlertaRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: TipoAlertaHistorica.CONCILIACION,
          error: 'EXISTE_EN_BANCO',
          payload: expect.objectContaining({
            rrn: 555555,
            id_archivo: 'archivo-123',
          }),
        })
      );
    });
  });
});