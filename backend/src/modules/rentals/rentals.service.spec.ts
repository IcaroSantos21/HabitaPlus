import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  DeepPartial,
  FindManyOptions,
  FindOneOptions,
  Repository,
} from 'typeorm';
import { ContratoLocacao } from '../../database/entities/contrato-locacao.entity';
import { PerfilUsuario, StatusLocacao } from '../../database/entities/enums';
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
    perfil: PerfilUsuario.MORADOR,
  };

  const rentalsFind = jest.fn<
    Promise<ContratoLocacao[]>,
    [FindManyOptions<ContratoLocacao>]
  >();
  const rentalsFindOne = jest.fn<
    Promise<ContratoLocacao | null>,
    [FindOneOptions<ContratoLocacao>]
  >();
  const rentalsCreate = jest.fn<
    ContratoLocacao,
    [DeepPartial<ContratoLocacao>]
  >();
  const rentalsSave = jest.fn<Promise<ContratoLocacao>, [ContratoLocacao]>();
  const unitsFindOneBy = jest.fn<
    Promise<Unidade | null>,
    [Parameters<Repository<Unidade>['findOneBy']>[0]]
  >();
  const unitsSave = jest.fn<Promise<Unidade>, [Unidade]>();
  const usersFindOneBy = jest.fn<
    Promise<Usuario | null>,
    [Parameters<Repository<Usuario>['findOneBy']>[0]]
  >();

  const rentalsRepository = {
    findAndCount: jest.fn(),
    findOne: rentalsFindOne,
    find: rentalsFind,
    create: rentalsCreate,
    save: rentalsSave,
  } as unknown as Repository<ContratoLocacao>;

  const unitsRepository = {
    findOneBy: unitsFindOneBy,
    save: unitsSave,
  } as unknown as Repository<Unidade>;

  const usersRepository = {
    findOneBy: usersFindOneBy,
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
    unitsFindOneBy.mockResolvedValue(unit);
    usersFindOneBy.mockResolvedValue(locatario);
    rentalsFind.mockResolvedValue([]);
    rentalsCreate.mockImplementation((entity) => entity as ContratoLocacao);
    rentalsSave.mockImplementation((entity) =>
      Promise.resolve({
        ...entity,
        id: 5,
      }),
    );
    unitsSave.mockResolvedValue({
      ...unit,
      disponivelLocacao: false,
    });

    const result = await service.create({
      unidadeId: 1,
      locatarioId: 10,
      valorMensal: 2500,
      inicio: '2026-01-10',
      fim: '2027-01-10',
    });

    expect(result.status).toBe(StatusLocacao.ATIVO);
    expect(unitsSave).toHaveBeenCalledWith(
      expect.objectContaining({ disponivelLocacao: false }),
    );
  });

  it('rejeita criação de um segundo contrato ativo para a mesma unidade', async () => {
    unitsFindOneBy.mockResolvedValue(unit);
    usersFindOneBy.mockResolvedValue(locatario);
    rentalsFind.mockResolvedValue([
      {
        id: 99,
        unidade: unit,
        locatario,
        valorMensal: 2500,
        fim: new Date('2027-12-31'),
        inicio: new Date('2026-01-01'),
        status: StatusLocacao.ATIVO,
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

    rentalsFindOne.mockResolvedValue(contrato);
    rentalsFind.mockResolvedValue([contrato]);
    rentalsSave.mockImplementation((entity) =>
      Promise.resolve({
        ...entity,
        status: StatusLocacao.ENCERRADO,
      }),
    );
    unitsFindOneBy.mockResolvedValue({
      ...unit,
      disponivelLocacao: false,
    });
    unitsSave.mockResolvedValue({
      ...unit,
      disponivelLocacao: true,
    });

    const result = await service.end(7, { fim: '2026-06-15' });

    expect(result.status).toBe(StatusLocacao.ENCERRADO);
    expect(unitsSave).toHaveBeenCalledWith(
      expect.objectContaining({ disponivelLocacao: true }),
    );
  });

  it('retorna not found ao buscar contrato inexistente', async () => {
    rentalsFindOne.mockResolvedValue(null);

    await expect(service.findOne(404)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
