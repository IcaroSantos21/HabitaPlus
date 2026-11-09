import { ForbiddenException } from '@nestjs/common';
import { PerfilUsuario } from '../../database/entities/enums';
import { AuthUserDto } from '../auth/dto/auth-response.dto';
import { ChatbotService } from './chatbot.service';

describe('ChatbotService', () => {
  const usuarioMorador: AuthUserDto = {
    id: 7,
    nome: 'Maria',
    email: 'maria@email.com',
    perfil: PerfilUsuario.MORADOR,
  };

  const usuarioSindico: AuthUserDto = {
    id: 99,
    nome: 'João',
    email: 'joao@email.com',
    perfil: PerfilUsuario.SINDICO,
  };

  const mlClientService = {
    parse: jest.fn(),
  };

  const unitsService = {
    listAvailableUnits: jest.fn(),
  };

  const chamadosService = {
    buscaTodos: jest.fn(),
    create: jest.fn(),
  };

  const cobrancasService = {
    buscarMinhas: jest.fn(),
  };

  const cobrancasCheckoutService = {
    criarCheckout: jest.fn(),
  };

  const predictionsService = {
    getExpensesForecast: jest.fn(),
  };

  const residentsService = {
    obterRecomendacoes: jest.fn(),
  };

  const createService = () =>
    new ChatbotService(
      mlClientService as any,
      unitsService as any,
      chamadosService as any,
      cobrancasService as any,
      cobrancasCheckoutService as any,
      predictionsService as any,
      residentsService as any,
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve consultar apartamentos disponíveis com filtros extraídos', async () => {
    mlClientService.parse.mockResolvedValue({
      intencao: 'consultar_apartamentos',
      confianca: 0.95,
      entities: { quartos: 2, valor: 2500 },
    });
    unitsService.listAvailableUnits.mockResolvedValue([
      { id: 1, bloco: 'A', numero: '101', quartos: 2, valorAluguelSugerido: 2200 },
    ]);

    const service = createService();

    await expect(service.handleMessage('Quero um apartamento de 2 quartos até 2500', usuarioMorador)).resolves.toEqual(
      expect.objectContaining({
        intent: 'consultar_apartamentos',
        reply: expect.stringContaining('apartamentos'),
      }),
    );

    expect(unitsService.listAvailableUnits).toHaveBeenCalledWith({
      quartos: 2,
      valorMax: 2500,
    });
  });

  it('deve pedir o local quando o chamado ainda não tem local informado', async () => {
    mlClientService.parse.mockResolvedValue({
      intencao: 'abrir_chamado',
      confianca: 0.93,
      entities: { equipamento: 'ar-condicionado' },
    });

    const service = createService();

    await expect(service.handleMessage('Estou com problema no ar-condicionado', usuarioMorador)).resolves.toEqual(
      expect.objectContaining({
        intent: 'abrir_chamado',
        reply: expect.stringContaining('Em qual local'),
      }),
    );

    expect(chamadosService.create).not.toHaveBeenCalled();
  });

  it('deve listar chamados abertos do morador', async () => {
    mlClientService.parse.mockResolvedValue({
      intencao: 'status_chamado',
      confianca: 0.9,
      entities: {},
    });
    chamadosService.buscaTodos.mockResolvedValue({
      data: [{ id: 12, status: 'ABERTO' }],
      meta: { total: 1 },
    });

    const service = createService();

    await expect(service.handleMessage('Qual o status do meu chamado?', usuarioMorador)).resolves.toEqual(
      expect.objectContaining({
        intent: 'status_chamado',
        reply: expect.stringContaining('chamado'),
      }),
    );
  });

  it('deve devolver cobranças pendentes e link de pagamento para boleto', async () => {
    mlClientService.parse.mockResolvedValue({
      intencao: 'segunda_via_boleto',
      confianca: 0.92,
      entities: {},
    });
    cobrancasService.buscarMinhas.mockResolvedValue({
      data: [{ id: 44, valor: 650, status: 'PENDENTE' }],
      meta: { total: 1 },
    });
    cobrancasCheckoutService.criarCheckout.mockResolvedValue({ url: 'https://checkout.example/pay/44' });

    const service = createService();

    await expect(service.handleMessage('Quero a segunda via do boleto', usuarioMorador)).resolves.toEqual(
      expect.objectContaining({
        intent: 'segunda_via_boleto',
        reply: expect.stringContaining('boleto'),
      }),
    );
  });

  it('deve responder status financeiro pendente para o morador', async () => {
    mlClientService.parse.mockResolvedValue({
      intencao: 'status_financeiro',
      confianca: 0.91,
      entities: {},
    });
    cobrancasService.buscarMinhas.mockResolvedValue({
      data: [{ id: 77, valor: 500, status: 'PENDENTE' }],
      meta: { total: 1 },
    });

    const service = createService();

    await expect(service.handleMessage('Como está minha situação financeira?', usuarioMorador)).resolves.toEqual(
      expect.objectContaining({
        intent: 'status_financeiro',
        reply: expect.stringContaining('pendentes'),
      }),
    );
  });

  it('deve bloquear previsao_despesas para morador', async () => {
    mlClientService.parse.mockResolvedValue({
      intencao: 'previsao_despesas',
      confianca: 0.97,
      entities: {},
    });

    const service = createService();

    await expect(service.handleMessage('Qual a previsão de despesas?', usuarioMorador)).rejects.toThrow(ForbiddenException);
  });

  it('deve recomendar produtos usando o serviço de recomendação', async () => {
    mlClientService.parse.mockResolvedValue({
      intencao: 'recomendar_produtos',
      confianca: 0.96,
      entities: {},
    });
    residentsService.obterRecomendacoes.mockResolvedValue({
      cluster: 1,
      recommendations: [{ listingId: 10, score: 0.85 }],
    });

    const service = createService();

    await expect(service.handleMessage('Me recomenda produtos', usuarioMorador)).resolves.toEqual(
      expect.objectContaining({
        intent: 'recomendar_produtos',
        reply: expect.stringContaining('recomendação'),
      }),
    );
  });

  it('deve responder as regras do condomínio', async () => {
    mlClientService.parse.mockResolvedValue({
      intencao: 'regras_condominio',
      confianca: 0.93,
      entities: {},
    });

    const service = createService();

    await expect(service.handleMessage('Quais são as regras do condomínio?', usuarioMorador)).resolves.toEqual(
      expect.objectContaining({
        intent: 'regras_condominio',
        reply: expect.stringContaining('regras'),
      }),
    );
  });

  it('deve responder não entendi quando a intenção é fora de escopo', async () => {
    mlClientService.parse.mockResolvedValue({
      intencao: 'fora_de_escopo',
      confianca: 0.2,
      entities: {},
    });

    const service = createService();

    await expect(service.handleMessage('Quero jogar xadrez', usuarioMorador)).resolves.toEqual(
      expect.objectContaining({
        intent: 'fora_de_escopo',
        reply: expect.stringContaining('Não entendi'),
      }),
    );
  });
});
