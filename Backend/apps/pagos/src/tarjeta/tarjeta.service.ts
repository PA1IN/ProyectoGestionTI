import { ConflictException, Injectable } from '@nestjs/common';
import { CreateTarjetaDto } from './dto/create-tarjeta.dto';
import { Tarjeta } from './entities/tarjeta.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AutorizarTarjetaBancoDto } from './dto/autorizar-tarjeta-banco.dto';
import { BancoAutorizacionResponse, BancoEstadoOperacion } from './types/banco.types';

@Injectable()
export class TarjetaService {
  constructor(
    @InjectRepository(Tarjeta)
    private readonly tarjetaRepository: Repository<Tarjeta>,
  ) {}
  async create(createTarjetaDto: CreateTarjetaDto) {
    const existing = await this.tarjetaRepository.findOne({ where: { numero: createTarjetaDto.numero } });

    if (existing) {
      throw new ConflictException('Ya existe una tarjeta con ese número');
    }

    const tarjeta = this.tarjetaRepository.create({
      ...createTarjetaDto,
      dinero: createTarjetaDto.dinero ?? null,
      estado: createTarjetaDto.estado ?? null,
    });
    await this.tarjetaRepository.save(tarjeta);
    return "la tarjeta se ha creado correctamente";
  }

  async findAll() {
    return await this.tarjetaRepository.find();
  }

  async findOne(id: number) {
    return await this.tarjetaRepository.findOne({ where: { id } });
  }

  async autorizarBanco(dto: AutorizarTarjetaBancoDto): Promise<BancoAutorizacionResponse> {
    const tarjeta = await this.buscarOCrearTarjeta(dto);
    const montoSolicitado = dto.monto;

    if (tarjeta.estado === 'RECHAZADO') {
      return this.buildRespuestaBanco(tarjeta, montoSolicitado, BancoEstadoOperacion.RECHAZADA, 'Tarjeta rechazada por el banco');
    }

    if (tarjeta.estado === 'APROBADO') {
      return this.buildRespuestaBanco(tarjeta, montoSolicitado, BancoEstadoOperacion.APROBADA, 'Tarjeta aprobada por el banco');
    }

    if (tarjeta.dinero === null) {
      tarjeta.dinero = this.generarDineroAleatorio();
    }

    if (tarjeta.dinero < montoSolicitado) {
      await this.tarjetaRepository.save(tarjeta);
      return this.buildRespuestaBanco(tarjeta, montoSolicitado, BancoEstadoOperacion.RECHAZADA, 'Saldo insuficiente');
    }

    tarjeta.dinero -= montoSolicitado;
    await this.tarjetaRepository.save(tarjeta);

    return this.buildRespuestaBanco(tarjeta, montoSolicitado, BancoEstadoOperacion.APROBADA, 'Pago aprobado por saldo suficiente');
  }

  private async buscarOCrearTarjeta(dto: AutorizarTarjetaBancoDto) {
    const tarjetaExistente = await this.tarjetaRepository.findOne({ where: { numero: dto.numero } });

    if (tarjetaExistente) {
      return tarjetaExistente;
    }

    const tarjeta = this.tarjetaRepository.create({
      numero: dto.numero,
      titular: dto.titular,
      fechaExpiracion: dto.fechaExpiracion,
      cvv: dto.cvv ?? '000',
      dinero: this.generarDineroAleatorio(),
      estado: null,
    });

    return this.tarjetaRepository.save(tarjeta);
  }

  private buildRespuestaBanco(
    tarjeta: Tarjeta,
    montoSolicitado: number,
    estado: BancoEstadoOperacion,
    message: string,
  ): BancoAutorizacionResponse {
    return {
      estado,
      message,
      montoSolicitado,
      saldoDisponible: tarjeta.dinero,
      tarjeta: {
        id: tarjeta.id,
        numeroMask: this.maskNumero(tarjeta.numero),
        titular: tarjeta.titular,
        fechaExpiracion: tarjeta.fechaExpiracion,
        dinero: tarjeta.dinero,
        estado: tarjeta.estado,
      },
    };
  }

  private maskNumero(numero: string) {
    return `${numero.slice(0, 4)}****${numero.slice(-4)}`;
  }

  private generarDineroAleatorio() {
    return Math.floor(Math.random() * (500000 - 50000 + 1)) + 50000;
  }


}
