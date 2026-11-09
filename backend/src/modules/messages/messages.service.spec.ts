import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Anuncio } from '../../database/entities/anuncio.entity';
import { PerfilUsuario } from '../../database/entities/enums';
import { Mensagem } from '../../database/entities/mensagem.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { AuthUserDto } from '../auth/dto/auth-response.dto';
import { TipoNotificacao } from '../notifications/enums/tipo-notificacao.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { MessagesService } from './messages.service';

const VENDEDOR = 1;
const COMPRADOR = 2;
const TERCEIRO = 3;

function auth(id: number, nome: string): AuthUserDto {
  return {
    id,
    nome,
    email: `usuario${id}@example.com`,
    perfil: PerfilUsuario.MORADOR,
  };
}

const vendedor = auth(VENDEDOR, 'Vendedor');
const comprador = auth(COMPRADOR, 'Comprador');
const terceiro = auth(TERCEIRO, 'Terceiro');

function criarAnuncio(): Anuncio {
  return {
    id: 5,
    titulo: 'Sofá',
    vendedor: { id: VENDEDOR } as Usuario,
  } as Anuncio;
}

function criarMensagem(overrides: Partial<Mensagem> = {}): Mensagem {
  return {
    id: 100,
    anuncio: { id: 5 } as Anuncio,
    remetente: { id: COMPRADOR } as Usuario,
    destinatario: { id: VENDEDOR } as Usuario,
    texto: 'Ainda está disponível?',
    lida: false,
    criadaEm: new Date('2026-11-08T12:00:00Z'),
    ...overrides,
  };
}

