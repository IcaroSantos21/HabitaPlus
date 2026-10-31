import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chamado } from '../../database/entities/chamado.entity';
import { StatusChamado } from '../../database/entities/enums';

export const SEM_EQUIPAMENTO = 'nao_informado';

export interface ChamadoFiltro {
  usuarioId?: number;
  status?: StatusChamado;
  categoria?: string;
  equipamento?: string;
  areaComum?: string;
  pagina: number;
  limite: number;
}

export interface NovoChamado {
  usuarioId: number;
  unidadeId: number | null;
  areaComum: string | null;
  categoria: string;
  equipamento: string;
  descricao: string;
  status: StatusChamado;
  abertoEm: Date;
}

export interface ContagemEquipamentoMes {
  mes: string;
  equipamento: string;
  total: number;
}

// Acesso a dados dos chamados: consultas com join e agregações ficam aqui
@Injectable()
export class ChamadosRepository {
  constructor(
    @InjectRepository(Chamado)
    private readonly repository: Repository<Chamado>,
  ) {}

  async createAndLoad(input: NovoChamado): Promise<Chamado> {
    const saved = await this.repository.save(
      this.repository.create({
        usuario: { id: input.usuarioId },
        unidade: input.unidadeId === null ? null : { id: input.unidadeId },
        areaComum: input.areaComum,
        categoria: input.categoria,
        equipamento: input.equipamento,
        descricao: input.descricao,
        status: input.status,
        abertoEm: input.abertoEm,
        encerradoEm: null,
      }),
    );
    return this.repository.findOneOrFail({
      where: { id: saved.id },
      relations: { usuario: true, unidade: true },
    });
  }

  findOneWithRelations(id: number): Promise<Chamado | null> {
    return this.repository.findOne({
      where: { id },
      relations: { usuario: true, unidade: true },
    });
  }

  async findPaginated(
    filter: ChamadoFiltro,
  ): Promise<{ items: Chamado[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('chamado')
      .leftJoinAndSelect('chamado.usuario', 'usuario')
      .leftJoinAndSelect('chamado.unidade', 'unidade')
      .orderBy('chamado.abertoEm', 'DESC')
      .addOrderBy('chamado.id', 'DESC')
      .skip((filter.pagina - 1) * filter.limite)
      .take(filter.limite);

    if (filter.usuarioId !== undefined) {
      query.andWhere('usuario.id = :usuarioId', { usarioId: filter.usuarioId });
    }
    if (filter.status) {
      query.andWhere('chamado.status = :status', { status: filter.status });
    }
    if (filter.categoria) {
      query.andWhere('chamado.categoria = :categoria', {
        categoria: filter.categoria,
      });
    }
    if (filter.areaComum) {
      query.andHaving('chamado.areaComum = :areaComum', {
        areaComum: filter.areaComum,
      });
    }

    const [items, total] = await query.getManyAndCount();
    return { items, total };
  }

  // Só altera se o status ainda for o que foi lido
  async updateStatusIfCurrent(
    id: number,
    atual: StatusChamado,
    novo: StatusChamado,
    encerradoEm: Date | null,
  ): Promise<boolean> {
    const result = await this.repository.update(
      { id, status: atual },
      { status: novo, encerradoEm },
    );
    return (result.affected ?? 0) > 0;
  }

  async countByEquipmentAndMonth(): Promise<ContagemEquipamentoMes[]> {
    // Expressões fixas
    const equipamento = `COALESCE(chamado.equipamento, '${SEM_EQUIPAMENTO}')`;
    const mes = `to_char(chamado.abertoEm, 'YYYY-MM')`;

    const rows = await this.repository
      .createQueryBuilder('chamado')
      .select(equipamento, 'equipamento')
      .addSelect(mes, 'mes')
      .addSelect('COUNT(*)', 'total')
      .groupBy(equipamento)
      .addGroupBy(mes)
      .getRawMany<{ equipamento: string; mes: string; total: string }>();

    return rows
      .map((row) => ({
        mes: row.mes,
        equipamento: row.equipamento,
        total: Number(row.total),
      }))
      .sort(
        (a, b) =>
          a.mes.localeCompare(b.mes) ||
          a.equipamento.localeCompare(b.equipamento),
      );
  }
}
