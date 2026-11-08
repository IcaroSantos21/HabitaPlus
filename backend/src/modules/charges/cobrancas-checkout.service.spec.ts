import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';
import { Cobranca } from '../../database/entities/cobranca.entity';
import { PerfilUsuario, StatusCobranca } from '../../database/entities/enums';
import { Unidade } from '../../database/entities/unidade.entity';
import { AuthUserDto } from '../auth/dto/auth-response.dto';
import {
  EventoPagamento,
  GatewayPagamento,
} from '../payments/interfaces/gateway-pagamento.interface';
import { CobrancasCheckoutService } from './cobrancas-checkout.service';
import { CobrancasRepository } from './cobrancas.repository';
import { CobrancasService } from './cobrancas.service';

const morador: AuthUserDto = {
  id: 1,
  nome: 'Maria',
  email: 'maria@example.com',
  perfil: PerfilUsuario.MORADOR,
};
const sindico: AuthUserDto = {
  ...morador,
  id: 2,
  perfil: PerfilUsuario.SINDICO,
};

function criarCobranca(overrides: Partial<Cobranca> = {}): Cobranca {
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

const confirmado: EventoPagamento = {
  tipo: 'PAGAMENTO_CONFIRMADO',
  sessionId: 'cs_test_1',
  cobrancaId: 10,
  pagadorId: 1,
  valor: 650,
};

describe('CobrancasCheckoutService', () => {
  const repository = {
    findOneWithUnit: jest.fn(),
    belongsToUser: jest.fn(),
    saveStripeSession: jest.fn(),
  };
  const cobrancasService = { registrarPagamento: jest.fn() };
  const criarCheckout = jest.fn();
  const parseWebhook = jest.fn();
  const gateway: GatewayPagamento = { criarCheckout, parseWebhook };
  const config = { get: jest.fn() } as unknown as ConfigService<
    AppConfig,
    true
  >;

  let service: CobrancasCheckoutService;

  beforeEach(() => {
    jest.resetAllMocks();
    (config.get as jest.Mock).mockReturnValue({
      successUrl: 'http://localhost:5173/pagamento/sucesso',
      cancelUrl: 'http://localhost:5173/pagamento/cancelado',
    });
    repository.findOneWithUnit.mockResolvedValue(criarCobranca());
    repository.belongsToUser.mockResolvedValue(true);
    criarCheckout.mockResolvedValue({
      url: 'https://stripe/pay',
      sessionId: 'cs_test_1',
    });
    service = new CobrancasCheckoutService(
      cobrancasService as unknown as CobrancasService,
      repository as unknown as CobrancasRepository,
      gateway,
      config,
    );
  });

  describe('criarCheckout', () => {
    it('deve criar o checkout, guardar a sessão e devolver só a url', async () => {
      const resposta = await service.criarCheckout(10, morador);

      expect(resposta).toEqual({ url: 'https://stripe/pay' });
      expect(repository.saveStripeSession).toHaveBeenCalledWith(
        10,
        'cs_test_1',
      );
    });

    it('deve enviar valor, pagador logado e URLs de retorno com o id da cobrança', async () => {
      await service.criarCheckout(10, morador);

      expect(criarCheckout).toHaveBeenCalledWith({
        cobrancaId: 10,
        pagadorId: 1,
        descricao: 'Taxa condominial - bloco B, unidade 302',
        valor: 650,
        successUrl: 'http://localhost:5173/pagamento/sucesso?cobranca=10',
        cancelUrl: 'http://localhost:5173/pagamento/cancelado?cobranca=10',
      });
    });

    it('deve aceitar cobrança atrasada', async () => {
      repository.findOneWithUnit.mockResolvedValue(
        criarCobranca({ status: StatusCobranca.ATRASADA }),
      );

      await expect(service.criarCheckout(10, morador)).resolves.toEqual({
        url: 'https://stripe/pay',
      });
    });

    it('deve lançar 404 quando a cobrança não existe', async () => {
      repository.findOneWithUnit.mockResolvedValue(null);

      await expect(service.criarCheckout(99, morador)).rejects.toThrow(
        new NotFoundException('Cobrança não encontrada.'),
      );
      expect(criarCheckout).not.toHaveBeenCalled();
    });

    it('deve impedir morador de pagar cobrança de outra unidade (403)', async () => {
      repository.belongsToUser.mockResolvedValue(false);

      await expect(service.criarCheckout(10, morador)).rejects.toThrow(
        new ForbiddenException(
          'Você não tem permissão para pagar esta cobrança.',
        ),
      );
      expect(repository.belongsToUser).toHaveBeenCalledWith(10, 1);
      expect(criarCheckout).not.toHaveBeenCalled();
    });

    it('deve permitir ao síndico iniciar o pagamento sem checar vínculo', async () => {
      await service.criarCheckout(10, sindico);

      expect(repository.belongsToUser).not.toHaveBeenCalled();
      expect(criarCheckout).toHaveBeenCalledWith(
        expect.objectContaining({ pagadorId: 2 }),
      );
    });

    it('deve impedir pagar uma cobrança já paga (409)', async () => {
      repository.findOneWithUnit.mockResolvedValue(
        criarCobranca({ status: StatusCobranca.PAGA }),
      );

      await expect(service.criarCheckout(10, morador)).rejects.toThrow(
        new ConflictException('Esta cobrança já foi paga.'),
      );
      expect(criarCheckout).not.toHaveBeenCalled();
    });

    it('não deve gravar sessão quando o Stripe falha', async () => {
      criarCheckout.mockRejectedValue(
        new ServiceUnavailableException('fora do ar'),
      );

      await expect(service.criarCheckout(10, morador)).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(repository.saveStripeSession).not.toHaveBeenCalled();
    });
  });

  describe('tratarWebhook', () => {
    const corpo = Buffer.from('{}');

    it('deve marcar a cobrança como paga com o pagador dos metadados', async () => {
      parseWebhook.mockResolvedValue(confirmado);

      await service.tratarWebhook(corpo, 't=1,v1=abc');

      expect(parseWebhook).toHaveBeenCalledWith(corpo, 't=1,v1=abc');
      expect(cobrancasService.registrarPagamento).toHaveBeenCalledWith(10, 1);
    });

    it('deve propagar o erro de assinatura inválida sem pagar nada', async () => {
      parseWebhook.mockRejectedValue(
        new BadRequestException('Assinatura do webhook inválida.'),
      );

      await expect(service.tratarWebhook(corpo, 'x')).rejects.toThrow(
        new BadRequestException('Assinatura do webhook inválida.'),
      );
      expect(cobrancasService.registrarPagamento).not.toHaveBeenCalled();
    });

    it('deve ignorar eventos sem ação sem tocar na cobrança', async () => {
      parseWebhook.mockResolvedValue({
        tipo: 'EVENTO_IGNORADO',
        motivo: 'evento charge.refunded não tratado',
      });

      await expect(service.tratarWebhook(corpo, 'x')).resolves.toBeUndefined();
      expect(repository.findOneWithUnit).not.toHaveBeenCalled();
      expect(cobrancasService.registrarPagamento).not.toHaveBeenCalled();
    });

    it('deve responder sucesso (sem reenvio) para cobrança inexistente', async () => {
      parseWebhook.mockResolvedValue(confirmado);
      repository.findOneWithUnit.mockResolvedValue(null);

      await expect(service.tratarWebhook(corpo, 'x')).resolves.toBeUndefined();
      expect(cobrancasService.registrarPagamento).not.toHaveBeenCalled();
    });

    it('não deve pagar quando o valor recebido diverge do valor da cobrança', async () => {
      parseWebhook.mockResolvedValue({ ...confirmado, valor: 1 });

      await expect(service.tratarWebhook(corpo, 'x')).resolves.toBeUndefined();
      expect(cobrancasService.registrarPagamento).not.toHaveBeenCalled();
    });

    it('deve repassar o evento repetido ao registro idempotente (sem segunda receita)', async () => {
      parseWebhook.mockResolvedValue(confirmado);

      await service.tratarWebhook(corpo, 'x');
      await service.tratarWebhook(corpo, 'x');

      expect(cobrancasService.registrarPagamento).toHaveBeenCalledTimes(2);
      // A idempotência em si é garantida por markAsPaid (UPDATE só em aberto)
      // e coberta em cobrancas.service.spec.ts.
    });
  });
});
