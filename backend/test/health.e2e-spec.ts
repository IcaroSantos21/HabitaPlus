import { Server } from 'http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { HealthController } from '../src/modules/health/health.controller';
import { HealthService } from '../src/modules/health/health.service';

describe('GET /api/health (e2e)', () => {
  // Mantém a aplicação de teste e uma consulta ao banco simulada.
  let app: INestApplication;
  let server: Server;
  const query = jest.fn();

  beforeAll(async () => {
    // Monta somente o controlador e serviço necessários para testar o endpoint.
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService, { provide: DataSource, useValue: { query } }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(() => app.close());

  // Verifica a resposta do endpoint quando o banco está ativo.
  it('deve responder 200 com banco ativo', async () => {
    query.mockResolvedValue([]);

    const res = await request(server).get('/api/health').expect(200);

    expect(res.body).toEqual({ status: 'ok', database: 'up' });
  });

  // Verifica que rotas inexistentes usam o mesmo formato de erro da API.
  it('deve responder 404 no formato único para rota inexistente', async () => {
    const res = await request(server).get('/api/nao-existe').expect(404);

    expect(res.body).toEqual({
      statusCode: 404,
      message: 'Cannot GET /api/nao-existe',
      error: 'Not Found',
    });
  });
});
