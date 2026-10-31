import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Unidade } from '../../database/entities/unidade.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { Vinculo } from '../../database/entities/vinculo.entity';
import { CreateUnitDto } from './dto/create-unit.dto';
import { LinkResidentDto } from './dto/link-resident.dto';
import { ListUnitsQueryDto } from './dto/list-units-query.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

const UNIT_UNIQUE_CONSTRAINT = 'UQ_unidades_bloco_numero';
const RESIDENT_UNIQUE_CONSTRAINT = 'UQ_vinculos_usuario_unidade';

@Injectable()
export class UnitsService {
  constructor(
    @InjectRepository(Unidade)
    private readonly unitsRepository: Repository<Unidade>,
    @InjectRepository(Usuario)
    private readonly usersRepository: Repository<Usuario>,
    @InjectRepository(Vinculo)
    private readonly linksRepository: Repository<Vinculo>,
  ) {}

  async list(query: ListUnitsQueryDto) {
    const [data, total] = await this.unitsRepository.findAndCount({
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      order: { id: 'ASC' },
    });

    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async findOne(id: number) {
    const unit = await this.unitsRepository.findOneBy({ id });
    if (!unit) {
      throw new NotFoundException('Unidade não encontrada.');
    }

    const links = await this.linksRepository.find({
      where: { unidade: { id } },
      relations: { usuario: true },
      order: { id: 'ASC' },
    });

    return {
      ...unit,
      moradores: links.map(({ usuario, tipo }) => ({
        usuarioId: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo,
      })),
    };
  }

  async create(dto: CreateUnitDto): Promise<Unidade> {
    const existing = await this.unitsRepository.findOneBy({
      bloco: dto.bloco,
      numero: dto.numero,
    });
    if (existing) {
      throw new ConflictException(
        'Já existe uma unidade neste bloco e número.',
      );
    }

    const unit = this.unitsRepository.create(dto);
    try {
      return await this.unitsRepository.save(unit);
    } catch (error) {
      this.throwForUniqueConstraint(error, UNIT_UNIQUE_CONSTRAINT);
      throw error;
    }
  }

  async update(id: number, dto: UpdateUnitDto): Promise<Unidade> {
    const unit = await this.unitsRepository.findOneBy({ id });
    if (!unit) {
      throw new NotFoundException('Unidade não encontrada.');
    }

    Object.assign(unit, dto);
    try {
      return await this.unitsRepository.save(unit);
    } catch (error) {
      this.throwForUniqueConstraint(error, UNIT_UNIQUE_CONSTRAINT);
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    const unit = await this.unitsRepository.findOneBy({ id });
    if (!unit) {
      throw new NotFoundException('Unidade não encontrada.');
    }
    try {
      await this.unitsRepository.remove(unit);
    } catch (error) {
      const driverError = this.getDriverError(error);
      if (driverError?.code === '23503') {
        throw new ConflictException(
          'Não é possível excluir uma unidade que possui outros registros associados.',
        );
      }
      throw error;
    }
  }

  async linkResident(id: number, dto: LinkResidentDto) {
    const unit = await this.unitsRepository.findOneBy({ id });
    if (!unit) {
      throw new NotFoundException('Unidade não encontrada.');
    }

    const user = await this.usersRepository.findOneBy({ id: dto.usuarioId });
    if (!user) {
      throw new NotFoundException('Morador não encontrado.');
    }

    const existing = await this.linksRepository.findOneBy({
      unidade: { id },
      usuario: { id: dto.usuarioId },
    });
    if (existing) {
      throw new ConflictException('Este morador já está vinculado à unidade.');
    }

    const link = this.linksRepository.create({
      unidade: unit,
      usuario: user,
      tipo: dto.tipo,
    });
    try {
      const saved = await this.linksRepository.save(link);
      return {
        id: saved.id,
        usuarioId: user.id,
        nome: user.nome,
        email: user.email,
        tipo: saved.tipo,
      };
    } catch (error) {
      this.throwForUniqueConstraint(error, RESIDENT_UNIQUE_CONSTRAINT);
      throw error;
    }
  }

  async unlinkResident(id: number, usuarioId: number): Promise<void> {
    const link = await this.linksRepository.findOneBy({
      unidade: { id },
      usuario: { id: usuarioId },
    });
    if (!link) {
      throw new NotFoundException('Vínculo de morador não encontrado.');
    }

    await this.linksRepository.remove(link);
  }

  private throwForUniqueConstraint(error: unknown, constraint: string): void {
    const driverError = this.getDriverError(error);
    if (
      driverError?.code === '23505' &&
      driverError.constraint === constraint
    ) {
      if (constraint === UNIT_UNIQUE_CONSTRAINT) {
        throw new ConflictException(
          'Já existe uma unidade neste bloco e número.',
        );
      }
      if (constraint === RESIDENT_UNIQUE_CONSTRAINT) {
        throw new ConflictException(
          'Este morador já está vinculado à unidade.',
        );
      }
    }
  }

  private getDriverError(
    error: unknown,
  ): { code?: string; constraint?: string } | undefined {
    if (!(error instanceof QueryFailedError)) {
      return undefined;
    }

    return error.driverError as { code?: string; constraint?: string };
  }
}
