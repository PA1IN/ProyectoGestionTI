import { Test, TestingModule } from '@nestjs/testing';
import { PagoController } from './pago.controller';
import { PagoService } from './pago.service';
import { EstadoRespuestaTransaccion } from './enums/estado-respuesta-transaccion.enum';
import { ComerciosService } from '../comercios/comercios.service';

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
    getTransactionInfo: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PagoController],
      providers: [
        { provide: PagoService, useValue: pagoServiceMock },
        {
          provide: ComerciosService,
          useValue: {
            validarCredenciales: jest.fn(),
          },
        },
      ],
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

  it('debe exponer los getters simples del modulo', async () => {
    pagoServiceMock.getAllTransacciones.mockResolvedValue([]);
    pagoServiceMock.getAllDetalles.mockResolvedValue([]);
    pagoServiceMock.getAllHistoriales.mockResolvedValue([]);
    pagoServiceMock.getDetalleTransaccion.mockResolvedValue(null);
    pagoServiceMock.getHistorialTransaccion.mockResolvedValue(null);
    pagoServiceMock.getTransactionInfo.mockResolvedValue(null);

    await expect(controller.getAllTransacciones()).resolves.toEqual([]);
    await expect(controller.getAllDetalles()).resolves.toEqual([]);
    await expect(controller.getAllHistoriales()).resolves.toEqual([]);
    await expect(controller.getDetalleTransaccion('1')).resolves.toBeNull();
    await expect(controller.getHistorialTransaccion('uuid-1')).resolves.toBeNull();
    await expect(controller.getTransactionInfo({ merchantCredential: { id: 'mc-1' } } as never, 'tx-1')).resolves.toBeNull();
  });
});
