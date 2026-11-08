import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Anuncio } from '../../database/entities/anuncio.entity';
import { Mensagem } from '../../database/entities/mensagem.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { AuthUserDto } from '../auth/dto/auth-response.dto';
import { TipoNotificacao } from '../notifications/enums/tipo-notificacao.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { ConversaQueryDto } from './dto/conversa-query.dto';
import { EnviarMensagemDto } from './dto/enviar-mensagem.dto';
import {
  ConversaInboxDto,
  MensagemResponseDto,
} from './dto/mensagem-response.dto';

// O Postgres devolve COUNT como texto; os ids chegam como número.
interface LinhaInbox {
  anuncioId: number | string;
  anuncioTitulo: string;
  outroId: number | string;
  outroNome: string;
  ultimaMensagemId: number | string;
  ultimaMensagemTexto: string;
  ultimaMensagemRemetenteId: number | string;
  ultimaMensagemEm: Date;
  naoLidas: number | string;
}

// Uma conversa é identificada por (anúncio, vendedor, comprador). Para cada par
// (anúncio, outra pessoa) pegamos a última mensagem e contamos as não lidas
// que foram enviadas PARA o usuário logado.
const SQL_INBOX = `
  SELECT * FROM (
    SELECT DISTINCT ON (conversa."anuncioId", conversa."outroId")
      conversa."anuncioId"       AS "anuncioId",
      anuncio."titulo"           AS "anuncioTitulo",
      conversa."outroId"         AS "outroId",
      outro."nome"               AS "outroNome",
      conversa."id"              AS "ultimaMensagemId",
      conversa."texto"           AS "ultimaMensagemTexto",
      conversa."remetenteId"     AS "ultimaMensagemRemetenteId",
      conversa."criadaEm"        AS "ultimaMensagemEm",
      (
        SELECT COUNT(*) FROM "mensagens" nova
        WHERE nova."anuncioId" = conversa."anuncioId"
          AND nova."remetenteId" = conversa."outroId"
          AND nova."destinatarioId" = $1
          AND nova."lida" = false
      ) AS "naoLidas"
    FROM (
      SELECT m.*,
        CASE WHEN m."remetenteId" = $1 THEN m."destinatarioId"
             ELSE m."remetenteId" END AS "outroId"
      FROM "mensagens" m
      WHERE m."remetenteId" = $1 OR m."destinatarioId" = $1
    ) conversa
    INNER JOIN "anuncios" anuncio ON anuncio."id" = conversa."anuncioId"
    INNER JOIN "usuarios" outro ON outro."id" = conversa."outroId"
    ORDER BY conversa."anuncioId", conversa."outroId",
             conversa."criadaEm" DESC, conversa."id" DESC
  ) ultimas
  ORDER BY "ultimaMensagemEm" DESC, "ultimaMensagemId" DESC
`;

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectRepository(Mensagem)
    private readonly mensagensRepository: Repository<Mensagem>,
    @InjectRepository(Anuncio)
    private readonly anunciosRepository: Repository<Anuncio>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async enviar(
    anuncioId: number,
    dto: EnviarMensagemDto,
    usuario: AuthUserDto,
  ): Promise<MensagemResponseDto> {
    const anuncio = await this.buscarAnuncio(anuncioId);
    const destinatarioId = await this.resolverDestinatario(
      anuncio,
      dto,
      usuario,
    );

    const mensagem = this.mensagensRepository.create({
      anuncio: { id: anuncio.id } as Anuncio,
      remetente: { id: usuario.id } as Usuario,
      destinatario: { id: destinatarioId } as Usuario,
      texto: dto.texto,
      lida: false,
      criadaEm: new Date(),
    });
    const salva = await this.mensagensRepository.save(mensagem);

    await this.notificarDestinatario(anuncio, usuario, destinatarioId);

    return MensagemResponseDto.fromEntity(salva);
  }

  async listarConversa(
    anuncioId: number,
    query: ConversaQueryDto,
    usuario: AuthUserDto,
  ): Promise<MensagemResponseDto[]> {
    const anuncio = await this.buscarAnuncio(anuncioId);
    const outroId = this.resolverInterlocutor(
      anuncio,
      query.usuarioId,
      usuario,
    );

    // Só entram mensagens entre o usuário logado e o interlocutor.
    const mensagens = await this.mensagensRepository.find({
      where: [
        {
          anuncio: { id: anuncio.id },
          remetente: { id: usuario.id },
          destinatario: { id: outroId },
        },
        {
          anuncio: { id: anuncio.id },
          remetente: { id: outroId },
          destinatario: { id: usuario.id },
        },
      ],
      relations: { anuncio: true, remetente: true, destinatario: true },
      order: { criadaEm: 'ASC', id: 'ASC' },
    });

    return mensagens.map((mensagem) =>
      MensagemResponseDto.fromEntity(mensagem),
    );
  }

  async inbox(usuario: AuthUserDto): Promise<ConversaInboxDto[]> {
    const linhas = await this.mensagensRepository.query<LinhaInbox[]>(
      SQL_INBOX,
      [usuario.id],
    );

    return linhas.map((linha) => ({
      anuncioId: Number(linha.anuncioId),
      anuncioTitulo: linha.anuncioTitulo,
      outroUsuario: { id: Number(linha.outroId), nome: linha.outroNome },
      ultimaMensagem: {
        id: Number(linha.ultimaMensagemId),
        texto: linha.ultimaMensagemTexto,
        remetenteId: Number(linha.ultimaMensagemRemetenteId),
        criadaEm: linha.ultimaMensagemEm.toISOString(),
      },
      naoLidas: Number(linha.naoLidas),
    }));
  }

  async marcarComoLida(
    id: number,
    usuario: AuthUserDto,
  ): Promise<MensagemResponseDto> {
    // Só o destinatário marca como lida. Mensagem de outra pessoa responde 404,
    // para não revelar que ela existe.
    const mensagem = await this.mensagensRepository.findOne({
      where: { id, destinatario: { id: usuario.id } },
      relations: { anuncio: true, remetente: true, destinatario: true },
    });
    if (!mensagem) {
      throw new NotFoundException('Mensagem não encontrada.');
    }

    if (!mensagem.lida) {
      mensagem.lida = true;
      await this.mensagensRepository.save(mensagem);
    }
    return MensagemResponseDto.fromEntity(mensagem);
  }

  private async buscarAnuncio(id: number): Promise<Anuncio> {
    const anuncio = await this.anunciosRepository.findOne({
      where: { id },
      relations: { vendedor: true },
    });
    if (!anuncio) {
      throw new NotFoundException('Anúncio não encontrado.');
    }
    return anuncio;
  }

  // Comprador fala sempre com o vendedor. O vendedor só responde a quem já
  // lhe escreveu naquele anúncio (ninguém abre conversa com um desconhecido).
  private async resolverDestinatario(
    anuncio: Anuncio,
    dto: EnviarMensagemDto,
    usuario: AuthUserDto,
  ): Promise<number> {
    const vendedorId = anuncio.vendedor.id;

    if (usuario.id !== vendedorId) {
      if (
        dto.destinatarioId !== undefined &&
        dto.destinatarioId !== vendedorId
      ) {
        throw new ForbiddenException(
          'Você só pode enviar mensagens ao vendedor deste anúncio.',
        );
      }
      return vendedorId;
    }

    if (dto.destinatarioId === undefined) {
      throw new BadRequestException(
        'Informe o destinatarioId (o comprador) para responder.',
      );
    }
    if (dto.destinatarioId === usuario.id) {
      throw new BadRequestException(
        'Você não pode enviar mensagem para si mesmo.',
      );
    }

    const jaEscreveu = await this.mensagensRepository.count({
      where: {
        anuncio: { id: anuncio.id },
        remetente: { id: dto.destinatarioId },
        destinatario: { id: usuario.id },
      },
    });
    if (jaEscreveu === 0) {
      throw new ForbiddenException(
        'Você só pode responder a compradores que já enviaram mensagem neste anúncio.',
      );
    }
    return dto.destinatarioId;
  }

  // Quem lê a conversa é sempre uma das duas pontas. Um terceiro que tente
  // apontar para a conversa de outras pessoas recebe 403.
  private resolverInterlocutor(
    anuncio: Anuncio,
    usuarioId: number | undefined,
    usuario: AuthUserDto,
  ): number {
    const vendedorId = anuncio.vendedor.id;

    if (usuario.id === vendedorId) {
      if (usuarioId === undefined) {
        throw new BadRequestException(
          'Informe o usuarioId (o comprador) para ver a conversa.',
        );
      }
      return usuarioId;
    }

    if (usuarioId !== undefined && usuarioId !== vendedorId) {
      throw new ForbiddenException('Você não participa desta conversa.');
    }
    return vendedorId;
  }

  // Falha ao notificar não pode impedir o envio da mensagem.
  private async notificarDestinatario(
    anuncio: Anuncio,
    remetente: AuthUserDto,
    destinatarioId: number,
  ): Promise<void> {
    try {
      await this.notificationsService.notify(
        destinatarioId,
        TipoNotificacao.MENSAGEM,
        `Nova mensagem de ${remetente.nome} sobre "${anuncio.titulo}"`,
        anuncio.id,
      );
    } catch (erro) {
      this.logger.error(
        `Falha ao notificar o usuário ${destinatarioId} sobre mensagem no anúncio ${anuncio.id}`,
        erro,
      );
    }
  }
}
