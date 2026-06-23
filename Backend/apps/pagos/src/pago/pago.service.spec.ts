import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PagoService } from './pago.service';
import { MediosPagoService } from '../medios-pago/medios-pago.service';
import { ComerciosService } from '../comercios/comercios.service';
import { TarjetaService } from '../tarjeta/tarjeta.service';
import { TarjetaGuardada } from '../medios-pago/entities/tarjeta-guardada.entity';
import { MandatoPago } from '../medios-pago/entities/mandato-pago.entity';
import { CredencialComercio } from '../comercios/entities/credencial-comercio.entity';
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

  const mandatoRepositoryMock = {
    create: jest.fn((value) => value),
    save: jest.fn(),
  };

  const credencialComercioRepositoryMock = {
    findOne: jest.fn(),
  };

  const mediosPagoServiceMock = {
    guardarTarjeta: jest.fn(),
    buscarTarjetaPorToken: jest.fn(),
    crearMandato: jest.fn(),
    buscarMandatoPorTarjetaYComercio: jest.fn(),
  };

  const tarjetaServiceMock = {
    autorizarBanco: jest.fn(),
  };

  const comerciosServiceMock = {};

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
        { provide: getRepositoryToken(TarjetaGuardada), useValue: tarjetaRepositoryMock },
        { provide: getRepositoryToken(MandatoPago), useValue: mandatoRepositoryMock },
        { provide: getRepositoryToken(CredencialComercio), useValue: credencialComercioRepositoryMock },
        { provide: getRepositoryToken(Transaccion), useValue: transaccionRepositoryMock },
        { provide: getRepositoryToken(HistorialTransaccion), useValue: historialRepositoryMock },
        { provide: getRepositoryToken(DetalleTransaccion), useValue: detalleRepositoryMock },
        { provide: MediosPagoService, useValue: mediosPagoServiceMock },
        { provide: TarjetaService, useValue: tarjetaServiceMock },
        { provide: ComerciosService, useValue: comerciosServiceMock },
      ],
    }).compile();

    service = module.get<PagoService>(PagoService);
    jest.clearAllMocks();
  });

  it('processTransaction debe aprobar y guardar detalle e historial', async () => {
    jwtServiceMock.verifyAsync.mockResolvedValue({
      transactionId: 'tx-1',
      idOrden: 'ORD-1',
      monto: 1250,
      moneda: 'CLP',
      nombreComercio: 'Demo',
      returnUrl: 'http://localhost:3000/ok',
      tipo: 'transaccion-init',
      iatAt: new Date().toISOString(),
    });
    transaccionRepositoryMock.findOne.mockResolvedValue({ id: 'tx-1', estado: EstadoTransaccionDb.PENDIENTE });
    tarjetaServiceMock.autorizarBanco.mockResolvedValue({
      estado: 'APROBADA',
      message: 'Pago aprobado por saldo suficiente',
      montoSolicitado: 1250,
      saldoDisponible: 50000,
      tarjeta: {
        id: 1,
        numeroMask: '1111****4444',
        titular: 'Juan Perez',
        fechaExpiracion: '12/28',
        dinero: 48750,
        estado: null,
      },
    });
    transaccionRepositoryMock.save.mockResolvedValue({ id: 'tx-1', estado: EstadoTransaccionDb.APROBADO });

    const result = await service.processTransaction('jwt-token', {
      idOrden: 'ORD-1',
      numeroTarjeta: '1111222233334444',
      titular: 'Juan Perez',
      fechaExpiracion: '12/28',
      cvv: '123',
    });

    expect(detalleRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoPago: TipoPagoDb.TARJETA,
        ultimosCuatro: '4444',
        emisorTarjeta: 'VISA',
        paymentMethodToken: null,
      }),
    );
    expect(tarjetaServiceMock.autorizarBanco).toHaveBeenCalled();
    expect(mediosPagoServiceMock.guardarTarjeta).not.toHaveBeenCalled();
    expect(historialRepositoryMock.save).toHaveBeenCalled();
    expect(result.status).toBe(EstadoRespuestaTransaccion.APROBADO);
  });

  it('tokenizeMitCard debe guardar tarjeta y crear mandato', async () => {
    credencialComercioRepositoryMock.findOne.mockResolvedValue({ id: 'mc-1', estado: 'ACTIVA' });
    mediosPagoServiceMock.guardarTarjeta.mockResolvedValue({
      id: 'pm-1',
      brand: 'VISA',
      last4: '4444',
      expMonth: 12,
      expYear: 2028,
      holderName: 'Juan Perez',
    });
    mediosPagoServiceMock.crearMandato.mockResolvedValue({ id: 'md-1' });

    const result = await service.tokenizeMitCard({
      card: {
        numero: '1111222233334444',
        exp_mes: '12',
        exp_ano: '2028',
        cvc: '123',
      },
      titular: 'Juan Perez',
    }, 'mc-1');

    expect(mediosPagoServiceMock.guardarTarjeta).toHaveBeenCalled();
    expect(mediosPagoServiceMock.crearMandato).toHaveBeenCalled();
    expect(result.paymentMethodToken).toBe('pm-1');
    expect(result.mandateId).toBe('md-1');
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
