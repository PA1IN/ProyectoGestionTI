import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediosPagoService } from './medios-pago.service';
import { TarjetaGuardada } from './entities/tarjeta-guardada.entity';
import { MandatoPago } from './entities/mandato-pago.entity';
import { CredencialComercio } from '../comercios/entities/credencial-comercio.entity';
import { EstadoRespuestaTransaccion } from '../pago/enums/estado-respuesta-transaccion.enum';
import { EstadoTarjetaGuardadaDb } from './entities/tarjeta-guardada.entity';

describe('MediosPagoService', () => {
  let service: MediosPagoService;

  const tarjetaRepositoryMock = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mandatoRepositoryMock = {
    create: jest.fn((value) => value),
    save: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
  };

  const credencialRepositoryMock = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediosPagoService,
        { provide: getRepositoryToken(TarjetaGuardada), useValue: tarjetaRepositoryMock },
        { provide: getRepositoryToken(MandatoPago), useValue: mandatoRepositoryMock },
        { provide: getRepositoryToken(CredencialComercio), useValue: credencialRepositoryMock },
      ],
    }).compile();

    service = module.get<MediosPagoService>(MediosPagoService);
    jest.clearAllMocks();
  });

  it('eliminarTarjetaGuardada debe revocar los mandatos asociados', async () => {
    tarjetaRepositoryMock.findOne.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      estado: EstadoTarjetaGuardadaDb.ACTIVA,
    });
    tarjetaRepositoryMock.save.mockResolvedValue({
      id: 'token-1',
      estado: EstadoTarjetaGuardadaDb.ELIMINADA,
    });
    mandatoRepositoryMock.update.mockResolvedValue({ affected: 1 });

    const result = await service.eliminarTarjetaGuardada('user-1', 'token-1');

    expect(result).toEqual({
      status: EstadoRespuestaTransaccion.APROBADO,
      message: 'Tarjeta eliminada correctamente',
    });
    expect(tarjetaRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'token-1',
        estado: EstadoTarjetaGuardadaDb.ELIMINADA,
      }),
    );
    expect(mandatoRepositoryMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentMethodToken: 'token-1',
      }),
      expect.objectContaining({
        estado: 'REVOCADO',
      }),
    );
  });
});
