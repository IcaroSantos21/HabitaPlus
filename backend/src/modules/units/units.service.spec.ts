import { ConflictException, NotFoundException } from '@nestjs/common';
import { FindManyOptions, Repository } from 'typeorm';
import { ContratoLocacao } from '../../database/entities/contrato-locacao.entity';
import { PerfilUsuario, TipoVinculo } from '../../database/entities/enums';
import { Unidade } from '../../database/entities/unidade.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { Vinculo } from '../../database/entities/vinculo.entity';
import { LinkResidentDto } from './dto/link-resident.dto';
import { UnitsService } from './units.service';

describe('UnitsService', () => {
  const unit: Unidade = {
    id: 1,
    bloco: 'A',
    numero: '101',
    quartos: 2,
    areaM2: 65.5,
    valorAluguelSugerido: 1800,
    disponivelLocacao: true,
  };
  const user: Usuario = {
    id: 2,
    nome: 'Maria Silva',
    email: 'maria@example.com',
    senhaHash: 'secret',
    perfil: PerfilUsuario.MORADOR,
  };

  const findUnit = jest.fn<Promise<Unidade | null>, []>();
  const findUser = jest.fn<Promise<Usuario | null>, []>();
  const findLink = jest.fn<Promise<Vinculo | null>, []>();
  const saveLink = jest.fn<Promise<Vinculo>, []>();
  const removeLink = jest.fn<Promise<Vinculo>, []>();
  const unitsRepository = {
    findOneBy: findUnit,
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    })),
  } as unknown as Repository<Unidade>;
  const usersRepository = {
    findOneBy: findUser,
  } as unknown as Repository<Usuario>;
  const linksRepository = {
    findOneBy: findLink,
    create: jest.fn((link: Partial<Vinculo>) => link as Vinculo),
    save: saveLink,
    remove: removeLink,
  } as unknown as Repository<Vinculo>;

  const findRentals = jest.fn<
    Promise<ContratoLocacao[]>,
    [FindManyOptions<ContratoLocacao>]
  >();
  const rentalsRepository = {
    find: findRentals,
  } as unknown as Repository<ContratoLocacao>;

  const service = new UnitsService(
    unitsRepository,
    usersRepository,
    linksRepository,
    rentalsRepository,
  );
  const linkDto: LinkResidentDto = {
    usuarioId: user.id,
    tipo: TipoVinculo.PROPRIETARIO,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('vincula morador à unidade', async () => {
    findUnit.mockResolvedValue(unit);
    findUser.mockResolvedValue(user);
    findLink.mockResolvedValue(null);
    saveLink.mockResolvedValue({
      id: 3,
      unidade: unit,
      usuario: user,
      tipo: linkDto.tipo,
    });

    await expect(service.linkResident(unit.id, linkDto)).resolves.toEqual({
      id: 3,
      usuarioId: user.id,
      nome: user.nome,
      email: user.email,
      tipo: linkDto.tipo,
    });
    expect(saveLink).toHaveBeenCalledTimes(1);
  });

  it('não permite criar unidade com bloco e número repetidos', async () => {
    findUnit.mockResolvedValue(unit);

    await expect(
      service.create({
        bloco: unit.bloco,
        numero: unit.numero,
        quartos: unit.quartos,
        areaM2: unit.areaM2,
        valorAluguelSugerido: unit.valorAluguelSugerido,
        disponivelLocacao: unit.disponivelLocacao,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('não permite vincular duas vezes o mesmo morador à mesma unidade', async () => {
    findUnit.mockResolvedValue(unit);
    findUser.mockResolvedValue(user);
    findLink.mockResolvedValue({
      id: 3,
      unidade: unit,
      usuario: user,
      tipo: linkDto.tipo,
    });

    await expect(service.linkResident(unit.id, linkDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(saveLink).not.toHaveBeenCalled();
  });

  it('desvincula morador da unidade', async () => {
    const link: Vinculo = {
      id: 3,
      unidade: unit,
      usuario: user,
      tipo: linkDto.tipo,
    };
    findLink.mockResolvedValue(link);
    removeLink.mockResolvedValue(link);

    await expect(
      service.unlinkResident(unit.id, user.id),
    ).resolves.toBeUndefined();
    expect(removeLink).toHaveBeenCalledWith(link);
  });

  it('retorna não encontrado ao desvincular vínculo inexistente', async () => {
    findLink.mockResolvedValue(null);

    await expect(
      service.unlinkResident(unit.id, user.id),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(removeLink).not.toHaveBeenCalled();
  });
});
