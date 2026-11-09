import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Cobranca } from '../../database/entities/cobranca.entity';

// O Postgres devolve SUM e COUNT como texto; o service converte para número.
export interface LinhaInadimplenciaMes {
  competencia: string;
  totalCobrado: string | number;
  totalEmAtraso: string | number;
}

export interface LinhaInadimplenciaUnidade {
  unidadeId: string | number;
  bloco: string;
  numero: string;
  totalEmAtraso: string | number;
  cobrancasAtrasadas: string | number;
}

@Injectable()
export class FinanceRepository {
  constructor(
    @InjectRepository(Cobranca)
    private readonly repository: Repository<Cobranca>,
  ) {}

  // Total cobrado e total em atraso por competência (YYYY-MM), do mais antigo ao mais novo.
  sumByMonth(from?: string, to?: string): Promise<LinhaInadimplenciaMes[]> {
    const query = this.repository
      .createQueryBuilder('cobranca')
      .select("TO_CHAR(cobranca.competencia, 'YYYY-MM')", 'competencia')
      .addSelect('COALESCE(SUM(cobranca.valor), 0)', 'totalCobrado')
      .addSelect(
        "COALESCE(SUM(CASE WHEN cobranca.status = 'ATRASADA' THEN cobranca.valor ELSE 0 END), 0)",
        'totalEmAtraso',
      )
      .groupBy("TO_CHAR(cobranca.competencia, 'YYYY-MM')")
      .orderBy('competencia', 'ASC');

    this.aplicarPeriodo(query, from, to);
    return query.getRawMany<LinhaInadimplenciaMes>();
  }

  // Só unidades que têm cobrança atrasada no período.
  sumOverdueByUnit(
    from?: string,
    to?: string,
  ): Promise<LinhaInadimplenciaUnidade[]> {
    const query = this.repository
      .createQueryBuilder('cobranca')
      .innerJoin('cobranca.unidade', 'unidade')
      .select('unidade.id', 'unidadeId')
      .addSelect('unidade.bloco', 'bloco')
      .addSelect('unidade.numero', 'numero')
      .addSelect('SUM(cobranca.valor)', 'totalEmAtraso')
      .addSelect('COUNT(cobranca.id)', 'cobrancasAtrasadas')
      .where("cobranca.status = 'ATRASADA'")
      .groupBy('unidade.id')
      .addGroupBy('unidade.bloco')
      .addGroupBy('unidade.numero');

    this.aplicarPeriodo(query, from, to);
    return query.getRawMany<LinhaInadimplenciaUnidade>();
  }

  countPending(competencia: string): Promise<number> {
    return this.repository
      .createQueryBuilder('cobranca')
      .where("cobranca.status = 'PENDENTE'")
      .andWhere('cobranca.competencia = :competencia', {
        competencia: `${competencia}-01`,
      })
      .getCount();
  }

  // A coluna `competencia` guarda sempre o dia 1, então comparar com o dia 1 basta.
  private aplicarPeriodo(
    query: SelectQueryBuilder<Cobranca>,
    from?: string,
    to?: string,
  ): void {
    if (from) {
      query.andWhere('cobranca.competencia >= :from', { from: `${from}-01` });
    }
    if (to) {
      query.andWhere('cobranca.competencia <= :to', { to: `${to}-01` });
    }
  }
}
