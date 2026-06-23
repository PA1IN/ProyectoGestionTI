import { Test, TestingModule } from '@nestjs/testing';
import { PagoController } from './pago.controller';
import { PagoService } from './pago.service';
import { EstadoRespuestaTransaccion } from './enums/estado-respuesta-transaccion.enum';

describe('PagoController', () => {
  let controller: PagoController;
  const pagoServiceMock = {
    createTransaction: jest.fn(),
    processCheckout: jest.fn(),
    tokenizeMitCard: jest.fn(),
    processTransaction: jest.fn(),
    processMitPayment: jest.fn(),
    getAllTransacciones: jest.fn(),
    getAllDetalles: jest.fn(),
    getAllHistoriales: jest.fn(),
    getDetalleTransaccion: jest.fn(),
    getHistorialTransaccion: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PagoController],
      providers: [{ provide: PagoService, useValue: pagoServiceMock }],
    }).compile();

    controller = module.get<PagoController>(PagoController);
    jest.clearAllMocks();
  });

  it('debe llamar al servicio al crear una transaccion', async () => {
    const payload = {
      idOrden: 'ORD-1',
      monto: 1000,
      moneda: 'CLP',
      nombreComercio: 'Demo',
      returnUrl: 'http://localhost:3000/resultado/exito',
    };
    pagoServiceMock.createTransaction.mockResolvedValue({ token: 'token', transactionUrl: 'url' });

    await expect(controller.createTransaction({ merchantCredential: { id: 'mc-1' } } as never, payload as never)).resolves.toEqual({ token: 'token', transactionUrl: 'url' });
    expect(pagoServiceMock.createTransaction).toHaveBeenCalledWith(payload, 'mc-1');
  });

  it('debe llamar al servicio al procesar el checkout', async () => {
    const payload = {
      idOrden: 'ORD-2',
      numeroTarjeta: '1111222233334444',
      titular: 'Juan Perez',
      fechaExpiracion: '12/28',
      cvv: '123',
    };
    pagoServiceMock.processTransaction.mockResolvedValue({
      status: EstadoRespuestaTransaccion.APROBADO,
      message: 'Transacción aprobada',
      redirectUrl: 'http://localhost:3000/resultado/exito',
      transactionId: 'tx-1',
    });

    await expect(controller.processCheckout('token', payload as never)).resolves.toMatchObject({
      status: EstadoRespuestaTransaccion.APROBADO,
    });
    expect(pagoServiceMock.processTransaction).toHaveBeenCalledWith('token', payload);
  });

  //mover este spec a medios-pago, ahi se tokeniza
  it('debe llamar al servicio al tokenizar una tarjeta mit', async () => {
    const payload = {
      idOrden: 'ORD-3',
      card: {
        number: '4111111111111111',
        exp_month: '12',
        exp_year: '2028',
        cvc: '123',
      },
      titular: 'Juan Perez',
    };
    pagoServiceMock.tokenizeMitCard.mockResolvedValue({
      status: EstadoRespuestaTransaccion.APROBADO,
      message: 'Tarjeta tokenizada correctamente',
      paymentMethodToken: 'pm-1',
      mandateId: 'md-1',
      card: {
        paymentMethodToken: 'pm-1',
        brand: 'VISA',
        last4: '1111',
        expMonth: 12,
        expYear: 2028,
        holderName: 'Juan Perez',
      },
    });

    await expect(controller.tokenizeMit({ merchantCredential: { id: 'mc-1' } } as never, payload as never)).resolves.toMatchObject({
      status: EstadoRespuestaTransaccion.APROBADO,
    });
    expect(pagoServiceMock.tokenizeMitCard).toHaveBeenCalledWith(payload, 'mc-1');
  });

  it('debe exponer los getters simples del modulo', async () => {
    pagoServiceMock.getAllTransacciones.mockResolvedValue([]);
    pagoServiceMock.getAllDetalles.mockResolvedValue([]);
    pagoServiceMock.getAllHistoriales.mockResolvedValue([]);
    pagoServiceMock.getDetalleTransaccion.mockResolvedValue(null);
    pagoServiceMock.getHistorialTransaccion.mockResolvedValue(null);

    await expect(controller.getAllTransacciones()).resolves.toEqual([]);
    await expect(controller.getAllDetalles()).resolves.toEqual([]);
    await expect(controller.getAllHistoriales()).resolves.toEqual([]);
    await expect(controller.getDetalleTransaccion('1')).resolves.toBeNull();
    await expect(controller.getHistorialTransaccion('uuid-1')).resolves.toBeNull();
  });
});
