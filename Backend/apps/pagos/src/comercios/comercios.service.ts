import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { CredencialComercio, EstadoCredencialComercioDb } from './entities/credencial-comercio.entity';
import { CreateComercioDto } from './dto/create-comercio.dto';

@Injectable()
export class ComerciosService {
  constructor(
    @InjectRepository(CredencialComercio)
    private readonly credencialComercioRepository: Repository<CredencialComercio>,
  ) {}

  async validarCredenciales(privateKey: string) {
    return this.credencialComercioRepository.findOne({
      where: {
        //publicKey,
        privateKey,
        estado: EstadoCredencialComercioDb.ACTIVA,
      },
    });
  }

  async buscarPorId(id: string) {
    return this.credencialComercioRepository.findOne({ where: { id } });
  }

  async create(createComercioDto: CreateComercioDto) {
    const nombreComercio = createComercioDto.nombreComercio.trim();
    const existing = await this.credencialComercioRepository.findOne({
      where: { nombreComercio },
    });

    if (existing) {
      throw new ConflictException('Ya existe un comercio con ese nombre');
    }

    const publicKey = `pk_${randomUUID().replace(/-/g, '')}`;
    const privateKey = `sk_${randomUUID().replace(/-/g, '')}`;

    const comercio = this.credencialComercioRepository.create({
      nombreComercio,
      publicKey,
      privateKey,
      estado: createComercioDto.estado ?? EstadoCredencialComercioDb.ACTIVA,
    });

    const saved = await this.credencialComercioRepository.save(comercio);

    return {
      id: saved.id,
      nombreComercio: saved.nombreComercio,
      publicKey: saved.publicKey,
      privateKey: saved.privateKey,
      estado: saved.estado,
      createdAt: saved.createdAt,
    };
  }

  async findAll() {
    return this.credencialComercioRepository.find({
      order: { createdAt: 'DESC' },
    });
  }
}