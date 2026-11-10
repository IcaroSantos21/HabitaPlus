import { Injectable } from '@nestjs/common';

import { dataDeHoje } from '../charges/utils/datas';
import {
  MlClientService,
  PredictExpensesResponse,
} from '../ml-client/ml-client.service';
import { TransacoesService } from '../transacoes/transacoes.service';

@Injectable()
export class PredictionsService {
  constructor(
    private readonly transacoesService: TransacoesService,
    private readonly mlClientService: MlClientService,
  ) {}

  async getExpensesForecast(): Promise<PredictExpensesResponse> {
    const competenciaAtual = dataDeHoje(new Date()).slice(0, 7);
    const competenciaInicial = this.subtrairMeses(competenciaAtual, 5);

    const resumosMensais = await this.transacoesService.monthlySummary({
      from: competenciaInicial,
      to: competenciaAtual,
    });

    return this.mlClientService.predictExpenses({
      history: resumosMensais.map((resumo) => ({
        month: resumo.month,
        total: Number(resumo.despesas),
      })),
    });
  }

  private subtrairMeses(competencia: string, quantidade: number): string {
    const [ano, mes] = competencia.split('-').map(Number);
    const data = new Date(Date.UTC(ano, mes - 1 - quantidade, 1));

    return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, '0')}`;
  }
}
