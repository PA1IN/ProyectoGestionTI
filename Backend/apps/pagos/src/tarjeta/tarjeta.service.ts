import { Injectable } from '@nestjs/common';
import { CreateTarjetaDto } from './dto/create-tarjeta.dto';
import { Tarjeta } from './entities/tarjeta.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class TarjetaService {
  constructor(
    @InjectRepository(Tarjeta)
    private readonly tarjetaRepository: Repository<Tarjeta>,
  ) {}
  async create(createTarjetaDto: CreateTarjetaDto) {
    const tarjeta = this.tarjetaRepository.create(createTarjetaDto);
    await this.tarjetaRepository.save(tarjeta);
    return "la tarjeta se ha creado correctamente";
  }

  async findAll() {
    return await this.tarjetaRepository.find();
  }

  async findOne(id: number) {
    return await this.tarjetaRepository.findOne({ where: { id } });
  }


}
