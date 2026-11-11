import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Comunicado } from '../../database/entities/comunicado.entity';
import { PerfilUsuario } from '../../database/entities/enums';
import { Usuario } from '../../database/entities/usuario.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { TipoNotificacao } from '../notifications/enums/tipo-notificacao.enum';
import { CreateComunicadoDto } from './dto/create-comunicado.dto';
import { ListarComunicadosDto } from './dto/listar-comunicados.dto';
import { AnnouncementsService } from './announcements.service';

describe('AnnouncementsService', () => {
  const comunicadosRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };
  const usuariosRepository = { find: jest.fn() };
  const notificationsService = { notifyMany: jest.fn() };
  let service: AnnouncementsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AnnouncementsService(
      comunicadosRepository as unknown as Repository<Comunicado>,
      usuariosRepository as unknown as Repository<Usuario>,
      notificationsService as unknown as NotificationsService,
    );
  });

  it('cria comunicado e notifica todos os moradores', async () => {
    const dto: CreateComunicadoDto = {
      titulo: 'Manutenção da piscina',
      conteudo: 'A piscina ficará fechada na sexta-feira.',
    };
    const comunicado = { id: 8, ...dto } as Comunicado;
    comunicadosRepository.create.mockReturnValue(comunicado);
    comunicadosRepository.save.mockResolvedValue(comunicado);
    usuariosRepository.find.mockResolvedValue([{ id: 2 }, { id: 5 }]);
    notificationsService.notifyMany.mockResolvedValue(undefined);

    await expect(service.criar(dto)).resolves.toBe(comunicado);

    expect(usuariosRepository.find).toHaveBeenCalledWith({
      where: { perfil: PerfilUsuario.MORADOR },
      select: { id: true },
    });
    expect(notificationsService.notifyMany).toHaveBeenCalledWith(
      [2, 5],
      TipoNotificacao.COMUNICADO,
      'Novo comunicado: Manutenção da piscina',
      8,
    );
  });

  it('lista comunicados por data decrescente com paginação', async () => {
    const comunicado = { id: 3 } as Comunicado;
    comunicadosRepository.findAndCount.mockResolvedValue([[comunicado], 21]);
    const query = Object.assign(new ListarComunicadosDto(), {
      pagina: 2,
      limite: 10,
    });

    await expect(service.listar(query)).resolves.toEqual({
      data: [comunicado],
      meta: { pagina: 2, limite: 10, total: 21, totalPaginas: 3 },
    });
    expect(comunicadosRepository.findAndCount).toHaveBeenCalledWith({
      order: { criadaEm: 'DESC', id: 'DESC' },
      skip: 10,
      take: 10,
    });
  });

  it('atualiza o comunicado existente', async () => {
    const comunicado = {
      id: 3,
      titulo: 'Título antigo',
      conteudo: 'Conteúdo antigo',
    } as Comunicado;
    comunicadosRepository.findOne.mockResolvedValue(comunicado);
    comunicadosRepository.save.mockImplementation((value: Comunicado) =>
      Promise.resolve(value),
    );

    await expect(
      service.atualizar(3, { titulo: 'Título novo' }),
    ).resolves.toMatchObject({
      id: 3,
      titulo: 'Título novo',
      conteudo: 'Conteúdo antigo',
    });
  });

  it('retorna 404 ao atualizar comunicado inexistente', async () => {
    comunicadosRepository.findOne.mockResolvedValue(null);

    await expect(
      service.atualizar(42, { titulo: 'Novo título' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('exclui comunicado existente', async () => {
    const comunicado = { id: 3 } as Comunicado;
    comunicadosRepository.findOne.mockResolvedValue(comunicado);
    comunicadosRepository.remove.mockResolvedValue(comunicado);

    await expect(service.remover(3)).resolves.toBeUndefined();
    expect(comunicadosRepository.remove).toHaveBeenCalledWith(comunicado);
  });

  it('retorna 404 ao excluir comunicado inexistente', async () => {
    comunicadosRepository.findOne.mockResolvedValue(null);

    await expect(service.remover(42)).rejects.toThrow(NotFoundException);
  });
});
