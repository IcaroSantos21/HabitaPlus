import { ForbiddenException } from '@nestjs/common';

import {
  PerfilUsuario,
  StatusChamado,
  StatusCobranca,
} from '../../database/entities/enums';
import { AuthUserDto } from '../auth/dto/auth-response.dto';
import { CobrancasCheckoutService } from '../charges/cobrancas-checkout.service';
import { CobrancasService } from '../charges/cobrancas.service';
import { ChamadosService } from '../chamados/chamados.service';
import {
  MlClientService,
  NluParseResponse,
} from '../ml-client/ml-client.service';
import { PredictionsService } from '../predictions/predictions.service';
import { ResidentsService } from '../residents/residents.service';
import { UnitsService } from '../units/units.service';
import { ChatbotService } from './chatbot.service';

describe('ChatbotService', () => {
  const usuarioMorador: AuthUserDto = {
    id: 7,
    nome: 'Maria',
    email: 'maria@email.com',
    perfil: PerfilUsuario.MORADOR,
  };

  const mlClientService = {
    parse: jest.fn<() => Promise<NluParseResponse>>(),
  } as jest.Mocked<Pick<MlClientService, 'parse'>>;

  const unitsService = {
    listAvailableUnits: jest.fn<
      () => Promise<
        Array<{
          id: number;
          bloco: string;
          numero: string;
          quartos: number;
          valorAluguelSugerido: number;
          areaM2?: number;
          disponivelLocacao?: boolean;
        }>
      >
    >(),
  } as jest.Mocked<Pick<UnitsService, 'listAvailableUnits'>>;

  const chamadosService = {
    buscaTodos: jest.fn<
      () => Promise<{
        data: Array<{ id: number; status: StatusChamado }>;
        meta: {
          total: number;
          pagina: number;
          limite: number;
          totalPaginas?: number;
        };
      }>
    >(),
    create: jest.fn(),
  } as jest.Mocked<Pick<ChamadosService, 'buscaTodos' | 'create'>>;

  const cobrancasService = {
    buscarMinhas: jest.fn<
      () => Promise<{
        data: Array<{ id: number; valor: number; status: StatusCobranca }>;
        meta: {
          total: number;
          pagina: number;
          limite: number;
          totalPaginas?: number;
        };
      }>
    >(),
  } as jest.Mocked<Pick<CobrancasService, 'buscarMinhas'>>;

  const cobrancasCheckoutService = {
    criarCheckout: jest.fn<() => Promise<{ url: string }>>(),
  } as jest.Mocked<Pick<CobrancasCheckoutService, 'criarCheckout'>>;

  const predictionsService = {
    getExpensesForecast: jest.fn<() => Promise<unknown>>(),
  } as jest.Mocked<Pick<PredictionsService, 'getExpensesForecast'>>;

  const residentsService = {
    obterRecomendacoes: jest.fn<() => Promise<unknown>>(),
  } as jest.Mocked<Pick<ResidentsService, 'obterRecomendacoes'>>;

  const createService = (): ChatbotService =>
    new ChatbotService(
      mlClientService as unknown as MlClientService,
      unitsService as unknown as UnitsService,
      chamadosService as unknown as ChamadosService,
      cobrancasService as unknown as CobrancasService,
      cobrancasCheckoutService as unknown as CobrancasCheckoutService,
      predictionsService as unknown as PredictionsService,
      residentsService as unknown as ResidentsService,
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve consultar apartamentos disponíveis com filtros extraídos', async () => {
    // Contrato real do ml-service: a chave é `valorMax` (camelCase).
    mlClientService.parse.mockResolvedValue({
      intencao: 'consultar_apartamentos',
      confianca: 0.95,
      entities: { quartos: 2, valorMax: 2500, bloco: 'A' },
    });
    unitsService.listAvailableUnits.mockResolvedValue([
      {
        id: 1,
        bloco: 'A',
        numero: '101',
        quartos: 2,
        areaM2: 45,
        valorAluguelSugerido: 2200,
        disponivelLocacao: true,
      },
    ]);

    const service = createService();

    const response = await service.handleMessage(
      'Quero um apartamento de 2 quartos até 2500',
      usuarioMorador,
    );

    expect(response).toMatchObject({
      intent: 'consultar_apartamentos',
    });
    expect(response.reply).toContain('apartamentos');

    expect(unitsService.listAvailableUnits).toHaveBeenCalledWith({
      bloco: 'A',
      quartos: 2,
      valorMax: 2500,
    });
  });

  it('deve responder à saudação sem cair em fora de escopo', async () => {
    mlClientService.parse.mockResolvedValue({
      intencao: 'saudacao',
      confianca: 0.99,
      entities: {},
    });

    const response = await createService().handleMessage(
      'oi, tudo bem?',
      usuarioMorador,
    );

    expect(response.intent).toBe('saudacao');
    expect(response.reply).toContain('Habita+');
  });

  it('deve pedir o local quando o chamado ainda não tem local informado', async () => {
    mlClientService.parse.mockResolvedValue({
      intencao: 'abrir_chamado',
      confianca: 0.93,
      entities: { equipamento: 'ar-condicionado' },
    });

    const service = createService();

    const response = await service.handleMessage(
      'Estou com problema no ar-condicionado',
      usuarioMorador,
    );

    expect(response).toMatchObject({
      intent: 'abrir_chamado',
    });
    expect(response.reply).toContain('Em qual local');

    expect(chamadosService.create).not.toHaveBeenCalled();
  });

  it('deve continuar a abertura do chamado quando as respostas curtas forem classificadas fora de escopo', async () => {
    const service = createService();
    mlClientService.parse
      .mockResolvedValueOnce({
        intencao: 'abrir_chamado',
        confianca: 0.93,
        entities: {},
      })
      .mockResolvedValueOnce({
        intencao: 'fora_de_escopo',
        confianca: 0.2,
        entities: {},
      })
      .mockResolvedValueOnce({
        intencao: 'fora_de_escopo',
        confianca: 0.2,
        entities: {},
      });
    chamadosService.create.mockResolvedValue({ id: 88 } as never);

    const inicio = await service.handleMessage('Abrir chamado', usuarioMorador);
    expect(inicio.reply).toContain('Em qual local');

    const local = await service.handleMessage('garagem', usuarioMorador);
    expect(local.reply).toContain('Qual equipamento');

    const equipamento = await service.handleMessage('elevador', usuarioMorador);
    expect(equipamento).toMatchObject({
      intent: 'abrir_chamado',
      data: { chamadoId: 88, status: StatusChamado.ABERTO },
    });
    expect(chamadosService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        areaComum: 'garagem',
        equipamento: 'elevador',
        categoria: 'manutencao',
      }),
      usuarioMorador,
    );
  });

  it('deve listar chamados abertos do morador', async () => {
    mlClientService.parse.mockResolvedValue({
      intencao: 'status_chamado',
      confianca: 0.9,
      entities: {},
    });
    chamadosService.buscaTodos.mockResolvedValue({
      data: [{ id: 12, status: StatusChamado.ABERTO }],
      meta: { pagina: 1, limite: 10, total: 1, totalPaginas: 1 },
    });

    const service = createService();

    const response = await service.handleMessage(
      'Qual o status do meu chamado?',
      usuarioMorador,
    );

    expect(response).toMatchObject({
      intent: 'status_chamado',
    });
    expect(response.reply).toContain('chamado');
  });

  it('deve devolver cobranças pendentes e link de pagamento para boleto', async () => {
    mlClientService.parse.mockResolvedValue({
      intencao: 'segunda_via_boleto',
      confianca: 0.92,
      entities: {},
    });
    cobrancasService.buscarMinhas.mockResolvedValue({
      data: [{ id: 44, valor: 650, status: StatusCobranca.PENDENTE }],
      meta: { pagina: 1, limite: 10, total: 1, totalPaginas: 1 },
    });
    cobrancasCheckoutService.criarCheckout.mockResolvedValue({
      url: 'https://checkout.example/pay/44',
    });

    const service = createService();

    const response = await service.handleMessage(
      'Quero a segunda via do boleto',
      usuarioMorador,
    );

    expect(response).toMatchObject({
      intent: 'segunda_via_boleto',
    });
    expect(response.reply).toContain('boleto');
  });

  it('deve responder status financeiro pendente para o morador', async () => {
    mlClientService.parse.mockResolvedValue({
      intencao: 'status_financeiro',
      confianca: 0.91,
      entities: {},
    });
    cobrancasService.buscarMinhas.mockResolvedValue({
      data: [{ id: 77, valor: 500, status: StatusCobranca.PENDENTE }],
      meta: { pagina: 1, limite: 10, total: 1, totalPaginas: 1 },
    });

    const service = createService();

    const response = await service.handleMessage(
      'Como está minha situação financeira?',
      usuarioMorador,
    );

    expect(response).toMatchObject({
      intent: 'status_financeiro',
    });
    expect(response.reply).toContain('pendentes');
  });

  it('deve bloquear previsao_despesas para morador', async () => {
    mlClientService.parse.mockResolvedValue({
      intencao: 'previsao_despesas',
      confianca: 0.97,
      entities: {},
    });

    const service = createService();

    await expect(
      service.handleMessage('Qual a previsão de despesas?', usuarioMorador),
    ).rejects.toThrow(ForbiddenException);
  });

  it('deve recomendar produtos usando o serviço de recomendação', async () => {
    mlClientService.parse.mockResolvedValue({
      intencao: 'recomendar_produtos',
      confianca: 0.96,
      entities: {},
    });
    residentsService.obterRecomendacoes.mockResolvedValue({
      cluster: 1,
      recommendations: [
        {
          listingId: 10,
          score: 0.85,
          anuncio: {
            titulo: 'Apartamento em destaque',
            descricao: 'Excelente localização',
            categoria: 'IMOVEIS',
            preco: 2500,
            imagemUrl: null,
            vendedor: { nome: 'João' },
          },
        },
      ],
    });

    const service = createService();

    const response = await service.handleMessage(
      'Me recomenda produtos',
      usuarioMorador,
    );

    expect(response).toMatchObject({
      intent: 'recomendar_produtos',
    });
    expect(response.reply).toContain('recomendação');
  });

  it('deve responder as regras do condomínio', async () => {
    mlClientService.parse.mockResolvedValue({
      intencao: 'regras_condominio',
      confianca: 0.93,
      entities: {},
    });

    const service = createService();

    const response = await service.handleMessage(
      'Quais são as regras do condomínio?',
      usuarioMorador,
    );

    expect(response).toMatchObject({
      intent: 'regras_condominio',
    });
    expect(response.reply).toContain('regras');
  });

  it('deve responder não entendi quando a intenção é fora de escopo', async () => {
    mlClientService.parse.mockResolvedValue({
      intencao: 'fora_de_escopo',
      confianca: 0.2,
      entities: {},
    });

    const service = createService();

    const response = await service.handleMessage(
      'Quero jogar xadrez',
      usuarioMorador,
    );

    expect(response).toMatchObject({
      intent: 'fora_de_escopo',
    });
    expect(response.reply).toContain('Não entendi');
  });
});
