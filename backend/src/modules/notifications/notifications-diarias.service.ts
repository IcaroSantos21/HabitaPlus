import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContratoLocacao } from '../../database/entities/contrato-locacao.entity';
import { Cobranca } from '../../database/entities/cobranca.entity';
import { Chamado } from '../../database/entities/chamado.entity';
import {
  PerfilUsuario,
  StatusCobranca,
  StatusLocacao,
} from '../../database/entities/enums';
import { Usuario } from '../../database/entities/usuario.entity';
import { TipoNotificacao } from './enums/tipo-notificacao.enum';
import { NotificationsService } from './notifications.service';
import { adicionarDias, dataDeHoje } from '../charges/utils/datas';

interface UsuarioIdRow {
  id: number;
}

interface ContratoVencendoRow {
  id: number;
  fim: string;
  bloco: string;
  numero: string;
}

interface CobrancaNotificavelRow {
  cobranca_id: number;
  vencimento: string;
  bloco: string;
  numero: string;
  usuario_id: number | null;
}

interface EquipamentoRecorrenteRow {
  equipamento: string;
  total: number;
  ref_id: number;
}

@Injectable()
export class NotificationsDiariasService {
  constructor(
    @InjectRepository(ContratoLocacao)
    private readonly contratosRepository: Repository<ContratoLocacao>,
    @InjectRepository(Cobranca)
    private readonly cobrancasRepository: Repository<Cobranca>,
    @InjectRepository(Chamado)
    private readonly chamadosRepository: Repository<Chamado>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async run(agora: Date = new Date()): Promise<void> {
    const hoje = dataDeHoje(agora);
    const vencimentoLimite = adicionarDias(hoje, 30);
    const vencimentoProximo = adicionarDias(hoje, 3);
    const inicioPeriodoManutencao = adicionarDias(hoje, -89);

    const gestores = await this.usuariosRepository.query<UsuarioIdRow[]>(
      `
      SELECT "id"
      FROM "usuarios"
      WHERE "perfil" IN ($1, $2)
      `,
      [PerfilUsuario.SINDICO, PerfilUsuario.ADMIN],
    );
    const gestorIds = gestores.map(({ id }) => id);

    if (gestorIds.length > 0) {
      await this.notificarContratosVencendo(
        hoje,
        vencimentoLimite,
        gestorIds,
        agora,
      );
    }

    await this.notificarCobrancas(hoje, vencimentoProximo, gestorIds, agora);

    if (gestorIds.length > 0) {
      await this.notificarEquipamentosRecorrentes(
        hoje,
        inicioPeriodoManutencao,
        gestorIds,
        agora,
      );
    }
  }

  private async notificarContratosVencendo(
    hoje: string,
    vencimentoLimite: string,
    gestorIds: number[],
    agora: Date,
  ): Promise<void> {
    const contratos = await this.contratosRepository.query<
      ContratoVencendoRow[]
    >(
      `
      SELECT c."id", c."fim"::text AS "fim", u."bloco", u."numero"
      FROM "contratos_locacao" c
      INNER JOIN "unidades" u ON u."id" = c."unidadeId"
      WHERE c."inicio" <= $1::date
        AND c."fim" >= $1::date
        AND c."fim" <= $2::date
        AND c."status" <> $3
      ORDER BY c."fim", c."id"
      `,
      [hoje, vencimentoLimite, StatusLocacao.ENCERRADO],
    );

    for (const contrato of contratos) {
      await this.notificationsService.notifyManyOnce(
        gestorIds,
        TipoNotificacao.ALERTA,
        `O contrato de locação da unidade ${contrato.bloco}/${contrato.numero} vence em ${contrato.fim}.`,
        `contrato-vencendo:${contrato.id}:${hoje}`,
        agora,
        contrato.id,
      );
    }
  }

  private async notificarCobrancas(
    hoje: string,
    vencimentoProximo: string,
    gestorIds: number[],
    agora: Date,
  ): Promise<void> {
    const cobrancas = await this.cobrancasRepository.query<
      CobrancaNotificavelRow[]
    >(
      `
      SELECT
        c."id" AS "cobranca_id",
        c."vencimento"::text AS "vencimento",
        u."bloco",
        u."numero",
        moradores."usuario_id"
      FROM "cobrancas" c
      INNER JOIN "unidades" u ON u."id" = c."unidadeId"
      LEFT JOIN LATERAL (
        SELECT v."usuarioId" AS "usuario_id"
        FROM "vinculos" v
        WHERE v."unidadeId" = c."unidadeId"
        UNION
        SELECT ct."locatarioId" AS "usuario_id"
        FROM "contratos_locacao" ct
        WHERE ct."unidadeId" = c."unidadeId"
          AND ct."inicio" <= $1::date
          AND (ct."fim" IS NULL OR ct."fim" >= $1::date)
      ) moradores ON TRUE
      WHERE c."status" <> $3
        AND (
          c."vencimento" < $1::date
          OR c."vencimento" BETWEEN $1::date AND $2::date
        )
      ORDER BY c."vencimento", c."id", moradores."usuario_id"
      `,
      [hoje, vencimentoProximo, StatusCobranca.PAGA],
    );

    const agrupadas = new Map<
      number,
      {
        vencimento: string;
        bloco: string;
        numero: string;
        moradores: Set<number>;
      }
    >();
    for (const row of cobrancas) {
      let cobranca = agrupadas.get(row.cobranca_id);
      if (!cobranca) {
        cobranca = {
          vencimento: row.vencimento,
          bloco: row.bloco,
          numero: row.numero,
          moradores: new Set<number>(),
        };
        agrupadas.set(row.cobranca_id, cobranca);
      }
      if (row.usuario_id !== null) {
        cobranca.moradores.add(row.usuario_id);
      }
    }

    for (const [cobrancaId, cobranca] of agrupadas) {
      const atrasada = cobranca.vencimento < hoje;
      const destinatarios = new Set(cobranca.moradores);
      if (atrasada) {
        gestorIds.forEach((id) => destinatarios.add(id));
      }

      const mensagem = atrasada
        ? `A cobrança da unidade ${cobranca.bloco}/${cobranca.numero} venceu em ${cobranca.vencimento} e está atrasada.`
        : `A cobrança da unidade ${cobranca.bloco}/${cobranca.numero} vence em ${cobranca.vencimento}.`;
      const evento = atrasada ? 'cobranca-atrasada' : 'cobranca-vencendo';

      await this.notificationsService.notifyManyOnce(
        [...destinatarios],
        TipoNotificacao.COBRANCA,
        mensagem,
        `${evento}:${cobrancaId}:${hoje}`,
        agora,
        cobrancaId,
      );
    }
  }

  private async notificarEquipamentosRecorrentes(
    hoje: string,
    inicioPeriodo: string,
    gestorIds: number[],
    agora: Date,
  ): Promise<void> {
    const equipamentos = await this.chamadosRepository.query<
      EquipamentoRecorrenteRow[]
    >(
      `
      SELECT
        LOWER(BTRIM(ch."equipamento")) AS "equipamento",
        COUNT(*)::int AS "total",
        MAX(ch."id")::int AS "ref_id"
      FROM "chamados" ch
      WHERE ch."equipamento" IS NOT NULL
        AND BTRIM(ch."equipamento") <> ''
        AND LOWER(BTRIM(ch."equipamento")) <> 'nao_informado'
        AND ch."abertoEm" >= $1::date
        AND ch."abertoEm" < ($2::date + INTERVAL '1 day')
      GROUP BY LOWER(BTRIM(ch."equipamento"))
      HAVING COUNT(*) >= 3
      ORDER BY "equipamento"
      `,
      [inicioPeriodo, hoje],
    );

    for (const equipamento of equipamentos) {
      const hashEquipamento = createHash('sha256')
        .update(equipamento.equipamento)
        .digest('hex');
      await this.notificationsService.notifyManyOnce(
        gestorIds,
        TipoNotificacao.ALERTA,
        `O equipamento "${equipamento.equipamento}" teve ${equipamento.total} chamados nos últimos 90 dias. Recomenda-se avaliar a manutenção preventiva.`,
        `manutencao-recorrente:${hashEquipamento}:${hoje}`,
        agora,
        equipamento.ref_id,
      );
    }
  }
}
