import { BadRequestException, Injectable } from '@nestjs/common';
import { dataDeHoje } from '../charges/utils/datas';
import { TransacoesService } from '../transacoes/transacoes.service';
import {
  DashboardQueryDto,
  InadimplenciaQueryDto,
} from './dto/finance-query.dto';
import {
  DashboardResponseDto,
  InadimplenciaResponseDto,
} from './dto/finance-response.dto';
import { FinanceRepository, LinhaInadimplenciaMes } from './finance.repository';

@Injectable()
export class FinanceService {
  constructor(
    private readonly financeRepository: FinanceRepository,
    private readonly transacoesService: TransacoesService,
  ) {}

  async inadimplencia(
    query: InadimplenciaQueryDto,
  ): Promise<InadimplenciaResponseDto> {
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException(
        'O parâmetro from deve ser anterior ou igual ao parâmetro to.',
      );
    }

    const [linhasMes, linhasUnidade] = await Promise.all([
      this.financeRepository.sumByMonth(query.from, query.to),
      this.financeRepository.sumOverdueByUnit(query.from, query.to),
    ]);

    const totalCobrado = linhasMes.reduce(
      (soma, linha) => soma + Number(linha.totalCobrado),
      0,
    );
    const totalEmAtraso = linhasMes.reduce(
      (soma, linha) => soma + Number(linha.totalEmAtraso),
      0,
    );

    const porUnidade = linhasUnidade
      .map((linha) => ({
        unidadeId: Number(linha.unidadeId),
        bloco: linha.bloco,
        numero: linha.numero,
        totalEmAtraso: this.arredondar(Number(linha.totalEmAtraso)),
        cobrancasAtrasadas: Number(linha.cobrancasAtrasadas),
      }))
      // Maior dívida primeiro; empate resolvido por bloco e número.
      .sort(
        (a, b) =>
          b.totalEmAtraso - a.totalEmAtraso ||
          a.bloco.localeCompare(b.bloco) ||
          a.numero.localeCompare(b.numero),
      );

    return {
      totalEmAtraso: this.arredondar(totalEmAtraso),
      percentual: this.percentual(totalEmAtraso, totalCobrado),
      porUnidade,
      porMes: linhasMes.map((linha) => ({
        competencia: linha.competencia,
        totalCobrado: this.arredondar(Number(linha.totalCobrado)),
        totalEmAtraso: this.arredondar(Number(linha.totalEmAtraso)),
        percentual: this.percentual(
          Number(linha.totalEmAtraso),
          Number(linha.totalCobrado),
        ),
      })),
    };
  }

  // `agora` pode ser simulado nos testes.
  async dashboard(
    query: DashboardQueryDto,
    agora: Date = new Date(),
  ): Promise<DashboardResponseDto> {
    const competencia = query.competencia ?? dataDeHoje(agora).slice(0, 7);

    // Receita e despesa vêm do que o módulo de transações já calcula.
    const [resumos, linhasMes, cobrancasPendentes] = await Promise.all([
      this.transacoesService.monthlySummary({
        from: competencia,
        to: competencia,
      }),
      this.financeRepository.sumByMonth(competencia, competencia),
      this.financeRepository.countPending(competencia),
    ]);

    const resumo = resumos[0];
    const mes: LinhaInadimplenciaMes | undefined = linhasMes[0];

    return {
      receitaMes: resumo.receitas,
      despesaMes: resumo.despesas,
      saldoMes: resumo.saldo,
      inadimplenciaPercentual: mes
        ? this.percentual(Number(mes.totalEmAtraso), Number(mes.totalCobrado))
        : 0,
      cobrancasPendentes,
    };
  }

  private percentual(emAtraso: number, cobrado: number): number {
    return cobrado > 0 ? this.arredondar((emAtraso / cobrado) * 100) : 0;
  }

  private arredondar(valor: number): number {
    return Math.round((valor + Number.EPSILON) * 100) / 100;
  }
}
