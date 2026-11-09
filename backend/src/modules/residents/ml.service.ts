
import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';

@Injectable()
export class MlService {
  private readonly baseUrl: string;

  constructor(
    private readonly config: ConfigService<AppConfig, true>,
  ) {
    const mlConfig = this.config.get('mlService', { infer: true });

    this.baseUrl = mlConfig.url.replace(/\/+$/, '');
  }

  async recomendar<TRequest extends object, TResponse>(
    payload: TRequest,
  ): Promise<TResponse> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ServiceUnavailableException(
        'Não foi possível conectar ao ML-service.',
      );
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `O ML-service retornou o status HTTP ${response.status}.`,
      );
    }

    try {
      return (await response.json()) as TResponse;
    } catch {
      throw new ServiceUnavailableException(
        'O ML-service retornou uma resposta inválida.',
      );
    }
  }
}
