import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContratoLocacao } from '../../database/entities/contrato-locacao.entity';
import { StatusLocacao } from '../../database/entities/enums';
import { Unidade } from '../../database/entities/unidade.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { CreateRentalDto } from './dto/create-rental.dto';
import { EndRentalDto } from './dto/end-rental.dto';
import { ListRentalsQueryDto } from './dto/list-rentals-query.dto';
import { UpdateRentalDto } from './dto/update-rental.dto';

@Injectable()
export class RentalsService {
  constructor(
    @InjectRepository(ContratoLocacao)
    private readonly rentalsRepository: Repository<ContratoLocacao>,
    @InjectRepository(Unidade)
    private readonly unitsRepository: Repository<Unidade>,
    @InjectRepository(Usuario)
    private readonly usersRepository: Repository<Usuario>,
  ) {}

  async list(query: ListRentalsQueryDto) {
    const [data, total] = await this.rentalsRepository.findAndCount({
      relations: { unidade: true, locatario: true },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      order: { id: 'ASC' },
    });

    return {
      data: data.map((contract) => this.withComputedStatus(contract)),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async findOne(id: number): Promise<ContratoLocacao> {
    const contract = await this.rentalsRepository.findOne({
      where: { id },
      relations: { unidade: true, locatario: true },
    });

    if (!contract) {
      throw new NotFoundException('Contrato de locação não encontrado.');
    }

    return this.withComputedStatus(contract);
  }

  async create(dto: CreateRentalDto): Promise<ContratoLocacao> {
    const unit = await this.unitsRepository.findOneBy({ id: dto.unidadeId });
    if (!unit) {
      throw new NotFoundException('Unidade não encontrada.');
    }

    const locatario = await this.usersRepository.findOneBy({
      id: dto.locatarioId,
    });
    if (!locatario) {
      throw new NotFoundException('Locatário não encontrado.');
    }

    this.validateContractDates(dto.inicio, dto.fim ?? null);

    const existingActive = await this.rentalsRepository.find({
      where: { unidade: { id: dto.unidadeId } },
      relations: { unidade: true },
    });

    if (existingActive.some((contract) => this.isContractActive(contract))) {
      throw new ConflictException(
        'Já existe um contrato ativo para esta unidade.',
      );
    }

    if (!unit.disponivelLocacao) {
      throw new ConflictException(
        'Esta unidade já está indisponível para locação.',
      );
    }

    const contract = this.rentalsRepository.create({
      unidade: unit,
      locatario,
      valorMensal: dto.valorMensal,
      inicio: new Date(dto.inicio),
      fim: dto.fim ? new Date(dto.fim) : null,
      status: StatusLocacao.ATIVO,
    });

    const savedContract = await this.rentalsRepository.save(contract);
    unit.disponivelLocacao = false;
    await this.unitsRepository.save(unit);

    return this.withComputedStatus(savedContract);
  }

  async update(id: number, dto: UpdateRentalDto): Promise<ContratoLocacao> {
    const contract = await this.rentalsRepository.findOne({
      where: { id },
      relations: { unidade: true, locatario: true },
    });

    if (!contract) {
      throw new NotFoundException('Contrato de locação não encontrado.');
    }

    if (dto.locatarioId) {
      const locatario = await this.usersRepository.findOneBy({
        id: dto.locatarioId,
      });
      if (!locatario) {
        throw new NotFoundException('Locatário não encontrado.');
      }
      contract.locatario = locatario;
    }

    if (dto.valorMensal !== undefined) {
      contract.valorMensal = dto.valorMensal;
    }

    if (dto.inicio) {
      contract.inicio = new Date(dto.inicio);
    }

    if (dto.fim !== undefined) {
      contract.fim = dto.fim ? new Date(dto.fim) : null;
    }

    this.validateContractDates(
      this.toDate(contract.inicio),
      contract.fim ? this.toDate(contract.fim) : null,
    );

    contract.status = this.computeContractStatus(contract);
    const updated = await this.rentalsRepository.save(contract);
    return this.withComputedStatus(updated);
  }

  async end(id: number, dto: EndRentalDto): Promise<ContratoLocacao> {
    const contract = await this.rentalsRepository.findOne({
      where: { id },
      relations: { unidade: true },
    });

    if (!contract) {
      throw new NotFoundException('Contrato de locação não encontrado.');
    }

    if (this.computeContractStatus(contract) === StatusLocacao.ENCERRADO) {
      throw new ConflictException('Este contrato já está encerrado.');
    }

    const finalDate = dto.fim ? new Date(dto.fim) : new Date();
    this.validateContractDates(
      this.toDate(contract.inicio),
      this.toDate(finalDate),
    );

    contract.fim = finalDate;
    contract.status = this.computeContractStatus(contract);

    const saved = await this.rentalsRepository.save(contract);

    const activeContracts = await this.rentalsRepository.find({
      where: { unidade: { id: contract.unidade.id } },
      relations: { unidade: true },
    });

    const unit = await this.unitsRepository.findOneBy({
      id: contract.unidade.id,
    });
    if (unit) {
      unit.disponivelLocacao = !activeContracts.some(
        (item) => item.id !== contract.id && this.isContractActive(item),
      );
      await this.unitsRepository.save(unit);
    }

    return this.withComputedStatus(saved);
  }

  private validateContractDates(
    inicio: string | Date | null,
    fim: string | Date | null,
  ): void {
    const inicioDate = this.toDate(inicio);
    const fimDate = this.toDate(fim);

    if (!inicioDate || !fimDate) {
      return;
    }

    if (fimDate <= inicioDate) {
      throw new BadRequestException(
        'A data final deve ser posterior à data de início.',
      );
    }
  }

  private isContractActive(contract: ContratoLocacao): boolean {
    return this.computeContractStatus(contract) !== StatusLocacao.ENCERRADO;
  }

  private computeContractStatus(
    contract: Partial<ContratoLocacao>,
  ): StatusLocacao {
    const today = this.toDateOnly(new Date());
    const endDate = contract.fim
      ? this.toDateOnly(new Date(contract.fim))
      : null;

    if (endDate && endDate < today) {
      return StatusLocacao.ENCERRADO;
    }

    if (endDate) {
      const remainingDays = Math.ceil(
        (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (remainingDays <= 30 && remainingDays >= 0) {
        return StatusLocacao.A_VENCER;
      }
    }

    return StatusLocacao.ATIVO;
  }

  private withComputedStatus(contract: ContratoLocacao): ContratoLocacao {
    return {
      ...contract,
      status: this.computeContractStatus(contract),
    };
  }

  private toDate(value: string | Date | null): Date | null {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private toDateOnly(value: Date): Date {
    const normalized = new Date(value);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }
}
