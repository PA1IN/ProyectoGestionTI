import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PagoService } from './pago.service';
import { EstadoTarjeta, Tarjeta } from '../tarjeta/entities/tarjeta.entity';
import { Transaccion, EstadoTransaccionDb } from './entities/transaccion.entity';
import { HistorialTransaccion } from './entities/historial-transaccion.entity';
import { DetalleTransaccion, TipoPagoDb } from './entities/detalle-transaccion.entity';
import { EstadoRespuestaTransaccion } from './enums/estado-respuesta-transaccion.enum';

describe('PagoService', () => {
  let service: PagoService;

  const jwtServiceMock = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const configServiceMock = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        JWT_EXPIRES_IN: '15m',
        JWT_SECRET: 'secret',
        FRONTEND_URL: 'http://localhost:3000',
      };
      return values[key];
    }),
  };

  const tarjetaRepositoryMock = {
    findOne: jest.fn(),
  };

  const transaccionRepositoryMock = {
    create: jest.fn((value) => value),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const historialRepositoryMock = {
    create: jest.fn((value) => value),
    save: jest.fn(),
    find: jest.fn(),
  };

  const detalleRepositoryMock = {
    create: jest.fn((value) => value),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagoService,
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
        { provide: getRepositoryToken(Tarjeta), useValue: tarjetaRepositoryMock },
        { provide: getRepositoryToken(Transaccion), useValue: transaccionRepositoryMock },
        { provide: getRepositoryToken(HistorialTransaccion), useValue: historialRepositoryMock },
        { provide: getRepositoryToken(DetalleTransaccion), useValue: detalleRepositoryMock },
      ],
    }).compile();

    service = module.get<PagoService>(PagoService);
    jest.clearAllMocks();
  });

  it('createTransaction debe generar un token y persistir una transaccion pendiente', async () => {
    transaccionRepositoryMock.save.mockResolvedValue({ id: 'tx-1' });
    jwtServiceMock.signAsync.mockResolvedValue('jwt-token');

    const result = await service.createTransaction({
      monto: 1250,
      moneda: 'CLP',
      nombreComercio: 'Demo',
      returnUrl: 'http://localhost:3000/ok',
    });

    expect(transaccionRepositoryMock.save).toHaveBeenCalled();
    expect(jwtServiceMock.signAsync).toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        token: 'jwt-token',
        transactionId: 'tx-1',
        tokenType: 'Bearer',
      }),
    );
  });

  it('processTransaction debe aprobar y guardar detalle e historial', async () => {
    jwtServiceMock.verifyAsync.mockResolvedValue({
      transactionId: 'tx-1',
      monto: 1250,
      moneda: 'CLP',
      nombreComercio: 'Demo',
      returnUrl: 'http://localhost:3000/ok',
      tipo: 'transaccion-init',
      iatAt: new Date().toISOString(),
    });
    transaccionRepositoryMock.findOne.mockResolvedValue({ id: 'tx-1', estado: EstadoTransaccionDb.PENDING });
    tarjetaRepositoryMock.findOne.mockResolvedValue({
      numero: '1111222233334444',
      cvv: '123',
      fechaExpiracion: '12/28',
      estado: EstadoTarjeta.APROBADO,
    });
    transaccionRepositoryMock.save.mockResolvedValue({ id: 'tx-1', estado: EstadoTransaccionDb.SUCCESS });

    const result = await service.processTransaction('jwt-token', {
      numeroTarjeta: '1111222233334444',
      titular: 'Juan Perez',
      fechaExpiracion: '12/28',
      cvv: '123',
      rut: '11.111.111-1',
    });

    expect(detalleRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoPago: TipoPagoDb.TARJETA,
        ultimosCuatro: '4444',
      }),
    );
    expect(historialRepositoryMock.save).toHaveBeenCalled();
    expect(result.status).toBe(EstadoRespuestaTransaccion.APROBADO);
  });

  it('getAllTransacciones devuelve el repositorio', async () => {
    transaccionRepositoryMock.find.mockResolvedValue([{ id: 'tx-1' }]);

    await expect(service.getAllTransacciones()).resolves.toEqual([{ id: 'tx-1' }]);
  });

  it('getDetalleTransaccion retorna null cuando no existe', async () => {
    detalleRepositoryMock.findOne.mockResolvedValue(null);

    await expect(service.getDetalleTransaccion(1)).resolves.toBeNull();
  });
});
