import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { AppConfig } from '../../config/configuration';

export interface ExpenseHistoryEntry {
  month: string;
  total: number;
}

export interface PredictExpensesRequest {
  history: ExpenseHistoryEntry[];
}

export interface PredictExpensesResponse {
  month: string;
  predictedTotal: number;
  model: string;
  mae: number;
}

export interface RecommendRequest {
  residentId: number;
  profile: {
    visualizacoes: Record<string, number>;
    anunciadas: Record<string, number>;
    conversas: Record<string, number>;
  };
  candidates: {
    listingId: number;
    categoria: string;
    preco: number;
    popularidade: number;
  }[];
  topN: number;
}

export interface RecommendResponse {
  cluster: number;
  recommendations: {
    listingId: number;
    score: number;
  }[];
}

export interface NluParseResponse {
  intencao: string;
  confianca: number;
  entities: Record<string, unknown>;
}

interface MlNluParseResponse {
  intent: string;
  confidence: number;
  entities: Record<string, unknown>;
}

@Injectable()
export class MlClientService {
  private readonly logger = new Logger(MlClientService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {
    const mlConfig = this.configService.get('mlService', { infer: true });
    this.baseUrl = (mlConfig?.url ?? 'http://127.0.0.1:8000').replace(
      /\/+$/,
      '',
    );
  }

  async predictExpenses(
    payload: PredictExpensesRequest,
  ): Promise<PredictExpensesResponse> {
    return this.callMlService<PredictExpensesRequest, PredictExpensesResponse>(
      '/predict/expenses',
      payload,
    );
  }

  async recommend(payload: RecommendRequest): Promise<RecommendResponse> {
    return this.callMlService<RecommendRequest, RecommendResponse>(
      '/recommend',
      payload,
    );
  }

  async parse(
    text: string,
  ): Promise<NluParseResponse> {
    const response = await this.callMlService<
      { text: string },
      MlNluParseResponse
    >('/nlu/parse', { text });

    return {
      intencao: response.intent,
      confianca: response.confidence,
      entities: response.entities,
    };
  }

  private async callMlService<TRequest, TResponse>(
    path: string,
    payload: TRequest,
  ): Promise<TResponse> {
    const inicio = Date.now();
    let ultimaFalha: unknown;

    for (let tentativa = 1; tentativa <= 2; tentativa += 1) {
      try {
        const response = await firstValueFrom(
          this.httpService.post<TResponse>(`${this.baseUrl}${path}`, payload, {
            timeout: 3000,
          }),
        );

        const tempo = Date.now() - inicio;
        this.logger.log(
          `[ml-client] ${path} respondeu em ${tempo}ms na tentativa ${tentativa}`,
        );

        return response.data;
      } catch (error) {
        ultimaFalha = error;
      }
    }

    const mensagem = 'ML-service indisponível. Tente novamente em instantes.';
    this.logger.error(
      `[ml-client] Falha ao chamar ${path} após 2 tentativas`,
      ultimaFalha instanceof Error ? ultimaFalha.stack : undefined,
    );

    throw new ServiceUnavailableException(mensagem);
  }
}
