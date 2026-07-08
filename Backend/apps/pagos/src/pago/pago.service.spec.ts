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
import { EstadoMandatoPagoDb, MandatoPago } from '../medios-pago/entities/mandato-pago.entity';
import { EstadoTarjetaGuardadaDb } from '../medios-pago/entities/tarjeta-guardada.entity';
import { CredencialComercio, EstadoCredencialComercioDb } from '../comercios/entities/credencial-comercio.entity';
import { Transaccion } from './entities/transaccion.entity';
import { HistorialTransaccion } from './entities/historial-transaccion.entity';
import { DetalleTransaccion, TipoPagoDb } from './entities/detalle-transaccion.entity';
import { EstadoTransaccionDb, TipoOperacionTransaccionDb } from './enums/transaccion.enum';
import { EstadoRespuestaTransaccion } from './enums/estado-respuesta-transaccion.enum';
import { RabbitMqService } from '@app/rmq';
import { DataSource } from 'typeorm';

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
    detectarMarcaTarjeta: jest.fn(() => 'VISA'),
  };

  const rmqServiceMock = {
    publish: jest.fn(),
    consume: jest.fn(),
    assertQueue: jest.fn(),
    assertExchange: jest.fn(),
    bindQueue: jest.fn(),
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

  const queryRunnerMock = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      create: jest.fn((entity: any, value: any) => value),
      save: jest.fn(async (entity: any, value: any) => {
        if (entity === Transaccion || entity?.name === 'Transaccion') {
          const idByOrder: Record<string, string> = {
            'ORD-1': 'tx-1',
            'ORD-2': 'tx-2',
            'ORD-MIT-1': 'tx-mit-1',
            'ORD-MIT-2': 'tx-mit-2',
          };

          return {
            ...value,
            id: value.id ?? idByOrder[value.idOrden] ?? `tx-${value.idOrden}`,
          };
        }

        return value;
      }),
    },
  };

  const dataSourceMock = {
    createQueryRunner: jest.fn(() => queryRunnerMock),
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
        { provide: DataSource, useValue: dataSourceMock },
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
      numeroTarjeta: '4111111111111111',
      titular: 'Juan Perez',
      fechaExpiracion: '12/28',
      cvv: '123',
    } as any);

    expect(queryRunnerMock.manager.save).toHaveBeenCalledWith(
      DetalleTransaccion,
      expect.objectContaining({
        tipoPago: TipoPagoDb.TARJETA,
        ultimosCuatro: '1111',
        emisorTarjeta: 'VISA',
        paymentMethodToken: null,
      }),
    );
    expect(tarjetaServiceMock.autorizarBanco).toHaveBeenCalled();
    expect(mediosPagoServiceMock.guardarTarjeta).not.toHaveBeenCalled();
    expect(queryRunnerMock.manager.save).toHaveBeenCalledWith(
      HistorialTransaccion,
      expect.objectContaining({
        statusFrom: EstadoTransaccionDb.PENDIENTE,
        statusTo: EstadoTransaccionDb.APROBADO,
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://analisis-proyecto-ti.onrender.com/v1/events',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://merchant.local/webhook',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(result.status).toBe(EstadoRespuestaTransaccion.APROBADO);
  });

  it('generateCheckoutQr debe devolver un QR firmado para transacciones pendientes', async () => {
    jwtServiceMock.verifyAsync.mockResolvedValue({
      transactionId: 'tx-qr-1',
      idOrden: 'ORD-QR-1',
      monto: 990,
      moneda: 'CLP',
      nombreComercio: 'Demo QR',
      returnUrl: 'http://localhost:3000/ok',
      iatAt: new Date().toISOString(),
    });
    transaccionRepositoryMock.findOne.mockResolvedValue({
      id: 'tx-qr-1',
      estado: EstadoTransaccionDb.PENDIENTE,
    });
    jwtServiceMock.signAsync.mockResolvedValue('signed-qr-token');

    const result = await service.generateCheckoutQr('jwt-token');

    expect(jwtServiceMock.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: 'tx-qr-1',
        idOrden: 'ORD-QR-1',
        medioPago: 'QR',
      }),
      expect.objectContaining({
        secret: 'secret',
        expiresIn: '10m',
      }),
    );
    expect(result).toEqual({
      status: EstadoRespuestaTransaccion.APROBADO,
      message: 'QR generado correctamente',
      transactionId: 'tx-qr-1',
      qrData: 'signed-qr-token',
      codigoQr: 'signed-qr-token',
    });
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
    tarjetaServiceMock.autorizarBanco.mockResolvedValue({
      estado: 'RECHAZADA',
      message: 'Tarjeta rechazada por saldo insuficiente',
    });

    const result = await service.processTransaction('jwt-token', {
      numeroTarjeta: '4111111111111111',
      titular: 'Juan Perez',
      fechaExpiracion: '12/28',
      cvv: '123',
    } as any);

    expect(result.status).toBe(EstadoRespuestaTransaccion.RECHAZADO);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://analisis-proyecto-ti.onrender.com/v1/events',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://merchant.local/webhook',
      expect.objectContaining({
        method: 'POST',
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
      id: 'card-1',
      estado: EstadoTarjetaGuardadaDb.ACTIVA,
      brand: 'VISA',
      last4: '4444',
      expMonth: 12,
      expYear: 2028,
      holderName: 'Juan Perez',
      numeroPan: '1111222233334444',
    });
    mediosPagoServiceMock.buscarMandatoPorTarjetaYComercio.mockResolvedValue({ id: 'md-1' });
    transaccionRepositoryMock.findOne.mockResolvedValue(null);
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
      moneda: 'CLP' as any,
      paymentMethodToken: '11111111-1111-4111-8111-111111111111',
      customer: 'Cliente Demo', 
    } as any, 'mc-1');

    expect(result.status).toBe(EstadoRespuestaTransaccion.APROBADO);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://analisis-proyecto-ti.onrender.com/v1/events',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://merchant.local/webhook',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('processMitPayment debe rechazar sin persistir cuando no existe mandato', async () => {
    credencialComercioRepositoryMock.findOne.mockResolvedValue({
      id: 'mc-1',
      estado: 'ACTIVA',
      nombreComercio: 'Demo',
      webhookUrl: 'http://merchant.local/webhook',
    });
    mediosPagoServiceMock.buscarTarjetaPorToken.mockResolvedValue({
      id: 'card-no-mandate',
      estado: EstadoTarjetaGuardadaDb.ACTIVA,
      brand: 'VISA',
      last4: '4444',
      expMonth: 12,
      expYear: 2028,
      holderName: 'Juan Perez',
      numeroPan: '1111222233334444',
    });
    mediosPagoServiceMock.buscarMandatoPorTarjetaYComercio.mockResolvedValue(null);

    await expect(service.processMitPayment({
      idOrden: 'ORD-MIT-NO-MANDATE',
      monto: 2500,
      moneda: 'clp' as any,
      paymentMethodToken: '11111111-1111-4111-8111-111111111111',
      customer: 'Cliente Demo',
    } as any, 'mc-1')).rejects.toThrow('No existe un mandato activo para este comercio');

    expect(dataSourceMock.createQueryRunner).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('processMitPayment debe continuar con mandato suspendido', async () => {
    credencialComercioRepositoryMock.findOne.mockResolvedValue({
      id: 'mc-1',
      estado: 'ACTIVA',
      nombreComercio: 'Demo',
      webhookUrl: 'http://merchant.local/webhook',
    });
    mediosPagoServiceMock.buscarTarjetaPorToken.mockResolvedValue({
      id: 'card-suspended',
      estado: EstadoTarjetaGuardadaDb.ACTIVA,
      brand: 'VISA',
      last4: '4444',
      expMonth: 12,
      expYear: 2028,
      holderName: 'Juan Perez',
      numeroPan: '1111222233334444',
    });
    mediosPagoServiceMock.buscarMandatoPorTarjetaYComercio.mockResolvedValue({
      id: 'md-suspended',
      estado: EstadoMandatoPagoDb.SUSPENDIDO,
    });
    transaccionRepositoryMock.findOne.mockResolvedValue(null);
    tarjetaServiceMock.autorizarBanco.mockResolvedValue({
      estado: 'APROBADA',
      message: 'Pago aprobado',
    });
    transaccionRepositoryMock.save.mockResolvedValue({
      id: 'tx-mit-suspended',
      estado: EstadoTransaccionDb.APROBADO,
      rrn: 123456,
    });

    const result = await service.processMitPayment({
      idOrden: 'ORD-MIT-SUSPENDED',
      monto: 2500,
      moneda: 'clp' as any,
      paymentMethodToken: '11111111-1111-4111-8111-111111111111',
      customer: 'Cliente Demo',
    } as any, 'mc-1');

    expect(result.status).toBe(EstadoRespuestaTransaccion.APROBADO);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://analisis-proyecto-ti.onrender.com/v1/events',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://merchant.local/webhook',
      expect.objectContaining({ method: 'POST' }),
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
      id: 'card-2',
      estado: EstadoTarjetaGuardadaDb.ACTIVA,
      brand: 'VISA',
      last4: '4444',
      expMonth: 12,
      expYear: 2028,
      holderName: 'Juan Perez',
      numeroPan: '1111222233334444',
    });
    mediosPagoServiceMock.buscarMandatoPorTarjetaYComercio.mockResolvedValue({ id: 'md-1' });
    transaccionRepositoryMock.findOne.mockResolvedValue(null);
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
      moneda: 'clp' as any,
      paymentMethodToken: '11111111-1111-4111-8111-111111111111',
      customer: 'Cliente Demo',
    } as any, 'mc-1');

    expect(result.status).toBe(EstadoRespuestaTransaccion.RECHAZADO);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://analisis-proyecto-ti.onrender.com/v1/events',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://merchant.local/webhook',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(queryRunnerMock.manager.save).toHaveBeenCalledWith(
      MandatoPago,
      expect.objectContaining({
        id: 'md-1',
        estado: EstadoMandatoPagoDb.SUSPENDIDO,
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

    expect(fetchMock).toHaveBeenCalledWith(
      'https://proyecto11-mochicode.onrender.com/api/v1/alertas',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('createTransaction debe guardar rrn al crear y programar expiracion en RabbitMQ', async () => {
    credencialComercioRepositoryMock.findOne.mockResolvedValue({
      id: 'mc-1',
      estado: 'ACTIVA',
      nombreComercio: 'Demo',
      webhookUrl: 'http://merchant.local/webhook',
    });
    transaccionRepositoryMock.findOne.mockResolvedValue(null);
    jwtServiceMock.signAsync.mockResolvedValue('signed-checkout-token');

    const result = await service.createTransaction({
      idOrden: 'ORD-NEW-1',
      monto: 1500,
      moneda: 'CLP',
      nombreComercio: 'Demo',
      returnUrl: 'http://localhost:3000/ok',
    }, 'mc-1');

    expect(transaccionRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        idOrden: 'ORD-NEW-1',
        estado: EstadoTransaccionDb.PENDIENTE,
        rrn: expect.any(Number),
      }),
    );
    expect(rmqServiceMock.assertExchange).toHaveBeenCalledWith(
      'pagos.expiracion.dlx',
      'direct',
      expect.objectContaining({ durable: true }),
    );
    expect(rmqServiceMock.assertQueue).toHaveBeenCalledWith(
      'pagos.expiracion',
      expect.objectContaining({
        durable: true,
        arguments: expect.objectContaining({
          'x-message-ttl': 300000,
          'x-dead-letter-exchange': 'pagos.expiracion.dlx',
          'x-dead-letter-routing-key': 'pagos.expiracion.dlq',
        }),
      }),
    );
    expect(rmqServiceMock.publish).toHaveBeenCalledWith(
      'pagos.expiracion',
      expect.objectContaining({
        transactionId: result.transactionId,
        createdAt: expect.any(String),
      }),
    );
    expect(result.transactionId).toBeDefined();
    expect(result.token).toBe('signed-checkout-token');
  });

  it('getAllTransacciones devuelve el repositorio', async () => {
    transaccionRepositoryMock.find.mockResolvedValue([{ id: 'tx-1' }]);

    await expect(service.getAllTransacciones()).resolves.toEqual([{ id: 'tx-1' }]);
  });

  it('getDetalleTransaccion retorna null cuando no existe', async () => {
    detalleRepositoryMock.findOne.mockResolvedValue(null);

    await expect(service.getDetalleTransaccion(1)).resolves.toBeNull();
  });
  it('processQrTransaction debe aprobar simulación, guardar detalle QR e historial', async () => {
    // 1. Setup
    jwtServiceMock.verifyAsync.mockResolvedValue({
      transactionId: 'tx-qr-2',
      idOrden: 'ORD-QR-2',
      monto: 5000,
      moneda: 'CLP',
      nombreComercio: 'Comercio UCN',
      returnUrl: 'http://localhost:3000/return',
      medioPago: 'QR', // Simula que es el token correcto de QR
      iatAt: new Date().toISOString(),
    });

    transaccionRepositoryMock.findOne.mockResolvedValue({
      id: 'tx-qr-2',
      estado: EstadoTransaccionDb.PENDIENTE,
      idOrden: 'ORD-QR-2',
      merchantCredentialId: 'mc-1',
    });

    credencialComercioRepositoryMock.findOne.mockResolvedValue({
      id: 'mc-1',
      estado: EstadoCredencialComercioDb.ACTIVA,
      nombreComercio: 'Comercio UCN',
      webhookUrl: 'http://merchant.local/webhook',
    });

    // 2. Ejecución
    const result = await service.processQrTransaction('token-qr-valido');

    // 3. Verificaciones de Base de Datos
    expect(detalleRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        nombreUsuario: 'COMPRADOR_QR_SIMULADO', // Valor harcodeado en tu función
        tipoPago: TipoPagoDb.QR,
        ultimosCuatro: null, // Verificamos que maneje bien los nulos
        emisorTarjeta: 'BILLETERA_DIGITAL',
      })
    );

    expect(historialRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        statusFrom: EstadoTransaccionDb.PENDIENTE,
        statusTo: EstadoTransaccionDb.APROBADO,
      })
    );

    expect(transaccionRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'tx-qr-2',
        estado: EstadoTransaccionDb.APROBADO,
        tipoOperacion: TipoOperacionTransaccionDb.CIT,
      })
    );

    // 4. Verificaciones de webhooks directos
    expect(fetchMock).toHaveBeenCalledWith(
      'https://analisis-proyecto-ti.onrender.com/v1/events',
      expect.objectContaining({ method: 'POST' }),
    );

    // 5. Verificación de la respuesta
    expect(result).toEqual({
      status: EstadoRespuestaTransaccion.APROBADO,
      message: 'Transacción QR aprobada exitosamente (Simulado)',
      redirectUrl: 'http://localhost:3000/return?status=APROBADO&transactionId=tx-qr-2',
      transactionId: 'tx-qr-2',
      details: {
        monto: 5000,
        moneda: 'CLP',
        nombreComercio: 'Comercio UCN',
      },
    });
  });

  it('processQrTransaction debe fallar si el token NO corresponde a un pago QR', async () => {
    // 1. Setup: Simulamos el payload del Token A (el del checkout normal)
    jwtServiceMock.verifyAsync.mockResolvedValue({
      transactionId: 'tx-qr-3',
      idOrden: 'ORD-QR-3',
      // NOTA: Falta la propiedad medioPago: 'QR'
    });

    // 2. Ejecución y Verificación
    // Como el servicio atrapa el error y lanza un UnauthorizedException genérico
    await expect(service.processQrTransaction('token-normal')).rejects.toThrow(
      'Token de QR inválido o expirado' 
      // o 'El token provisto no corresponde a una operación por QR' dependiendo de tu versión final del catch
    );

    // Nos aseguramos de que no guardó nada
    expect(transaccionRepositoryMock.findOne).not.toHaveBeenCalled();
    expect(detalleRepositoryMock.save).not.toHaveBeenCalled();
  });

  it('processQrTransaction debe devolver el estado previo si la transacción ya fue procesada', async () => {
    // 1. Setup
    jwtServiceMock.verifyAsync.mockResolvedValue({
      transactionId: 'tx-qr-4',
      idOrden: 'ORD-QR-4',
      monto: 1000,
      moneda: 'CLP',
      nombreComercio: 'Comercio UCN',
      returnUrl: 'http://localhost:3000/return',
      medioPago: 'QR',
    });

    // Simulamos que la base de datos devuelve una transacción YA APROBADA
    transaccionRepositoryMock.findOne.mockResolvedValue({
      id: 'tx-qr-4',
      estado: EstadoTransaccionDb.APROBADO,
      idOrden: 'ORD-QR-4',
      merchantCredentialId: 'mc-1',
    });

    credencialComercioRepositoryMock.findOne.mockResolvedValue({
      id: 'mc-1',
      estado: EstadoCredencialComercioDb.ACTIVA,
    });

    // 2. Ejecución
    const result = await service.processQrTransaction('token-ya-usado');

    // 3. Verificaciones
    expect(detalleRepositoryMock.save).not.toHaveBeenCalled(); // No debe guardar un nuevo detalle
    expect(result.status).toBe(EstadoRespuestaTransaccion.APROBADO);
    expect(result.message).toBe('Transacción ya aprobada');
    expect(result.redirectUrl).toContain('status=APROBADO');
  });
  
});
