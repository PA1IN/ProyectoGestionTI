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
import { Transaccion } from './entities/transaccion.entity';
import { HistorialTransaccion } from './entities/historial-transaccion.entity';
import { DetalleTransaccion, TipoPagoDb } from './entities/detalle-transaccion.entity';
import { EstadoRespuestaTransaccion } from './enums/estado-respuesta-transaccion.enum';
import { EstadoTransaccionDb } from './enums/transaccion.enum';
import { RabbitMqService } from '@app/rmq';

describe('PagoService', () => {
  let service: PagoService;
  const fetchMock = jest.fn();

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

  const rmqServiceMock = {
    publish: jest.fn(),
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
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    (globalThis as any).fetch = fetchMock;
    (global as any).fetch = fetchMock;
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
        { provide: RabbitMqService, useValue: rmqServiceMock },
        { provide: ComerciosService, useValue: comerciosServiceMock },
      ],
    }).compile();

    service = module.get<PagoService>(PagoService);
    jest.clearAllMocks();
    fetchMock.mockResolvedValue({ ok: true, status: 204 });
    detalleRepositoryMock.createQueryBuilder.mockReturnValue({
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    });
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
    transaccionRepositoryMock.findOne.mockResolvedValue({ id: 'tx-1', estado: EstadoTransaccionDb.PENDIENTE, idOrden: 'ORD-1', merchantCredentialId: 'mc-1' });
    credencialComercioRepositoryMock.findOne.mockResolvedValue({ id: 'mc-1', estado: 'ACTIVA', nombreComercio: 'Demo', webhookUrl: 'http://merchant.local/webhook' });
    const webhookSpy = jest.spyOn(service as any, 'notificarWebhookComercio').mockResolvedValue(undefined);
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
      numeroTarjeta: '4111111111111111',
      titular: 'Juan Perez',
      fechaExpiracion: '12/28',
      cvv: '123',
    });

    expect(detalleRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoPago: TipoPagoDb.TARJETA,
        ultimosCuatro: '1111',
        emisorTarjeta: 'VISA',
        paymentMethodToken: null,
      }),
    );
    expect(tarjetaServiceMock.autorizarBanco).toHaveBeenCalled();
    expect(mediosPagoServiceMock.guardarTarjeta).not.toHaveBeenCalled();
    expect(historialRepositoryMock.save).toHaveBeenCalled();
    expect(webhookSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'mc-1',
        webhookUrl: 'http://merchant.local/webhook',
      }),
      expect.objectContaining({
        event: 'transaction.approved',
        operationType: 'CIT',
        transactionId: 'tx-1',
        idOrden: 'ORD-1',
      }),
    );
    expect(result.status).toBe(EstadoRespuestaTransaccion.APROBADO);
  });

  it('processTransaction debe rechazar y notificar webhook con motivo', async () => {
    jwtServiceMock.verifyAsync.mockResolvedValue({
      transactionId: 'tx-2',
      idOrden: 'ORD-2',
      monto: 1250,
      moneda: 'CLP',
      nombreComercio: 'Demo',
      returnUrl: 'http://localhost:3000/ok',
      tipo: 'transaccion-init',
      iatAt: new Date().toISOString(),
    });
    transaccionRepositoryMock.findOne.mockResolvedValue({ id: 'tx-2', estado: EstadoTransaccionDb.PENDIENTE, idOrden: 'ORD-2', merchantCredentialId: 'mc-1' });
    credencialComercioRepositoryMock.findOne.mockResolvedValue({ id: 'mc-1', estado: 'ACTIVA', nombreComercio: 'Demo', webhookUrl: 'http://merchant.local/webhook' });
    const webhookSpy = jest.spyOn(service as any, 'notificarWebhookComercio').mockResolvedValue(undefined);
    tarjetaServiceMock.autorizarBanco.mockResolvedValue({
      estado: 'RECHAZADA',
      message: 'Tarjeta rechazada por saldo insuficiente',
    });

    const result = await service.processTransaction('jwt-token', {
      idOrden: 'ORD-2',
      numeroTarjeta: '4111111111111111',
      titular: 'Juan Perez',
      fechaExpiracion: '12/28',
      cvv: '123',
    });

    expect(result.status).toBe(EstadoRespuestaTransaccion.RECHAZADO);
    expect(webhookSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'mc-1',
        webhookUrl: 'http://merchant.local/webhook',
      }),
      expect.objectContaining({
        event: 'transaction.rejected',
        operationType: 'CIT',
        transactionId: 'tx-2',
        idOrden: 'ORD-2',
        reason: 'Tarjeta rechazada por saldo insuficiente',
        card: expect.objectContaining({
          expMonth: 12,
          expYear: 2028,
        }),
      }),
    );
  });

  it('processMitPayment debe aprobar y notificar webhook', async () => {
    credencialComercioRepositoryMock.findOne.mockResolvedValue({
      id: 'mc-1',
      estado: 'ACTIVA',
      nombreComercio: 'Demo',
      webhookUrl: 'http://merchant.local/webhook',
    });
    mediosPagoServiceMock.buscarTarjetaPorToken.mockResolvedValue({
      brand: 'VISA',
      last4: '4444',
      expMonth: 12,
      expYear: 2028,
      holderName: 'Juan Perez',
      numeroPan: '1111222233334444',
    });
    mediosPagoServiceMock.buscarMandatoPorTarjetaYComercio.mockResolvedValue({ id: 'md-1' });
    transaccionRepositoryMock.findOne.mockResolvedValue(null);
    const webhookSpy = jest.spyOn(service as any, 'notificarWebhookComercio').mockResolvedValue(undefined);
    tarjetaServiceMock.autorizarBanco.mockResolvedValue({
      estado: 'APROBADA',
      message: 'Pago aprobado',
    });
    transaccionRepositoryMock.save.mockResolvedValue({
      id: 'tx-mit-1',
      estado: EstadoTransaccionDb.APROBADO,
      rrn: 123456,
    });

    const result = await service.processMitPayment({
      idOrden: 'ORD-MIT-1',
      monto: 2500,
      moneda: 'clp',
      paymentMethodToken: '11111111-1111-4111-8111-111111111111',
      customer: 'Cliente Demo',
    }, 'mc-1');

    expect(result.status).toBe(EstadoRespuestaTransaccion.APROBADO);
    expect(webhookSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'mc-1',
        webhookUrl: 'http://merchant.local/webhook',
      }),
      expect.objectContaining({
        event: 'transaction.approved',
        operationType: 'MIT',
        transactionId: 'tx-mit-1',
        idOrden: 'ORD-MIT-1',
      }),
    );
  });

  it('processMitPayment debe rechazar y notificar webhook con motivo', async () => {
    credencialComercioRepositoryMock.findOne.mockResolvedValue({
      id: 'mc-1',
      estado: 'ACTIVA',
      nombreComercio: 'Demo',
      webhookUrl: 'http://merchant.local/webhook',
    });
    mediosPagoServiceMock.buscarTarjetaPorToken.mockResolvedValue({
      brand: 'VISA',
      last4: '4444',
      expMonth: 12,
      expYear: 2028,
      holderName: 'Juan Perez',
      numeroPan: '1111222233334444',
    });
    mediosPagoServiceMock.buscarMandatoPorTarjetaYComercio.mockResolvedValue({ id: 'md-1' });
    transaccionRepositoryMock.findOne.mockResolvedValue(null);
    const webhookSpy = jest.spyOn(service as any, 'notificarWebhookComercio').mockResolvedValue(undefined);
    transaccionRepositoryMock.save.mockResolvedValue({
      id: 'tx-mit-2',
      estado: EstadoTransaccionDb.RECHAZADO,
      rrn: 123456,
    });
    tarjetaServiceMock.autorizarBanco.mockResolvedValue({
      estado: 'RECHAZADA',
      message: 'Saldo insuficiente',
    });

    const result = await service.processMitPayment({
      idOrden: 'ORD-MIT-2',
      monto: 2500,
      moneda: 'clp',
      paymentMethodToken: '11111111-1111-4111-8111-111111111111',
      customer: 'Cliente Demo',
    }, 'mc-1');

    expect(result.status).toBe(EstadoRespuestaTransaccion.RECHAZADO);
    expect(webhookSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'mc-1',
        webhookUrl: 'http://merchant.local/webhook',
      }),
      expect.objectContaining({
        event: 'transaction.rejected',
        operationType: 'MIT',
        transactionId: 'tx-mit-2',
        idOrden: 'ORD-MIT-2',
        reason: 'Saldo insuficiente',
      }),
    );
  });

  it('createTransaction debe emitir alerta NOT_EQUAL cuando la orden se reutiliza con otro monto', async () => {
    credencialComercioRepositoryMock.findOne.mockResolvedValue({
      id: 'mc-1',
      estado: 'ACTIVA',
      nombreComercio: 'Demo',
      webhookUrl: 'http://merchant.local/webhook',
    });
    transaccionRepositoryMock.findOne.mockResolvedValue({
      id: 'tx-1',
      monto: '1000.00',
      moneda: 'CLP',
      merchantCredentialId: 'mc-1',
    });

    await expect(service.createTransaction({
      idOrden: 'ORD-1',
      monto: 2000,
      moneda: 'CLP',
      nombreComercio: 'Demo',
      returnUrl: 'http://localhost:3000/ok',
    }, 'mc-1')).rejects.toThrow('El id de orden ya fue utilizado con otra solicitud');

    expect(rmqServiceMock.publish).toHaveBeenCalledWith(
      'pagos.notificaciones.webhooks',
      expect.objectContaining({
        targetUrl: 'http://merchant.local/webhook',
        payload: expect.objectContaining({
          sistema_id: 'P04',
          payload: expect.objectContaining({
            error: 'NOT_EQUAL',
            id_transaccion: 'tx-1',
            monto_original: 1000,
            monto_cobrado: 2000,
          }),
        }),
      }),
    );
    expect(rmqServiceMock.publish).toHaveBeenCalledWith(
      'analitica.alertas.transacciones',
      expect.objectContaining({
        payload: expect.objectContaining({
          error: 'NOT_EQUAL',
        }),
      }),
    );
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
