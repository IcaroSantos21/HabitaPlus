import { Server } from 'http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { createPortugueseValidationException } from '../src/common/validation/validation-exception.factory';
import { Usuario } from '../src/database/entities/usuario.entity';
import { PerfilUsuario } from '../src/database/entities/enums';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { AuthUserDto } from '../src/modules/auth/dto/auth-response.dto';
import { JwtStrategy } from '../src/modules/auth/jwt.strategy';
import {
  AdminAccessTestController,
  SindicoAccessTestController,
} from '../src/modules/access-test/access-test.controller';
import request from 'supertest';

describe('Auth endpoints (e2e)', () => {
  interface ErrorResponseBody {
    statusCode: number;
    message: string;
    error: string;
  }

  interface AccessResponseBody {
    message: string;
    user: AuthUserDto;
  }

  const jwtSecret = 'test-only-secret-key';
  let app: INestApplication;
  let server: Server;
  let storedUser: Usuario | undefined;

  const queryBuilder = {
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(() => Promise.resolve(storedUser)),
  };
  const usuariosRepository = {
    create: jest.fn((values: Partial<Usuario>) => values as Usuario),
    save: jest.fn((usuario: Usuario) => {
      storedUser = { ...usuario, id: 1 };
      return Promise.resolve(storedUser);
    }),
    createQueryBuilder: jest.fn(() => queryBuilder),
    findOneBy: jest.fn(() => Promise.resolve(storedUser)),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: jwtSecret,
          signOptions: { expiresIn: 3600 },
        }),
      ],
      controllers: [
        AuthController,
        SindicoAccessTestController,
        AdminAccessTestController,
      ],
      providers: [
        AuthService,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        {
          provide: ConfigService,
          useValue: { get: () => jwtSecret },
        },
        {
          provide: getRepositoryToken(Usuario),
          useValue: usuariosRepository,
        },
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
  });

  beforeEach(() => {
    storedUser = undefined;
    jest.clearAllMocks();
  });

  afterAll(() => app.close());

  async function createResidentAndGetToken(): Promise<string> {
    await request(server)
      .post('/api/auth/register')
      .send({
        nome: 'Maria Silva',
        email: 'maria@example.com',
        senha: 'senha-segura-123',
      })
      .expect(201);

    const response = await request(server)
      .post('/api/auth/login')
      .send({ email: 'maria@example.com', senha: 'senha-segura-123' })
      .expect(200);

    const body = response.body as { accessToken: string };
    return body.accessToken;
  }

  it('registra, autentica e retorna o usuário em /auth/me sem senha', async () => {
    const registration = await request(server)
      .post('/api/auth/register')
      .send({
        nome: 'Maria Silva',
        email: 'maria@example.com',
        senha: 'senha-segura-123',
      })
      .expect(201);

    expect(registration.body).toEqual({
      id: 1,
      nome: 'Maria Silva',
      email: 'maria@example.com',
      perfil: PerfilUsuario.MORADOR,
    });
    expect(registration.body).not.toHaveProperty('senha');
    expect(registration.body).not.toHaveProperty('senhaHash');
    expect(storedUser?.senhaHash).toMatch(/^\$2[aby]\$/);

    const login = await request(server)
      .post('/api/auth/login')
      .send({ email: 'maria@example.com', senha: 'senha-segura-123' })
      .expect(200);
    const loginBody = login.body as {
      accessToken: string;
      user: AuthUserDto;
    };
    expect(loginBody).toHaveProperty('accessToken');
    expect(loginBody.user.perfil).toBe(PerfilUsuario.MORADOR);
    expect(loginBody.user).not.toHaveProperty('senha');
    expect(loginBody.user).not.toHaveProperty('senhaHash');

    const me = await request(server)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(200);
    expect(me.body).toEqual(loginBody.user);
    expect(me.body).not.toHaveProperty('senhaHash');
  });

  it('rejeita login com senha inválida (401)', async () => {
    await request(server)
      .post('/api/auth/register')
      .send({
        nome: 'Maria Silva',
        email: 'maria@example.com',
        senha: 'senha-segura-123',
      })
      .expect(201);

    const response = await request(server)
      .post('/api/auth/login')
      .send({ email: 'maria@example.com', senha: 'senha-incorreta' })
      .expect(401);
    const body = response.body as ErrorResponseBody;
    expect(body.message).toBe('E-mail ou senha inválidos.');
    expect(body.error).toBe('Não autorizado');
  });

  it('não permite escolher um perfil privilegiado no registro público', async () => {
    const response = await request(server)
      .post('/api/auth/register')
      .send({
        nome: 'Maria Silva',
        email: 'maria@example.com',
        senha: 'senha-segura-123',
        perfil: PerfilUsuario.ADMIN,
      })
      .expect(400);
    const body = response.body as ErrorResponseBody;
    expect(body.message).toContain('O campo "perfil" não é permitido.');
    expect(body.error).toBe('Requisição inválida');

    expect(storedUser).toBeUndefined();
  });

  it('retorna 403 para morador em uma rota exclusiva de síndico/admin', async () => {
    const token = await createResidentAndGetToken();

    const unauthenticated = await request(server)
      .get('/api/sindico')
      .expect(401);
    const unauthenticatedBody = unauthenticated.body as ErrorResponseBody;
    expect(unauthenticatedBody.message).toBe(
      'Autenticação necessária ou token inválido.',
    );
    expect(unauthenticatedBody.error).toBe('Não autorizado');

    const forbidden = await request(server)
      .get('/api/sindico')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
    const forbiddenBody = forbidden.body as ErrorResponseBody;
    expect(forbiddenBody.message).toBe(
      'Você não tem permissão para acessar este recurso.',
    );
    expect(forbiddenBody.error).toBe('Acesso negado');

    await request(server)
      .get('/api/admin')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('permite que síndico acesse sua rota, mas não a rota exclusiva de admin', async () => {
    const token = await createResidentAndGetToken();
    storedUser!.perfil = PerfilUsuario.SINDICO;

    const sindicoAccess = await request(server)
      .get('/api/sindico')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const sindicoBody = sindicoAccess.body as AccessResponseBody;
    expect(sindicoBody.message).toBe('Acesso autorizado à área do síndico.');
    expect(sindicoBody.user.perfil).toBe(PerfilUsuario.SINDICO);

    await request(server)
      .get('/api/admin')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('permite acesso às duas rotas para ADMIN', async () => {
    const token = await createResidentAndGetToken();
    storedUser!.perfil = PerfilUsuario.ADMIN;

    await request(server)
      .get('/api/sindico')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const adminAccess = await request(server)
      .get('/api/admin')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const adminBody = adminAccess.body as AccessResponseBody;
    expect(adminBody.message).toBe('Acesso autorizado à área administrativa.');
    expect(adminBody.user.perfil).toBe(PerfilUsuario.ADMIN);
  });

  it('retorna erros de validação em português do Brasil', async () => {
    const response = await request(server)
      .post('/api/auth/register')
      .send({ nome: 'M', email: 'email-invalido', senha: '123' })
      .expect(400);

    const body = response.body as ErrorResponseBody;
    expect(body.message).toContain('O nome deve ter pelo menos 2 caracteres.');
    expect(body.message).toContain('Informe um endereço de e-mail válido.');
    expect(body.message).toContain('A senha deve ter pelo menos 8 caracteres.');
    expect(body.error).toBe('Requisição inválida');
  });
});
