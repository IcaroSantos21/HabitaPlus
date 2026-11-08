import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PaginatedResponseDto,
  paginate,
} from '../../common/dto/paginated-response.dto';
import { Notificacao } from '../../database/entities/notificacao.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { AuthUserDto } from '../auth/dto/auth-response.dto';
import {
  ContagemNaoLidasResponseDto,
  LeituraEmMassaResponseDto,
  NotificacaoResponseDto,
} from './dto/notificacao-response.dto';
import { FiltrosNotificacaoDto } from './dto/filtros-notificacao.dto';
import { TipoNotificacao } from './enums/tipo-notificacao.enum';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notificacao)
    private readonly repository: Repository<Notificacao>,
  ) {}

  // API interna: os outros módulos (anúncios, mensagens, alertas) chamam este método.
  async notify(
    usuarioId: number,
    tipo: TipoNotificacao,
    texto: string,
    refId?: number,
  ): Promise<void> {
    await this.notifyMany([usuarioId], tipo, texto, refId);
  }

  // Versão em lote: um único salvamento para vários destinatários.
  async notifyMany(
    usuarioIds: number[],
    tipo: TipoNotificacao,
    texto: string,
    refId?: number,
  ): Promise<void> {
    if (usuarioIds.length === 0) {
      return;
    }

    const criadaEm = new Date();
    const notificacoes = this.repository.create(
      usuarioIds.map((id) => ({
        usuario: { id } as Usuario,
        tipo,
        texto,
        refId: refId ?? null,
        lida: false,
        criadaEm,
      })),
    );
    await this.repository.save(notificacoes, { chunk: 500 });
  }

  async notifyManyOnce(
    usuarioIds: number[],
    tipo: TipoNotificacao,
    texto: string,
    chaveEvento: string,
    criadaEm: Date = new Date(),
    refId?: number,
  ): Promise<void> {
    const destinatarios = [...new Set(usuarioIds)];
    if (destinatarios.length === 0) {
      return;
    }

    await this.repository
      .createQueryBuilder()
      .insert()
      .into(Notificacao)
      .values(
        destinatarios.map((id) => ({
          usuario: { id } as Usuario,
          tipo,
          texto,
          refId: refId ?? null,
          chaveUnica: `${chaveEvento}:${id}`,
          lida: false,
          criadaEm,
        })),
      )
      .orIgnore()
      .execute();
  }

  async listar(
    filtros: FiltrosNotificacaoDto,
    usuario: AuthUserDto,
  ): Promise<PaginatedResponseDto<NotificacaoResponseDto>> {
    // O filtro por usuário vem SEMPRE do token, nunca de um parâmetro da requisição.
    const [items, total] = await this.repository.findAndCount({
      where: {
        usuario: { id: usuario.id },
        ...(filtros.apenasNaoLidas ? { lida: false } : {}),
      },
      order: { criadaEm: 'DESC', id: 'DESC' },
      skip: (filtros.pagina - 1) * filtros.limite,
      take: filtros.limite,
    });

    return paginate(
      items.map((item) => NotificacaoResponseDto.fromEntity(item)),
      total,
      filtros.pagina,
      filtros.limite,
    );
  }

  // Usa o mesmo filtro da listagem com apenasNaoLidas, então os números sempre batem.
  async contarNaoLidas(
    usuario: AuthUserDto,
  ): Promise<ContagemNaoLidasResponseDto> {
    const naoLidas = await this.repository.count({
      where: { usuario: { id: usuario.id }, lida: false },
    });
    return { naoLidas };
  }

  async marcarComoLida(
    id: number,
    usuario: AuthUserDto,
  ): Promise<NotificacaoResponseDto> {
    // Notificação de outra pessoa responde 404, para não revelar que ela existe.
    const notificacao = await this.repository.findOne({
      where: { id, usuario: { id: usuario.id } },
    });
    if (!notificacao) {
      throw new NotFoundException('Notificação não encontrada.');
    }

    if (!notificacao.lida) {
      notificacao.lida = true;
      await this.repository.save(notificacao);
    }
    return NotificacaoResponseDto.fromEntity(notificacao);
  }

  async marcarTodasComoLidas(
    usuario: AuthUserDto,
  ): Promise<LeituraEmMassaResponseDto> {
    const resultado = await this.repository
      .createQueryBuilder()
      .update(Notificacao)
      .set({ lida: true })
      .where('"usuarioId" = :usuarioId', { usuarioId: usuario.id })
      .andWhere('lida = false')
      .execute();
    return { atualizadas: resultado.affected ?? 0 };
  }
}
