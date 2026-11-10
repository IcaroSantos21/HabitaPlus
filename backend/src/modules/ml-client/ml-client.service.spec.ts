import { HttpService } from '@nestjs/axios';
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';

import { AppConfig } from '../../config/configuration';
import { MlClientService } from './ml-client.service';

describe('MlClientService', () => {
  const httpService = {
    post: jest.fn(),
  } as Pick<HttpService, 'post'>;

  const configService = {
    get: jest.fn(),
  } as jest.Mocked<Pick<ConfigService<AppConfig, true>, 'get'>>;

  beforeEach(() => {
    jest.clearAllMocks();
    configService.get.mockImplementation((key: string) => {
      if (key === 'mlService') {
        return { url: 'http://ml-service:8000' };
      }

      return undefined;
    });
  });

  it('deve repetir uma chamada falha e devolver a resposta do ML service', async () => {
    const service = new MlClientService(
      httpService as HttpService,
      configService as ConfigService<AppConfig, true>,
    );

    httpService.post = jest
      .fn()
      .mockReturnValueOnce(throwError(() => new Error('timeout')))
      .mockReturnValueOnce(
        of({
          data: {
            month: '2026-11',
            predictedTotal: 19500,
            model: 'ridge',
            mae: 610,
          },
        }),
      );

    await expect(
      service.predictExpenses({
        history: [
          { month: '2026-09', total: 18000 },
          { month: '2026-10', total: 18800 },
        ],
      }),
    ).resolves.toEqual({
      month: '2026-11',
      predictedTotal: 19500,
      model: 'ridge',
      mae: 610,
    });

    expect(httpService.post).toHaveBeenCalledTimes(2);
  });

  it('deve transformar erros de conectividade em 503 em português', async () => {
    const service = new MlClientService(
      httpService as HttpService,
      configService as ConfigService<AppConfig, true>,
    );

    httpService.post = jest
      .fn()
      .mockReturnValue(throwError(() => new Error('ECONNREFUSED')));

    await expect(
      service.predictExpenses({
        history: [
          { month: '2026-09', total: 18000 },
          { month: '2026-10', total: 18800 },
        ],
      }),
    ).rejects.toThrow(ServiceUnavailableException);

    await expect(
      service.predictExpenses({
        history: [
          { month: '2026-09', total: 18000 },
          { month: '2026-10', total: 18800 },
        ],
      }),
    ).rejects.toThrow('ML-service indisponível. Tente novamente em instantes.');
  });

  it('deve adaptar o contrato NLU do ml-service para o chatbot', async () => {
    const service = new MlClientService(
      httpService as HttpService,
      configService as ConfigService<AppConfig, true>,
    );
    httpService.post = jest.fn().mockReturnValue(
      of({
        data: {
          intent: 'regras_condominio',
          confidence: 0.93,
          entities: {},
        },
      }),
    );

    await expect(service.parse('Quais sao as regras?')).resolves.toEqual({
      intencao: 'regras_condominio',
      confianca: 0.93,
      entities: {},
    });
    expect(httpService.post).toHaveBeenCalledWith(
      'http://ml-service:8000/nlu/parse',
      { text: 'Quais sao as regras?' },
      expect.objectContaining({ timeout: 3000 }),
    );
  });
});
