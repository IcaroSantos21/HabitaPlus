import { DataSource } from 'typeorm';
import { HealthService } from './health.service';

describe('HealthService', () => {
  // Simula a consulta ao banco sem precisar de uma conexão real.
  const query = jest.fn();
  const service = new HealthService({ query } as unknown as DataSource);

  beforeEach(() => jest.clearAllMocks());

  // Confere o resultado quando o banco responde à consulta.
  it('deve informar banco ativo quando a consulta funciona', async () => {
    query.mockResolvedValue([{ '?column?': 1 }]);

    await expect(service.checkHealth()).resolves.toEqual({
      status: 'ok',
      database: 'up',
    });
  });

  // Confere o resultado quando a consulta ao banco falha.
  it('deve informar degradado quando o banco não responde', async () => {
    query.mockRejectedValue(new Error('connection refused'));

    await expect(service.checkHealth()).resolves.toEqual({
      status: 'degraded',
      database: 'down',
    });
  });
});
