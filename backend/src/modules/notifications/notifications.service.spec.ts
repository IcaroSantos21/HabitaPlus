import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PerfilUsuario } from '../../database/entities/enums';
import { Notificacao } from '../../database/entities/notificacao.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { AuthUserDto } from '../auth/dto/auth-response.dto';
import { FiltrosNotificacaoDto } from './dto/filtros-notificacao.dto';
import { TipoNotificacao } from './enums/tipo-notificacao.enum';
import { NotificationsService } from './notifications.service';

const morador: AuthUserDto = {
  id: 1,
  nome: 'Maria',
  email: 'maria@example.com',
  perfil: PerfilUsuario.MORADOR,
};

function criarNotificacao(overrides: Partial<Notificacao> = {}): Notificacao {
  return {
    id: 10,
    usuario: { id: 1 } as Usuario,
    tipo: TipoNotificacao.ANUNCIO,
    texto: 'Novo anúncio: Sofá',
    refId: 7,
    lida: false,
    criadaEm: new Date('2026-11-07T12:00:00Z'),
    ...overrides,
  };
}

function filtros(
  overrides: Partial<FiltrosNotificacaoDto> = {},
): FiltrosNotificacaoDto {
  return Object.assign(new FiltrosNotificacaoDto(), overrides);
}

describe('NotificationsService', () => {
  const repo = {
    create: jest.fn((valores: unknown) => valores),
    save: jest.fn((valores: unknown) => Promise.resolve(valores)),
    findAndCount: jest.fn(),
    count: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(
      repo as unknown as Repository<Notificacao>,
    );
  });

  it('notify cria a notificação não lida para o usuário, com refId', async () => {
    await service.notify(5, TipoNotificacao.ANUNCIO, 'Olá', 9);

    expect(repo.save).toHaveBeenCalledTimes(1);
    const criadas = repo.create.mock.calls[0][0] as Array<
      Record<string, unknown>
    >;
    expect(criadas[0]).toMatchObject({
      usuario: { id: 5 },
      tipo: TipoNotificacao.ANUNCIO,
      texto: 'Olá',
      refId: 9,
      lida: false,
    });
  });

  it('notifyMany não salva nada quando não há destinatários', async () => {
    await service.notifyMany([], TipoNotificacao.ANUNCIO, 'Olá');
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('listar filtra pelo usuário do token e pagina', async () => {
    repo.findAndCount.mockResolvedValue([[criarNotificacao()], 21]);

    const resposta = await service.listar(
      filtros({ pagina: 2, limite: 10 }),
      morador,
    );

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { usuario: { id: 1 } },
        skip: 10,
        take: 10,
      }),
    );
    expect(resposta.meta).toEqual({
      pagina: 2,
      limite: 10,
      total: 21,
      totalPaginas: 3,
    });
    expect(resposta.data[0].criadaEm).toBe('2026-11-07T12:00:00.000Z');
  });

  it('listar com apenasNaoLidas filtra lida=false', async () => {
    repo.findAndCount.mockResolvedValue([[], 0]);

    await service.listar(filtros({ apenasNaoLidas: true }), morador);

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { usuario: { id: 1 }, lida: false } }),
    );
  });

  it('contarNaoLidas usa o mesmo filtro da listagem de não lidas', async () => {
    repo.count.mockResolvedValue(3);

    await expect(service.contarNaoLidas(morador)).resolves.toEqual({
      naoLidas: 3,
    });
    expect(repo.count).toHaveBeenCalledWith({
      where: { usuario: { id: 1 }, lida: false },
    });
  });

  it('marcarComoLida marca e salva a notificação do próprio usuário', async () => {
    repo.findOne.mockResolvedValue(criarNotificacao());

    const resposta = await service.marcarComoLida(10, morador);

    expect(resposta.lida).toBe(true);
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('marcarComoLida devolve 404 para notificação de outro usuário', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(service.marcarComoLida(10, morador)).rejects.toThrow(
      NotFoundException,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('marcarTodasComoLidas devolve quantas foram atualizadas', async () => {
    const qb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 4 }),
    };
    repo.createQueryBuilder.mockReturnValue(qb);

    await expect(service.marcarTodasComoLidas(morador)).resolves.toEqual({
      atualizadas: 4,
    });
  });
});
