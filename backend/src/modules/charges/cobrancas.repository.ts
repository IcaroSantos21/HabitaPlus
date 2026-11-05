import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cobranca } from '../../database/entities/cobranca.entity';
import { StatusCobranca, TipoTransacao } from '../../database/entities/enums';

export const CATEGORIA_RECEITA_COBRANCA = 'taxa condominial';

export interface ParametrosGeracao {
  // Primeiro dia do mês (YYYY-MM-01), como a coluna `competencia` armazena.
  competencia: string;
  valor: number;
  vencimento: string;
}

export interface ResultadoGeracao {
  totalOcupadas: number;
  criadas: number;
}

export interface FiltrosCobranca {
  competencia?: string;
  status?: StatusCobranca;
  unidadeId?: number;
  // Quando informado, restringe às unidades em que o usuário mora ou aluga.
  moradorId?: number;
  pagina: number;
  limite: number;
}

export interface ParametrosPagamento {
  cobrancaId: number;
  usuarioId: number;
  data: string;
}

@Injectable()
export class ChargesRepository {
  constructor(
    @InjectRepository(Cobranca)
    private readonly repository: Repository<Cobranca>,
  ) {}

  // Um único comando SQL: seleciona as unidades ocupadas na competência e insere
  // as cobranças que faltam. O índice único (unidade + competência) com
  // ON CONFLICT DO NOTHING torna a geração idempotente e segura contra execuções
  // simultâneas, sem o padrão frágil "consulta e depois insere".
  async generateForOccupiedUnits(
    params: ParametrosGeracao,
  ): Promise<ResultadoGeracao> {
    const rows = await this.repository.query<ResultadoGeracao[]>(
      `
      WITH ocupadas AS (
        SELECT u."id"
        FROM "unidades" u
        WHERE EXISTS (
            SELECT 1 FROM "vinculos" v WHERE v."unidadeId" = u."id"
          )
          OR EXISTS (
            SELECT 1 FROM "contratos_locacao" c
            WHERE c."unidadeId" = u."id"
              AND c."inicio" < ($1::date + INTERVAL '1 month')
              AND (c."fim" IS NULL OR c."fim" >= $1::date)
          )
      ),
      inseridas AS (
        INSERT INTO "cobrancas" ("unidadeId", "competencia", "valor", "vencimento", "status")
        SELECT o."id", $1::date, $2::numeric, $3::date, $4::"status_cobranca_enum"
        FROM ocupadas o
        ON CONFLICT ("unidadeId", "competencia") DO NOTHING
        RETURNING "id"
      )
      SELECT
        (SELECT COUNT(*) FROM ocupadas)::int AS "totalOcupadas",
        (SELECT COUNT(*) FROM inseridas)::int AS "criadas"
      `,
      [
        params.competencia,
        params.valor,
        params.vencimento,
        StatusCobranca.PENDENTE,
      ],
    );
    return rows[0];
  }

  async findPaginated(
    filtros: FiltrosCobranca,
  ): Promise<{ items: Cobranca[]; total: number }> {
    // innerJoin de muitos-para-um não multiplica linhas, então offset/limit é seguro
    // e evita as consultas extras que skip/take faria com joins.
    const query = this.repository
      .createQueryBuilder('cobranca')
      .innerJoinAndSelect('cobranca.unidade', 'unidade')
      .orderBy('cobranca.competencia', 'DESC')
      .addOrderBy('unidade.bloco', 'ASC')
      .addOrderBy('unidade.numero', 'ASC')
      .addOrderBy('cobranca.id', 'ASC')
      .offset((filtros.pagina - 1) * filtros.limite)
      .limit(filtros.limite);

    if (filtros.competencia) {
      query.andWhere('cobranca.competencia = :competencia', {
        competencia: `${filtros.competencia}-01`,
      });
    }
    if (filtros.status) {
      query.andWhere('cobranca.status = :status', { status: filtros.status });
    }
    if (filtros.unidadeId) {
      query.andWhere('unidade.id = :unidadeId', {
        unidadeId: filtros.unidadeId,
      });
    }
    if (filtros.moradorId) {
      query.andWhere(
        `(EXISTS (
            SELECT 1 FROM "vinculos" v
            WHERE v."unidadeId" = unidade.id AND v."usuarioId" = :moradorId
          )
          OR EXISTS (
            SELECT 1 FROM "contratos_locacao" ct
            WHERE ct."unidadeId" = unidade.id
              AND ct."locatarioId" = :moradorId
              AND ct."inicio" < (cobranca.competencia + INTERVAL '1 month')
              AND (ct."fim" IS NULL OR ct."fim" >= cobranca.competencia)
          ))`,
        { moradorId: filtros.moradorId },
      );
    }

    const [items, total] = await query.getManyAndCount();
    return { items, total };
  }

  findOneWithUnit(id: number): Promise<Cobranca | null> {
    return this.repository.findOne({
      where: { id },
      relations: { unidade: true },
    });
  }

  // Marca como ATRASADA, num único UPDATE, o que está PENDENTE e venceu antes de `hoje`.
  async markOverdue(hoje: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .update(Cobranca)
      .set({ status: StatusCobranca.ATRASADA })
      .where('status = :pendente', { pendente: StatusCobranca.PENDENTE })
      .andWhere('vencimento < :hoje', { hoje })
      .execute();
    return result.affected ?? 0;
  }

  // Muda o status para PAGA e lança a receita no mesmo comando SQL, então os dois
  // acontecem juntos ou nenhum acontece. Só atua se a cobrança ainda estiver em
  // aberto: reenvios (ex.: webhook repetido) devolvem false e não duplicam a receita.
  // As datas seguem como texto para não depender do fuso do servidor.
  async markAsPaid(params: ParametrosPagamento): Promise<boolean> {
    const rows = await this.repository.query<{ pagas: number }[]>(
      `
      WITH paga AS (
        UPDATE "cobrancas"
        SET "status" = $2::"status_cobranca_enum"
        WHERE "id" = $1 AND "status" IN ($3::"status_cobranca_enum", $4::"status_cobranca_enum")
        RETURNING "id", "unidadeId", "competencia", "valor"
      ),
      receita AS (
        INSERT INTO "transacoes" ("usuarioId", "tipo", "categoria", "valor", "competencia", "data", "descricao")
        SELECT $5, $6::"tipo_transacao_enum", $7, p."valor", p."competencia", $8::date,
               'Cobrança #' || p."id" || ' - bloco ' || u."bloco" || ', unidade ' || u."numero"
        FROM paga p
        JOIN "unidades" u ON u."id" = p."unidadeId"
        RETURNING "id"
      )
      SELECT (SELECT COUNT(*) FROM paga)::int AS "pagas"
      `,
      [
        params.cobrancaId,
        StatusCobranca.PAGA,
        StatusCobranca.PENDENTE,
        StatusCobranca.ATRASADA,
        params.usuarioId,
        TipoTransacao.RECEITA,
        CATEGORIA_RECEITA_COBRANCA,
        params.data,
      ],
    );
    return rows[0].pagas === 1;
  }
}
