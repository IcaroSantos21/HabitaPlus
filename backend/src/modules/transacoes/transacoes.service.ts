import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TipoTransacao } from '../../database/entities/enums';
import { CategoriaDespesa } from './enums/categoria-despesa.enum';
import { AtualizarTransacaoDto } from './dto/atualizar-transacao.dto';
import { CriarTransacaoDto } from './dto/criar-transacao.dto';
import {
  ResumoMensalQueryDto,
  TransacaoQueryDto,
} from './dto/transacao-query.dto';
import {
  ResumoMensalResponseDto,
  TransacaoResponseDto,
} from './dto/transacao-response.dto';
import { TransacoesPaginadasResponseDto } from './dto/transacoes-paginadas-response.dto';
import { TransacoesRepository } from './transacoes.repository';

@Injectable()
export class TransacoesService {
  constructor(private readonly transacoesRepository: TransacoesRepository) {}

  async create(
    input: CriarTransacaoDto,
    usuarioId: number,
  ): Promise<TransacaoResponseDto> {
    const tipo = input.tipo;
    const categoria = this.validarCategoria(tipo, input.categoria);
    this.validarValor(input.valor);
    const transacao = await this.transacoesRepository.createAndLoad({
      usuario: { id: usuarioId },
      tipo,
      categoria,
      valor: input.valor,
      competencia: this.competenciaParaDate(input.competencia),
      data: new Date(input.data),
      descricao: input.descricao ?? null,
    });
    return TransacaoResponseDto.fromEntity(transacao);
  }

  async findAll(
    query: TransacaoQueryDto,
  ): Promise<TransacoesPaginadasResponseDto> {
    const filtros = {
      competencia: query.competencia,
      tipo: query.tipo,
      categoria: query.categoria?.trim().toLocaleLowerCase('pt-BR'),
      pagina: query.pagina,
      limite: query.limite,
    };
    const { items, total } =
      await this.transacoesRepository.findPaginated(filtros);
    return {
      data: items.map((item) => TransacaoResponseDto.fromEntity(item)),
      meta: {
        pagina: query.pagina,
        limite: query.limite,
        total,
        totalPaginas: Math.ceil(total / query.limite),
      },
    };
  }

  async update(
    id: number,
    input: AtualizarTransacaoDto,
  ): Promise<TransacaoResponseDto> {
    const transacao = await this.transacoesRepository.findOne(id);
    if (!transacao) {
      throw new NotFoundException('Transação não encontrada.');
    }

    const tipo = input.tipo ?? transacao.tipo;
    const categoria = this.validarCategoria(
      tipo,
      input.categoria ?? transacao.categoria,
    );
    transacao.tipo = tipo;
    transacao.categoria = categoria;
    if (input.valor !== undefined) {
      this.validarValor(input.valor);
      transacao.valor = input.valor;
    }
    if (input.competencia !== undefined) {
      transacao.competencia = this.competenciaParaDate(input.competencia);
    }
    if (input.data !== undefined) transacao.data = new Date(input.data);
    if (input.descricao !== undefined) transacao.descricao = input.descricao;

    const atualizada = await this.transacoesRepository.save(transacao);
    return TransacaoResponseDto.fromEntity(atualizada);
  }

  async remove(id: number): Promise<void> {
    const transacao = await this.transacoesRepository.findOne(id);
    if (!transacao) {
      throw new NotFoundException('Transação não encontrada.');
    }
    await this.transacoesRepository.remove(transacao);
  }

  async monthlySummary(
    query: ResumoMensalQueryDto,
  ): Promise<ResumoMensalResponseDto[]> {
    this.validarIntervalo(query.from, query.to);
    const toExclusive = this.proximoMes(query.to);
    const rows = await this.transacoesRepository.sumByMonth(
      query.from,
      toExclusive,
    );
    const porMes = new Map(
      rows.map((row) => [
        row.month,
        {
          receitas: this.arredondar(Number(row.receitas)),
          despesas: this.arredondar(Number(row.despesas)),
        },
      ]),
    );

    const resultado: ResumoMensalResponseDto[] = [];
    for (
      let month = query.from;
      month <= query.to;
      month = this.proximoMes(month)
    ) {
      const valores = porMes.get(month) ?? { receitas: 0, despesas: 0 };
      resultado.push({
        month,
        receitas: valores.receitas,
        despesas: valores.despesas,
        saldo: this.arredondar(valores.receitas - valores.despesas),
      });
    }
    return resultado;
  }

  private validarCategoria(tipo: TipoTransacao, valor: string): string {
    const categoria = valor.trim().toLocaleLowerCase('pt-BR');
    if (!categoria) {
      throw new BadRequestException('A categoria não pode ser vazia.');
    }
    if (
      tipo === TipoTransacao.DESPESA &&
      !Object.values(CategoriaDespesa).includes(categoria as CategoriaDespesa)
    ) {
      throw new BadRequestException(
        'A categoria da despesa deve ser água, energia, limpeza, manutenção, salários ou outros.',
      );
    }
    return categoria;
  }

  private validarValor(valor: number): void {
    if (!Number.isFinite(valor) || valor <= 0) {
      throw new BadRequestException('O valor deve ser maior que zero.');
    }
  }

  private competenciaParaDate(competencia: string): Date {
    return new Date(`${competencia}-01T00:00:00.000Z`);
  }

  private validarIntervalo(from: string, to: string): void {
    if (from > to) {
      throw new BadRequestException(
        'O parâmetro from deve ser anterior ou igual ao parâmetro to.',
      );
    }
  }

  private proximoMes(month: string): string {
    const [year, monthNumber] = month.split('-').map(Number);
    const date = new Date(Date.UTC(year, monthNumber, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private arredondar(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
