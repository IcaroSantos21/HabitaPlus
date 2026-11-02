import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Transacao } from '../../database/entities/transacao.entity';
import { TipoTransacao } from '../../database/entities/enums';

export interface FiltrosTransacao {
  competencia?: string;
  tipo?: TipoTransacao;
  categoria?: string;
  pagina: number;
  limite: number;
}

export interface LinhaResumoMensal {
  month: string;
  receitas: string | number;
  despesas: string | number;
}

@Injectable()
export class TransacoesRepository {
  constructor(
    @InjectRepository(Transacao)
    private readonly repository: Repository<Transacao>,
  ) {}

  async createAndLoad(data: DeepPartial<Transacao>): Promise<Transacao> {
    const saved = await this.repository.save(this.repository.create(data));
    return this.findOneOrFail(saved.id);
  }

  async findPaginated(
    filtros: FiltrosTransacao,
  ): Promise<{ items: Transacao[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('transacao')
      .leftJoinAndSelect('transacao.usuario', 'usuario')
      .orderBy('transacao.competencia', 'DESC')
      .skip((filtros.pagina - 1) * filtros.limite)
      .take(filtros.limite);

    if (filtros.competencia) {
      query.andWhere('transacao.competencia = :competencia', {
        competencia: `${filtros.competencia}-01`,
      });
    }
    if (filtros.tipo) {
      query.andWhere('transacao.tipo = :tipo', { tipo: filtros.tipo });
    }
    if (filtros.categoria) {
      query.andWhere('LOWER(transacao.categoria) = LOWER(:categoira)', {
        categoria: filtros.categoria,
      });
    }

    const [items, total] = await query.getManyAndCount();
    return { items, total };
  }

  async findOneOrFail(id: number): Promise<Transacao> {
    const entity = await this.repository.findOne({
      where: { id },
      relations: { usuario: true },
    });
    if (!entity) {
      throw new Error('Transação não encontrada após persistencia');
    }
    return entity;
  }

  async findOne(id: number): Promise<Transacao | null> {
    return this.repository.findOne({
      where: { id },
      relations: { usuario: true },
    });
  }

  async save(entity: Transacao): Promise<Transacao> {
    await this.repository.save(entity);
    return this.findOneOrFail(entity.id);
  }

  async remove(entity: Transacao): Promise<void> {
    await this.repository.remove(entity);
  }

  async sumByMonth(
    from: string,
    toExclusive: string,
  ): Promise<LinhaResumoMensal[]> {
    const rows = await this.repository
      .createQueryBuilder('transacao')
      .select("TO_CHAR(transacao.competencia, 'YYYY-MM')", 'month')
      .addSelect(
        "COALESCE(SUM(CASE WHEN transacao.tipo = 'RECEITA' THEN transacao.valor ELSE 0 END), 0)",
        'receitas',
      )
      .addSelect(
        "COALESCE(SUM(CASE WHEN transacao.tipo = 'DESPESA' THEN transacao.valor ELSE 0 END), 0)",
        'despesas',
      )
      .where('transacao.competencia >= :from', { from: `${from}-01` })
      .andWhere('transacao.competencia < :toExclusive', {
        toExclusive: `${toExclusive}-01`,
      })
      .groupBy("TO_CHAR(transacao.competencia, 'YYYY-MM')")
      .orderBy('month', 'ASC')
      .getRawMany<LinhaResumoMensal>();

    return rows;
  }
}