describe('MessagesService', () => {
  const mensagensRepository = {
    create: jest.fn((valores: unknown) => valores),
    save: jest.fn((valores: unknown) => Promise.resolve(valores)),
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    query: jest.fn(),
  };
  const anunciosRepository = { findOne: jest.fn() };
  const notificationsService = { notify: jest.fn() };
  let service: MessagesService;

  beforeEach(() => {
    jest.clearAllMocks();
    anunciosRepository.findOne.mockResolvedValue(criarAnuncio());
    notificationsService.notify.mockResolvedValue(undefined);
    service = new MessagesService(
      mensagensRepository as unknown as Repository<Mensagem>,
      anunciosRepository as unknown as Repository<Anuncio>,
      notificationsService as unknown as NotificationsService,
    );
  });

  describe('enviar', () => {
    it('comprador envia ao vendedor e o vendedor é notificado', async () => {
      const resposta = await service.enviar(
        5,
        { texto: 'Ainda está disponível?' },
        comprador,
      );

      expect(resposta).toMatchObject({
        anuncioId: 5,
        remetenteId: COMPRADOR,
        destinatarioId: VENDEDOR,
        lida: false,
      });
      expect(notificationsService.notify).toHaveBeenCalledWith(
        VENDEDOR,
        TipoNotificacao.MENSAGEM,
        'Nova mensagem de Comprador sobre "Sofá"',
        5,
      );
    });

    it('comprador não pode escolher outro destinatário', async () => {
      await expect(
        service.enviar(5, { texto: 'Oi', destinatarioId: TERCEIRO }, comprador),
      ).rejects.toThrow(ForbiddenException);
      expect(mensagensRepository.save).not.toHaveBeenCalled();
    });

    it('vendedor responde a um comprador que já escreveu', async () => {
      mensagensRepository.count.mockResolvedValue(1);

      const resposta = await service.enviar(
        5,
        { texto: 'Está sim!', destinatarioId: COMPRADOR },
        vendedor,
      );

      expect(resposta).toMatchObject({
        remetenteId: VENDEDOR,
        destinatarioId: COMPRADOR,
      });
      expect(notificationsService.notify).toHaveBeenCalledWith(
        COMPRADOR,
        TipoNotificacao.MENSAGEM,
        'Nova mensagem de Vendedor sobre "Sofá"',
        5,
      );
    });

    it('vendedor precisa informar o destinatarioId', async () => {
      await expect(
        service.enviar(5, { texto: 'Oi' }, vendedor),
      ).rejects.toThrow(BadRequestException);
    });

    it('vendedor não pode escrever para si mesmo', async () => {
      await expect(
        service.enviar(5, { texto: 'Oi', destinatarioId: VENDEDOR }, vendedor),
      ).rejects.toThrow(BadRequestException);
    });

    it('vendedor não abre conversa com quem nunca lhe escreveu', async () => {
      mensagensRepository.count.mockResolvedValue(0);

      await expect(
        service.enviar(5, { texto: 'Oi', destinatarioId: TERCEIRO }, vendedor),
      ).rejects.toThrow(ForbiddenException);
      expect(mensagensRepository.save).not.toHaveBeenCalled();
    });

    it('responde 404 quando o anúncio não existe', async () => {
      anunciosRepository.findOne.mockResolvedValue(null);

      await expect(
        service.enviar(99, { texto: 'Oi' }, comprador),
      ).rejects.toThrow(NotFoundException);
    });

    it('falha ao notificar não impede o envio', async () => {
      notificationsService.notify.mockRejectedValue(new Error('falhou'));

      await expect(
        service.enviar(5, { texto: 'Oi' }, comprador),
      ).resolves.toMatchObject({ destinatarioId: VENDEDOR });
    });
  });

  describe('listarConversa', () => {
    it('comprador lê só a conversa dele com o vendedor', async () => {
      mensagensRepository.find.mockResolvedValue([criarMensagem()]);

      const resposta = await service.listarConversa(5, {}, comprador);

      expect(resposta).toHaveLength(1);
      expect(mensagensRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            {
              anuncio: { id: 5 },
              remetente: { id: COMPRADOR },
              destinatario: { id: VENDEDOR },
            },
            {
              anuncio: { id: 5 },
              remetente: { id: VENDEDOR },
              destinatario: { id: COMPRADOR },
            },
          ],
        }),
      );
    });

    it('vendedor lê a conversa com o comprador informado', async () => {
      mensagensRepository.find.mockResolvedValue([]);

      await service.listarConversa(5, { usuarioId: COMPRADOR }, vendedor);

      expect(mensagensRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            expect.objectContaining({ remetente: { id: VENDEDOR } }),
            expect.objectContaining({ remetente: { id: COMPRADOR } }),
          ],
        }),
      );
    });

    it('vendedor precisa informar o usuarioId', async () => {
      await expect(service.listarConversa(5, {}, vendedor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('terceiro não consegue ler a conversa de outras pessoas', async () => {
      await expect(
        service.listarConversa(5, { usuarioId: COMPRADOR }, terceiro),
      ).rejects.toThrow(ForbiddenException);
      expect(mensagensRepository.find).not.toHaveBeenCalled();
    });

    it('terceiro sem usuarioId só enxerga a própria conversa (vazia)', async () => {
      mensagensRepository.find.mockResolvedValue([]);

      await expect(service.listarConversa(5, {}, terceiro)).resolves.toEqual(
        [],
      );
      expect(mensagensRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            expect.objectContaining({ remetente: { id: TERCEIRO } }),
            expect.objectContaining({ destinatario: { id: TERCEIRO } }),
          ],
        }),
      );
    });
  });

  describe('inbox', () => {
    it('converte as linhas do banco para a resposta da API', async () => {
      mensagensRepository.query.mockResolvedValue([
        {
          anuncioId: 5,
          anuncioTitulo: 'Sofá',
          outroId: 2,
          outroNome: 'Comprador',
          ultimaMensagemId: 100,
          ultimaMensagemTexto: 'Ainda está disponível?',
          ultimaMensagemRemetenteId: 2,
          ultimaMensagemEm: new Date('2026-11-08T12:00:00Z'),
          naoLidas: '3',
        },
      ]);

      const resposta = await service.inbox(vendedor);

      expect(mensagensRepository.query).toHaveBeenCalledWith(
        expect.any(String),
        [VENDEDOR],
      );
      expect(resposta).toEqual([
        {
          anuncioId: 5,
          anuncioTitulo: 'Sofá',
          outroUsuario: { id: 2, nome: 'Comprador' },
          ultimaMensagem: {
            id: 100,
            texto: 'Ainda está disponível?',
            remetenteId: 2,
            criadaEm: '2026-11-08T12:00:00.000Z',
          },
          naoLidas: 3,
        },
      ]);
    });
  });

  describe('marcarComoLida', () => {
    it('destinatário marca a mensagem como lida', async () => {
      mensagensRepository.findOne.mockResolvedValue(criarMensagem());

      const resposta = await service.marcarComoLida(100, vendedor);

      expect(resposta.lida).toBe(true);
      expect(mensagensRepository.save).toHaveBeenCalledTimes(1);
    });

    it('não salva de novo quando já estava lida', async () => {
      mensagensRepository.findOne.mockResolvedValue(
        criarMensagem({ lida: true }),
      );

      await service.marcarComoLida(100, vendedor);

      expect(mensagensRepository.save).not.toHaveBeenCalled();
    });

    it('quem não é o destinatário recebe 404', async () => {
      mensagensRepository.findOne.mockResolvedValue(null);

      await expect(service.marcarComoLida(100, terceiro)).rejects.toThrow(
        NotFoundException,
      );
      expect(mensagensRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 100, destinatario: { id: TERCEIRO } },
        }),
      );
    });
  });
});
