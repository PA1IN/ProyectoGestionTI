import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { ConciliacionService } from './conciliacion.service';
import { DiscrepanciaConciliacion, EstadoDiscrepancia } from './procesamiento/entities/discrepancia-conciliacion.entity';
import { RabbitMqService, CONCILIATION_ALERTS_ANALYTICS_QUEUE } from '@app/rmq';

describe('ConciliacionService', () => {
  let service: ConciliacionService;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    execute: jest.fn(),
  };

  const mockDiscrepanciaRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    find: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'CONCILIATION_WEBHOOK_URL') return 'http://webhook.conciliacion.local';
      if (key === 'SYSTEM_ID') return 'P04';
      return null;
    }),
  };

  const mockRabbitMqService = {
    publish: jest.fn(),
  };

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
    query: jest.fn(), // Añadido para mockear las consultas directas de validación y CSV
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
    
    // Configurar Math.random predecible para los tests del CSV
    jest.spyOn(Math, 'random').mockReturnValue(0.5); 
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getDiscrepancyByRrn y getAllDiscrepancies', () => {
    it('getDiscrepancyByRrn debe retornar una discrepancia si existe', async () => {
      const mockDiscrepancia = { id: 1, rrn: 123456, estado: 'ABIERTA' };
      mockQueryBuilder.getOne.mockResolvedValue(mockDiscrepancia);

      const result = await service.getDiscrepancyByRrn(123456);

      expect(mockDiscrepanciaRepository.createQueryBuilder).toHaveBeenCalledWith('discrepancia');
      expect(result).toEqual(mockDiscrepancia);
    });

    it('getAllDiscrepancies debe retornar la lista de discrepancias ordenadas', async () => {
      const mockList = [{ id: 1 }, { id: 2 }];
      mockDiscrepanciaRepository.find.mockResolvedValue(mockList);

      const result = await service.getAllDiscrepancies();

      expect(mockDiscrepanciaRepository.find).toHaveBeenCalledWith({
        order: { created_at: 'DESC' },
      });
      expect(result).toEqual(mockList);
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
      expect(result).toEqual(mockActualizado);
    });
  });

  describe('conciliar', () => {
    const fechaHora = new Date('2026-07-07T10:00:00Z');
    const archivoId = 'archivo-001';

    it('debe lanzar ConflictException si el archivo ya fue conciliado', async () => {
      // Simulamos que la consulta de validación encuentra un registro
      mockDataSource.query.mockResolvedValue([{ '?column?': 1 }]);

      await expect(service.conciliar(fechaHora, archivoId)).rejects.toThrow(ConflictException);
      await expect(service.conciliar(fechaHora, archivoId)).rejects.toThrow(`El archivo con ID "${archivoId}" ya fue conciliado previamente.`);
      
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled(); // No debe iniciar transacción
    });

    it('debe ejecutar la conciliación y truncar la tabla temporal si el archivo es nuevo', async () => {
      // Validación inicial: El archivo no existe
      mockDataSource.query.mockResolvedValueOnce([]); 

      const rawDbResult = [
        { id: 1, rrn: 111, id_transaccion: 'tx-1', tipo: 'DIFERENCIA_DE_MONTO', estado: 'ABIERTA', monto_interno: 1000, monto_banco: 1500, archivo_id: archivoId },
      ];

      // Simulamos el INSERT
      mockQueryRunner.manager.query.mockResolvedValueOnce(rawDbResult);
      // Simulamos el TRUNCATE
      mockQueryRunner.manager.query.mockResolvedValueOnce([]); 

      const result = await service.conciliar(fechaHora, archivoId);

      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT 1 FROM discrepancias_conciliacion WHERE archivo_id = $1'),
        [archivoId]
      );
      
      expect(mockQueryRunner.manager.query).toHaveBeenCalledWith(
        expect.stringContaining('TRUNCATE TABLE conciliacion_temporal')
      );

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockRabbitMqService.publish).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('debe hacer rollback y propagar el error si falla el proceso', async () => {
      mockDataSource.query.mockResolvedValueOnce([]); // Pasa la validación
      
      const dbError = new Error('Database Error');
      mockQueryRunner.manager.query.mockRejectedValue(dbError);

      await expect(service.conciliar(fechaHora, archivoId)).rejects.toThrow(dbError);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('exportarTransaccionesCsv', () => {
    it('debe exportar CSV exacto cuando simulación es false', async () => {
      const mockTransacciones = [
        { rrn: 111, monto: '1000', fecha_hora: new Date('2026-07-07T10:00:00.000Z') },
        { rrn: 222, monto: '2000', fecha_hora: new Date('2026-07-08T10:00:00.000Z') }
      ];
      mockDataSource.query.mockResolvedValueOnce(mockTransacciones);

      const result = await service.exportarTransaccionesCsv('false');

      expect(mockDataSource.query).toHaveBeenCalledWith(expect.stringContaining('SELECT rrn, monto, created_at'));
      expect(result.filasFalladas).toBe(0);
      expect(result.csv).toContain('rrn,monto,fecha_hora');
      expect(result.csv).toContain('111,1000,2026-07-07T10:00:00.000Z');
      expect(result.csv).toContain('222,2000,2026-07-08T10:00:00.000Z');
    });

    it('debe generar filas con errores (discrepancias) cuando simulación es true', async () => {
      const mockTransacciones = [
        { rrn: 333, monto: '1500', fecha_hora: new Date('2026-07-07T10:00:00.000Z') }
      ];
      mockDataSource.query.mockResolvedValueOnce(mockTransacciones);
      
      // Forzamos un Math.random alto para que caiga en la lógica de generación de discrepancia
      jest.spyOn(Math, 'random').mockReturnValue(0.99);

      // Le pasamos probabilidad 0 para forzar que siempre se altere la fila
      const result = await service.exportarTransaccionesCsv('true', 0);

      expect(result.filasFalladas).toBeGreaterThan(0);
      expect(result.csv).toContain('rrn,monto,fecha_hora');
      
      // Al forzar el error de monto (tipoDiscrepancia = 2), el monto exportado debe ser distinto al original (1500)
      const lineasCsv = result.csv.split('\n');
      const filaAlterada = lineasCsv[1].split(',');
      expect(Number(filaAlterada[1])).not.toBe(1500); 
    });

    it('debe manejar RRNs nulos generando RRNs aleatorios', async () => {
      const mockTransacciones = [
        { rrn: null, monto: '500', fecha_hora: new Date('2026-07-07T10:00:00.000Z') }
      ];
      mockDataSource.query.mockResolvedValueOnce(mockTransacciones);

      const result = await service.exportarTransaccionesCsv('false');

      const lineasCsv = result.csv.split('\n');
      const fila = lineasCsv[1].split(',');
      
      // Verifica que haya generado un número en lugar de enviar "null"
      expect(Number(fila[0])).toBeGreaterThanOrEqual(100000000); 
      expect(Number(fila[0])).toBeLessThanOrEqual(999999999);
    });
  });
});