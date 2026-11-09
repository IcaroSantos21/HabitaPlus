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
});
