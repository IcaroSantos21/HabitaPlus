import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { ContratoLocacao } from '../../database/entities/contrato-locacao.entity';
import { StatusLocacao } from '../../database/entities/enums';
import { Unidade } from '../../database/entities/unidade.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { RentalsService } from './rentals.service';

describe('RentalsService', () => {
  const unit: Unidade = {
    id: 1,
    bloco: 'A',
    numero: '101',
    quartos: 2,
    areaM2: 65,
    valorAluguelSugerido: 1800,
    disponivelLocacao: true,
  };

  const locatario: Usuario = {
    id: 10,
    nome: 'Ana Souza',
    email: 'ana@example.com',
    senhaHash: 'hash',
    perfil: 'MORADOR' as any,
  };

  const rentalsRepository = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  } as unknown as Repository<ContratoLocacao>;

  const unitsRepository = {
    findOneBy: jest.fn(),
    save: jest.fn(),
  } as unknown as Repository<Unidade>;

  const usersRepository = {
    findOneBy: jest.fn(),
  } as unknown as Repository<Usuario>;

  const service = new RentalsService(
    rentalsRepository,
    unitsRepository,
    usersRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cria um contrato e marca a unidade como indisponível', async () => {
    (unitsRepository as any).findOneBy.mockResolvedValue(unit);
    (usersRepository as any).findOneBy.mockResolvedValue(locatario);
    (rentalsRepository as any).find.mockResolvedValue([]);
    (rentalsRepository as any).create.mockImplementation((entity) => entity);
    (rentalsRepository as any).save.mockImplementation(async (entity) => ({
      ...entity,
      id: 5,
    }));
    (unitsRepository as any).save.mockResolvedValue({ ...unit, disponivelLocacao: false });

    const result = await service.create({
      unidadeId: 1,
      locatarioId: 10,
      valorMensal: 2500,
      inicio: '2026-01-10',
      fim: '2027-01-10',
    });

    expect(result.status).toBe(StatusLocacao.ATIVO);
    expect((unitsRepository as any).save).toHaveBeenCalledWith(
      expect.objectContaining({ disponivelLocacao: false }),
    );
  });

  it('rejeita criação de um segundo contrato ativo para a mesma unidade', async () => {
    (unitsRepository as any).findOneBy.mockResolvedValue(unit);
    (usersRepository as any).findOneBy.mockResolvedValue(locatario);
    (rentalsRepository as any).find.mockResolvedValue([
      {
        id: 99,
        unidade: unit,
        locatario,
        fim: new Date('2027-12-31'),
        inicio: new Date('2026-01-01'),
      },
    ]);

    await expect(
      service.create({
        unidadeId: 1,
        locatarioId: 10,
        valorMensal: 2500,
        inicio: '2026-02-10',
        fim: '2027-02-10',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejeita contrato quando fim não é posterior ao início', async () => {
    await expect(
      service.create({
        unidadeId: 1,
        locatarioId: 10,
        valorMensal: 2500,
        inicio: '2026-01-10',
        fim: '2026-01-10',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('encerra contrato e libera a unidade novamente', async () => {
    const contrato = {
      id: 7,
      unidade: unit,
      locatario,
      valorMensal: 2500,
      inicio: new Date('2026-01-01'),
      fim: new Date('2026-12-31'),
      status: StatusLocacao.ATIVO,
    };

    (rentalsRepository as any).findOne.mockResolvedValue(contrato);
    (rentalsRepository as any).find.mockResolvedValue([contrato]);
    (rentalsRepository as any).save.mockImplementation(async (entity) => ({
      ...entity,
      status: StatusLocacao.ENCERRADO,
    }));
    (unitsRepository as any).findOneBy.mockResolvedValue({
      ...unit,
      disponivelLocacao: false,
    });
    (unitsRepository as any).save.mockResolvedValue({
      ...unit,
      disponivelLocacao: true,
    });

    const result = await service.end(7, { fim: '2026-06-15' });

    expect(result.status).toBe(StatusLocacao.ENCERRADO);
    expect((unitsRepository as any).save).toHaveBeenCalledWith(
      expect.objectContaining({ disponivelLocacao: true }),
    );
  });

  it('retorna not found ao buscar contrato inexistente', async () => {
    (rentalsRepository as any).findOne.mockResolvedValue(null);

    await expect(service.findOne(404)).rejects.toBeInstanceOf(NotFoundException);
  });
});
