import { Server } from 'http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { createPortugueseValidationException } from '../src/common/validation/validation-exception.factory';
import { Cobranca } from '../src/database/entities/cobranca.entity';
import { PerfilUsuario, StatusCobranca } from '../src/database/entities/enums';
import { Unidade } from '../src/database/entities/unidade.entity';
import { Usuario } from '../src/database/entities/usuario.entity';
import { AuthService } from '../src/modules/auth/auth.service';
import { JwtStrategy } from '../src/modules/auth/jwt.strategy';
import { ChargesController } from '../src/modules/charges/cobrancas.controller';
import { ChargesRepository } from '../src/modules/charges/cobrancas.repository';
import { Cobrancas } from '../src/modules/charges/cobrancas.service';

describe('Charges endpoints (e2e)', () => {
  interface ErrorBody {
    statusCode: number;
    message: string;
    error: string;
  }

  const jwtSecret = 'test-only-secret-key';
  const usuarios = new Map<number, Usuario>([
    [
      1,
      {
        id: 1,
        nome: 'Maria',
        email: 'maria@example.com',
        senhaHash: 'x',
        perfil: PerfilUsuario.MORADOR,
      },
    ],
    [
      2,
      {
        id: 2,
        nome: 'Sérgio',
        email: 'sergio@example.com',
        senhaHash: 'x',
        perfil: PerfilUsuario.SINDICO,
      },
    ],
  ]);

  const cobranca: Cobranca = {
    id: 10,
    unidade: { id: 5, bloco: 'B', numero: '302' } as Unidade,
    competencia: '2026-11-01' as unknown as Date,
    valor: 650,
    vencimento: '2026-11-10' as unknown as Date,
    status: StatusCobranca.PENDENTE,
    stripeSessionId: 'cs_test_secreto',
  };

  const chargesRepository = {
    generateForOccupiedUnits: jest.fn(),
    findPaginated: jest.fn(),
  };
  const configValues: Record<string, unknown> = {
    charges: { valorPadrao: 650, diaVencimento: 10 },
  };

  let app: INestApplication;
  let server: Server;
  let moradorToken: string;
  let sindicoToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: jwtSecret,
          signOptions: { expiresIn: 3600 },
        }),
      ],
      controllers: [ChargesController],
      providers: [
        Cobrancas,
        AuthService,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => configValues[key] ?? jwtSecret },
        },
        {
          provide: getRepositoryToken(Usuario),
          useValue: {
            findOneBy: ({ id }: { id: number }) =>
              Promise.resolve(usuarios.get(id) ?? null),
          },
        },
        { provide: ChargesRepository, useValue: chargesRepository },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: createPortugueseValidationException,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalGuards(app.get(JwtAuthGuard), app.get(RolesGuard));
    await app.init();
    server = app.getHttpServer() as Server;

    const jwt = moduleRef.get(JwtService);
    moradorToken = jwt.sign({ sub: 1, email: 'maria@example.com' });
    sindicoToken = jwt.sign({ sub: 2, email: 'sergio@example.com' });
  });

  beforeEach(() => {
    jest.resetAllMocks();
    chargesRepository.findPaginated.mockResolvedValue({ items: [], total: 0 });
  });

  afterAll(() => app.close());

  it('exige login em todas as rotas (401)', async () => {
    await request(server)
      .post('/api/charges/generate?competencia=2026-11')
      .expect(401);
    await request(server).get('/api/charges').expect(401);
    await request(server).get('/api/charges/me').expect(401);
  });

  it('morador não gera cobranças (403)', async () => {
    const response = await request(server)
      .post('/api/charges/generate?competencia=2026-11')
      .set('Authorization', `Bearer ${moradorToken}`)
      .expect(403);

    expect((response.body as ErrorBody).message).toBe(
      'Você não tem permissão para acessar este recurso.',
    );
    expect(chargesRepository.generateForOccupiedUnits).not.toHaveBeenCalled();
  });

  it.each([
    ['ausente', ''],
    ['fora do formato', '?competencia=11-2026'],
    ['com mês inválido', '?competencia=2026-13'],
    ['com parâmetro desconhecido', '?competencia=2026-11&valor=1'],
  ])('rejeita competência %s (400)', async (_caso, query) => {
    const response = await request(server)
      .post(`/api/charges/generate${query}`)
      .set('Authorization', `Bearer ${sindicoToken}`)
      .expect(400);

    expect((response.body as ErrorBody).statusCode).toBe(400);
    expect(chargesRepository.generateForOccupiedUnits).not.toHaveBeenCalled();
  });

  it('síndico gera as cobranças e reexecutar não duplica (idempotência)', async () => {
    chargesRepository.generateForOccupiedUnits
      .mockResolvedValueOnce({ totalOcupadas: 3, criadas: 3 })
      .mockResolvedValueOnce({ totalOcupadas: 3, criadas: 0 });

    const primeira = await request(server)
      .post('/api/charges/generate?competencia=2026-11')
      .set('Authorization', `Bearer ${sindicoToken}`)
      .expect(201);
    const segunda = await request(server)
      .post('/api/charges/generate?competencia=2026-11')
      .set('Authorization', `Bearer ${sindicoToken}`)
      .expect(201);

    expect(chargesRepository.generateForOccupiedUnits).toHaveBeenCalledWith({
      competencia: '2026-11-01',
      valor: 650,
      vencimento: '2026-11-10',
    });
    expect(primeira.body).toEqual({
      competencia: '2026-11',
      vencimento: '2026-11-10',
      valor: 650,
      totalUnidadesOcupadas: 3,
      criadas: 3,
      jaExistentes: 0,
    });
    expect(segunda.body).toMatchObject({ criadas: 0, jaExistentes: 3 });
  });

  it('morador lista só as suas cobranças; síndico lista todas', async () => {
    chargesRepository.findPaginated.mockResolvedValue({
      items: [cobranca],
      total: 1,
    });

    const morador = await request(server)
      .get('/api/charges')
      .set('Authorization', `Bearer ${moradorToken}`)
      .expect(200);
    expect(chargesRepository.findPaginated).toHaveBeenLastCalledWith(
      expect.objectContaining({ moradorId: 1 }),
    );
    expect(morador.body).toMatchObject({
      data: [{ id: 10, competencia: '2026-11', valor: 650 }],
      meta: { pagina: 1, limite: 20, total: 1, totalPaginas: 1 },
    });
    expect(morador.body).not.toHaveProperty('data.0.stripeSessionId');

    await request(server)
      .get('/api/charges')
      .set('Authorization', `Bearer ${sindicoToken}`)
      .expect(200);
    expect(chargesRepository.findPaginated).toHaveBeenLastCalledWith(
      expect.objectContaining({ moradorId: undefined }),
    );
  });

  it('síndico filtra por competência, status e unidade', async () => {
    await request(server)
      .get(
        '/api/charges?competencia=2026-11&status=ATRASADA&unidadeId=5&pagina=2&limite=10',
      )
      .set('Authorization', `Bearer ${sindicoToken}`)
      .expect(200);

    expect(chargesRepository.findPaginated).toHaveBeenCalledWith({
      competencia: '2026-11',
      status: StatusCobranca.ATRASADA,
      unidadeId: 5,
      moradorId: undefined,
      pagina: 2,
      limite: 10,
    });
  });

  it.each([
    'status=PERDIDA',
    'competencia=2026-1',
    'unidadeId=abc',
    'limite=101',
  ])('rejeita filtro inválido (%s)', async (query) => {
    await request(server)
      .get(`/api/charges?${query}`)
      .set('Authorization', `Bearer ${sindicoToken}`)
      .expect(400);
  });

  it('/charges/me devolve só as unidades do usuário logado, até para síndico', async () => {
    await request(server)
      .get('/api/charges/me')
      .set('Authorization', `Bearer ${sindicoToken}`)
      .expect(200);

    expect(chargesRepository.findPaginated).toHaveBeenCalledWith(
      expect.objectContaining({ moradorId: 2 }),
    );
  });
});
