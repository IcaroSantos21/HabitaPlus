import { Server } from 'http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import Stripe from 'stripe';
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
import { CobrancasCheckoutService } from '../src/modules/charges/cobrancas-checkout.service';
import { CobrancasController } from '../src/modules/charges/cobrancas.controller';
import { CobrancasRepository } from '../src/modules/charges/cobrancas.repository';
import { CobrancasService } from '../src/modules/charges/cobrancas.service';
import { StripeWebhookController } from '../src/modules/charges/stripe-webhook.controller';
import { PAGAMENTO_GATEWAY } from '../src/modules/payments/interfaces/gateway-pagamento.interface';
import { PagamentoStripeGateway } from '../src/modules/payments/pagamento-stripe.gateway';
import { STRIPE_CLIENT } from '../src/modules/payments/stripe.constants';

describe('Pagamento de cobranças com Stripe (e2e)', () => {
  interface ErrorBody {
    statusCode: number;
    message: string;
    error: string;
  }

  const jwtSecret = 'test-only-secret-key';
  const webhookSecret = 'whsec_segredo_e2e';
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
  // Quem mora em qual unidade: Maria só na 5.
  const moradoresPorUnidade = new Map<number, number[]>([[5, [1]]]);

  // Repositório em memória: reproduz o "só atua se estiver em aberto" do markAsPaid.
  const cobrancas = new Map<number, Cobranca>();
  const receitas: number[] = [];
  const repository = {
    findOneWithUnit: jest.fn((id: number) =>
      Promise.resolve(cobrancas.get(id) ?? null),
    ),
    belongsToUser: jest.fn((id: number, usuarioId: number) => {
      const unidadeId = cobrancas.get(id)?.unidade.id ?? 0;
      return Promise.resolve(
        moradoresPorUnidade.get(unidadeId)?.includes(usuarioId) ?? false,
      );
    }),
    saveStripeSession: jest.fn((id: number, sessionId: string) => {
      const cobranca = cobrancas.get(id);
      if (cobranca) cobranca.stripeSessionId = sessionId;
      return Promise.resolve();
    }),
    markAsPaid: jest.fn(({ cobrancaId }: { cobrancaId: number }) => {
      const cobranca = cobrancas.get(cobrancaId);
      if (!cobranca || cobranca.status === StatusCobranca.PAGA) {
        return Promise.resolve(false);
      }
      cobranca.status = StatusCobranca.PAGA;
      receitas.push(cobrancaId);
      return Promise.resolve(true);
    }),
  };

  // Cliente real para assinar/validar webhooks; só a criação da sessão é simulada.
  const stripe = new Stripe('sk_test_nao_usado');
  const criarSessao = jest.spyOn(stripe.checkout.sessions, 'create');

  const configValues: Record<string, unknown> = {
    stripe: {
      webhookSecret,
      successUrl: 'http://localhost:5173/pagamento/sucesso',
      cancelUrl: 'http://localhost:5173/pagamento/cancelado',
    },
  };

  let app: INestApplication;
  let server: Server;
  let moradorToken: string;
  let outroMoradorToken: string;
  let sindicoToken: string;

  function novaCobranca(overrides: Partial<Cobranca> = {}): Cobranca {
    return {
      id: 10,
      unidade: { id: 5, bloco: 'B', numero: '302' } as Unidade,
      competencia: '2026-11-01' as unknown as Date,
      valor: 650,
      vencimento: '2026-11-10' as unknown as Date,
      status: StatusCobranca.PENDENTE,
      stripeSessionId: null,
      ...overrides,
    };
  }

  function eventoPago(sessao: Record<string, unknown> = {}): string {
    return JSON.stringify({
      id: 'evt_1',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_1',
          object: 'checkout.session',
          payment_status: 'paid',
          amount_total: 65000,
          metadata: { cobrancaId: '10', pagadorId: '1' },
          ...sessao,
        },
      },
    });
  }

  function assinar(payload: string, secret = webhookSecret): string {
    return stripe.webhooks.generateTestHeaderString({ payload, secret });
  }

  function enviarWebhook(payload: string, assinatura?: string) {
    const req = request(server)
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json');
    if (assinatura) req.set('Stripe-Signature', assinatura);
    return req.send(payload);
  }

  beforeAll(async () => {
    usuarios.set(3, {
      id: 3,
      nome: 'João',
      email: 'joao@example.com',
      senhaHash: 'x',
      perfil: PerfilUsuario.MORADOR,
    });

    const moduleRef = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: jwtSecret,
          signOptions: { expiresIn: 3600 },
        }),
      ],
      controllers: [CobrancasController, StripeWebhookController],
      providers: [
        CobrancasService,
        CobrancasCheckoutService,
        AuthService,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        { provide: STRIPE_CLIENT, useValue: stripe },
        { provide: PAGAMENTO_GATEWAY, useClass: PagamentoStripeGateway },
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
        { provide: CobrancasRepository, useValue: repository },
      ],
    }).compile();

    // rawBody: true é o mesmo ajuste feito em main.ts.
    app = moduleRef.createNestApplication({ rawBody: true });
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
    outroMoradorToken = jwt.sign({ sub: 3, email: 'joao@example.com' });
  });

  beforeEach(() => {
    cobrancas.clear();
    receitas.length = 0;
    cobrancas.set(10, novaCobranca());
    jest.clearAllMocks();
    criarSessao.mockResolvedValue({
      id: 'cs_test_1',
      url: 'https://checkout.stripe.com/c/pay/cs_test_1',
    } as Awaited<ReturnType<typeof stripe.checkout.sessions.create>>);
  });

  afterAll(() => app.close());

  describe('POST /api/charges/:id/checkout', () => {
    it('exige login (401)', async () => {
      await request(server).post('/api/charges/10/checkout').expect(401);
    });

    it('morador cria o checkout e recebe só a url; a sessão fica guardada', async () => {
      const resposta = await request(server)
        .post('/api/charges/10/checkout')
        .set('Authorization', `Bearer ${moradorToken}`)
        .expect(201);

      expect(resposta.body).toEqual({
        url: 'https://checkout.stripe.com/c/pay/cs_test_1',
      });
      expect(cobrancas.get(10)?.stripeSessionId).toBe('cs_test_1');
      expect(criarSessao).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { cobrancaId: '10', pagadorId: '1' },
          success_url: 'http://localhost:5173/pagamento/sucesso?cobranca=10',
        }),
      );
    });

    it('síndico também pode iniciar o pagamento', async () => {
      await request(server)
        .post('/api/charges/10/checkout')
        .set('Authorization', `Bearer ${sindicoToken}`)
        .expect(201);
    });

    it('morador de outra unidade não paga a cobrança alheia (403)', async () => {
      const resposta = await request(server)
        .post('/api/charges/10/checkout')
        .set('Authorization', `Bearer ${outroMoradorToken}`)
        .expect(403);

      expect((resposta.body as ErrorBody).message).toBe(
        'Você não tem permissão para pagar esta cobrança.',
      );
      expect(criarSessao).not.toHaveBeenCalled();
    });

    it('cobrança inexistente (404)', async () => {
      const resposta = await request(server)
        .post('/api/charges/99/checkout')
        .set('Authorization', `Bearer ${moradorToken}`)
        .expect(404);

      expect((resposta.body as ErrorBody).message).toBe(
        'Cobrança não encontrada.',
      );
    });

    it('id que não é número (400, em português)', async () => {
      const resposta = await request(server)
        .post('/api/charges/abc/checkout')
        .set('Authorization', `Bearer ${moradorToken}`)
        .expect(400);

      expect((resposta.body as ErrorBody).message).toBe(
        'O id da cobrança deve ser um número inteiro.',
      );
    });

    it('cobrança já paga (409)', async () => {
      cobrancas.set(10, novaCobranca({ status: StatusCobranca.PAGA }));

      const resposta = await request(server)
        .post('/api/charges/10/checkout')
        .set('Authorization', `Bearer ${moradorToken}`)
        .expect(409);

      expect((resposta.body as ErrorBody).message).toBe(
        'Esta cobrança já foi paga.',
      );
    });

    it('Stripe fora do ar vira 503 e não grava sessão', async () => {
      criarSessao.mockRejectedValue(new Error('timeout'));

      await request(server)
        .post('/api/charges/10/checkout')
        .set('Authorization', `Bearer ${moradorToken}`)
        .expect(503);
      expect(cobrancas.get(10)?.stripeSessionId).toBeNull();
    });
  });

  describe('POST /api/webhooks/stripe', () => {
    it('assinatura válida muda a cobrança para PAGA e lança uma receita', async () => {
      const corpo = eventoPago();

      await enviarWebhook(corpo, assinar(corpo)).expect(200);

      expect(cobrancas.get(10)?.status).toBe(StatusCobranca.PAGA);
      expect(receitas).toEqual([10]);
      expect(repository.markAsPaid).toHaveBeenCalledWith(
        expect.objectContaining({ cobrancaId: 10, usuarioId: 1 }),
      );
    });

    it('é pública: não exige JWT, só a assinatura', async () => {
      const corpo = eventoPago();

      await enviarWebhook(corpo, assinar(corpo)).expect(200);
    });

    it('assinatura inválida retorna 400 e não paga nada', async () => {
      const corpo = eventoPago();

      const resposta = await enviarWebhook(
        corpo,
        assinar(corpo, 'whsec_de_outra_conta'),
      ).expect(400);

      expect((resposta.body as ErrorBody).message).toBe(
        'Assinatura do webhook inválida.',
      );
      expect(cobrancas.get(10)?.status).toBe(StatusCobranca.PENDENTE);
      expect(repository.markAsPaid).not.toHaveBeenCalled();
    });

    it('sem o cabeçalho Stripe-Signature retorna 400', async () => {
      await enviarWebhook(eventoPago()).expect(400);
      expect(repository.markAsPaid).not.toHaveBeenCalled();
    });

    it('corpo alterado depois de assinado retorna 400 (valida o corpo raw)', async () => {
      const corpo = eventoPago();
      const assinatura = assinar(corpo);

      await enviarWebhook(corpo.replace('65000', '100'), assinatura).expect(
        400,
      );
      expect(cobrancas.get(10)?.status).toBe(StatusCobranca.PENDENTE);
    });

    it('evento repetido (reenvio do Stripe) não duplica a receita', async () => {
      const corpo = eventoPago();

      await enviarWebhook(corpo, assinar(corpo)).expect(200);
      await enviarWebhook(corpo, assinar(corpo)).expect(200);

      expect(cobrancas.get(10)?.status).toBe(StatusCobranca.PAGA);
      expect(receitas).toEqual([10]);
    });

    it('evento de outro tipo responde 200 e não altera a cobrança', async () => {
      const corpo = JSON.stringify({
        id: 'evt_2',
        object: 'event',
        type: 'charge.refunded',
        data: { object: { id: 'ch_1', object: 'charge' } },
      });

      await enviarWebhook(corpo, assinar(corpo)).expect(200);
      expect(cobrancas.get(10)?.status).toBe(StatusCobranca.PENDENTE);
    });

    it('pagamento ainda não confirmado (unpaid) não paga a cobrança', async () => {
      const corpo = eventoPago({ payment_status: 'unpaid' });

      await enviarWebhook(corpo, assinar(corpo)).expect(200);
      expect(cobrancas.get(10)?.status).toBe(StatusCobranca.PENDENTE);
    });
  });

  it('fluxo completo: checkout e depois o webhook com a mesma cobrança', async () => {
    await request(server)
      .post('/api/charges/10/checkout')
      .set('Authorization', `Bearer ${moradorToken}`)
      .expect(201);

    const corpo = eventoPago();
    await enviarWebhook(corpo, assinar(corpo)).expect(200);

    expect(cobrancas.get(10)).toMatchObject({
      status: StatusCobranca.PAGA,
      stripeSessionId: 'cs_test_1',
    });
    await request(server)
      .post('/api/charges/10/checkout')
      .set('Authorization', `Bearer ${moradorToken}`)
      .expect(409);
  });
});
