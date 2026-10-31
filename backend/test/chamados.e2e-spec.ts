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
import { Chamado } from '../src/database/entities/chamado.entity';
import { PerfilUsuario, StatusChamado } from '../src/database/entities/enums';
import { Unidade } from '../src/database/entities/unidade.entity';
import { Usuario } from '../src/database/entities/usuario.entity';
import { Vinculo } from '../src/database/entities/vinculo.entity';
import { AuthService } from '../src/modules/auth/auth.service';
import { JwtStrategy } from '../src/modules/auth/jwt.strategy';
import { ChamadosController } from '../src/modules/chamados/chamados.controller';
import { ChamadosRepository } from '../src/modules/chamados/chamados.repository';
import { ChamadosService } from '../src/modules/chamados/chamados.service';

describe('Tickets endpoints (e2e)', () => {
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

  const chamado: Chamado = {
    id: 10,
    usuario: usuarios.get(1) as Usuario,
    unidade: { id: 5, bloco: 'B', numero: '302' } as Unidade,
    areaComum: null,
    categoria: 'eletrica',
    equipamento: 'elevador',
    descricao: 'Parando entre os andares',
    status: StatusChamado.ABERTO,
    abertoEm: new Date('2026-10-01T10:00:00Z'),
    encerradoEm: null,
  };

  const ticketsRepository = {
    createAndLoad: jest.fn(),
    findPaginated: jest.fn(),
    findOneWithRelations: jest.fn(),
    updateStatusIfCurrent: jest.fn(),
    countByEquipmentAndMonth: jest.fn(),
  };
  const vinculosRepository = { exists: jest.fn() };
  const unidadesRepository = { exists: jest.fn() };

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
      controllers: [ChamadosController],
      providers: [
        ChamadosService,
        AuthService,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        { provide: ConfigService, useValue: { get: () => jwtSecret } },
        {
          provide: getRepositoryToken(Usuario),
          useValue: {
            findOneBy: ({ id }: { id: number }) =>
              Promise.resolve(usuarios.get(id) ?? null),
          },
        },
        { provide: getRepositoryToken(Vinculo), useValue: vinculosRepository },
        { provide: getRepositoryToken(Unidade), useValue: unidadesRepository },
        { provide: ChamadosRepository, useValue: ticketsRepository },
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
    ticketsRepository.findPaginated.mockResolvedValue({ items: [], total: 0 });
  });

  afterAll(() => app.close());

  it('exige login em todas as rotas (401)', async () => {
    await request(server).get('/api/tickets').expect(401);
    await request(server).post('/api/tickets').send({}).expect(401);
    await request(server)
      .patch('/api/tickets/10/status')
      .send({ status: 'EM_ANDAMENTO' })
      .expect(401);
  });

  it('morador abre chamado e o dono vem do token, não do body', async () => {
    vinculosRepository.exists.mockResolvedValue(true);
    ticketsRepository.createAndLoad.mockResolvedValue(chamado);

    const response = await request(server)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${moradorToken}`)
      .send({
        unidadeId: 5,
        categoria: 'Elétrica',
        equipamento: 'Elevador',
        descricao: 'Parando entre os andares',
      })
      .expect(201);

    expect(ticketsRepository.createAndLoad).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: 1, status: StatusChamado.ABERTO }),
    );
    expect(response.body).toMatchObject({ id: 10, status: 'ABERTO' });
    expect(response.body).not.toHaveProperty('usuario.senhaHash');

    await request(server)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${moradorToken}`)
      .send({
        usuarioId: 2,
        unidadeId: 5,
        categoria: 'a',
        equipamento: 'b',
        descricao: 'c',
      })
      .expect(400);
  });

  it('bloqueia morador em unidade sem vínculo (403)', async () => {
    vinculosRepository.exists.mockResolvedValue(false);

    const response = await request(server)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${moradorToken}`)
      .send({
        unidadeId: 9,
        categoria: 'eletrica',
        equipamento: 'elevador',
        descricao: 'Teste',
      })
      .expect(403);

    expect((response.body as ErrorBody).message).toBe(
      'Você não possui vínculo com esta unidade.',
    );
  });

  it('morador lista só os seus chamados; síndico lista todos', async () => {
    await request(server)
      .get('/api/tickets?status=ABERTO&equipamento=')
      .set('Authorization', `Bearer ${moradorToken}`)
      .expect(200);
    expect(ticketsRepository.findPaginated).toHaveBeenLastCalledWith(
      expect.objectContaining({ usuarioId: 1, status: 'ABERTO' }),
    );

    await request(server)
      .get('/api/tickets')
      .set('Authorization', `Bearer ${sindicoToken}`)
      .expect(200);
    expect(ticketsRepository.findPaginated).toHaveBeenLastCalledWith(
      expect.objectContaining({ usuarioId: undefined }),
    );
  });

  it('rejeita status inválido na listagem com mensagem em português (400)', async () => {
    const response = await request(server)
      .get('/api/tickets?status=FECHADO')
      .set('Authorization', `Bearer ${sindicoToken}`)
      .expect(400);

    expect((response.body as ErrorBody).message).toContain('O status deve ser');
  });

  it('só síndico/admin alteram status (403 para morador)', async () => {
    await request(server)
      .patch('/api/tickets/10/status')
      .set('Authorization', `Bearer ${moradorToken}`)
      .send({ status: 'EM_ANDAMENTO' })
      .expect(403);
    expect(ticketsRepository.updateStatusIfCurrent).not.toHaveBeenCalled();
  });

  it('avança o status e devolve 400 claro em transição inválida', async () => {
    ticketsRepository.findOneWithRelations.mockResolvedValue({ ...chamado });
    ticketsRepository.updateStatusIfCurrent.mockResolvedValue(true);

    const ok = await request(server)
      .patch('/api/tickets/10/status')
      .set('Authorization', `Bearer ${sindicoToken}`)
      .send({ status: 'EM_ANDAMENTO' })
      .expect(200);
    expect(ok.body).toMatchObject({
      status: 'EM_ANDAMENTO',
      encerradoEm: null,
    });

    ticketsRepository.findOneWithRelations.mockResolvedValue({ ...chamado });
    const invalido = await request(server)
      .patch('/api/tickets/10/status')
      .set('Authorization', `Bearer ${sindicoToken}`)
      .send({ status: 'ENCERRADO' })
      .expect(400);
    expect((invalido.body as ErrorBody).message).toBe(
      'Transição inválida: o chamado está ABERTO e só pode seguir para EM_ANDAMENTO.',
    );
  });

  it('encerrar preenche encerradoEm', async () => {
    ticketsRepository.findOneWithRelations.mockResolvedValue({
      ...chamado,
      status: StatusChamado.EM_ANDAMENTO,
    });
    ticketsRepository.updateStatusIfCurrent.mockResolvedValue(true);

    const response = await request(server)
      .patch('/api/tickets/10/status')
      .set('Authorization', `Bearer ${sindicoToken}`)
      .send({ status: 'ENCERRADO' })
      .expect(200);

    expect((response.body as { encerradoEm: string }).encerradoEm).toEqual(
      expect.any(String),
    );
  });

  it('histórico e estatísticas são restritos a síndico/admin', async () => {
    await request(server)
      .get('/api/tickets/history?equipamento=elevador')
      .set('Authorization', `Bearer ${moradorToken}`)
      .expect(403);
    await request(server)
      .get('/api/tickets/stats')
      .set('Authorization', `Bearer ${moradorToken}`)
      .expect(403);

    await request(server)
      .get('/api/tickets/history')
      .set('Authorization', `Bearer ${sindicoToken}`)
      .expect(400);

    ticketsRepository.countByEquipmentAndMonth.mockResolvedValue([
      { mes: '2026-10', equipamento: 'elevador', total: 3 },
    ]);
    const stats = await request(server)
      .get('/api/tickets/stats')
      .set('Authorization', `Bearer ${sindicoToken}`)
      .expect(200);
    expect(stats.body).toEqual({
      porEquipamento: [{ equipamento: 'elevador', total: 3 }],
      porEquipamentoEMes: [
        { mes: '2026-10', equipamento: 'elevador', total: 3 },
      ],
    });
  });
});
