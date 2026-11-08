import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';
import { PerfilUsuario, StatusCobranca } from '../../database/entities/enums';
import { AuthUserDto } from '../auth/dto/auth-response.dto';
import {
  PAGAMENTO_GATEWAY,
  type GatewayPagamento,
} from '../payments/interfaces/gateway-pagamento.interface';
import { CobrancasRepository } from './cobrancas.repository';
import { CobrancasService } from './cobrancas.service';
import { CheckoutResponseDto } from './dto/checkout-response.dto';

@Injectable()
export class CobrancasCheckoutService {
  private readonly logger = new Logger(CobrancasCheckoutService.name);

  constructor(
    private readonly cobrancasService: CobrancasService,
    private readonly cobrancasRepository: CobrancasRepository,
    @Inject(PAGAMENTO_GATEWAY)
    private readonly gatewayPagamento: GatewayPagamento,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async criarCheckout(
    cobrancaId: number,
    user: AuthUserDto,
  ): Promise<CheckoutResponseDto> {
    const cobranca = await this.cobrancasRepository.findOneWithUnit(cobrancaId);
    if (!cobranca) {
      throw new NotFoundException('Cobrança não encontrada.');
    }

    // A permissão vem do usuário logado e do banco, nunca de dados do cliente.
    if (!this.ehGestor(user)) {
      const autorizado = await this.cobrancasRepository.belongsToUser(
        cobrancaId,
        user.id,
      );
      if (!autorizado) {
        throw new ForbiddenException(
          'Você não tem permissão para pagar esta cobrança.',
        );
      }
    }

    if (cobranca.status === StatusCobranca.PAGA) {
      throw new ConflictException('Esta cobrança já foi paga.');
    }

    const { successUrl, cancelUrl } = this.config.get('stripe', {
      infer: true,
    });

    const { url, sessionId } = await this.gatewayPagamento.criarCheckout({
      cobrancaId: cobranca.id,
      pagadorId: user.id,
      descricao: `Taxa condominial - bloco ${cobranca.unidade.bloco}, unidade ${cobranca.unidade.numero}`,
      valor: cobranca.valor,
      successUrl: this.comCobranca(successUrl, cobranca.id),
      cancelUrl: this.comCobranca(cancelUrl, cobranca.id),
    });

    await this.cobrancasRepository.saveStripeSession(cobranca.id, sessionId);
    return { url };
  }

  async tratarWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const evento = await this.gatewayPagamento.parseWebhook(rawBody, signature);

    if (evento.tipo === 'EVENTO_IGNORADO') {
      this.logger.log(`Webhook ignorado: ${evento.motivo}`);
      return;
    }

    const cobranca = await this.cobrancasRepository.findOneWithUnit(
      evento.cobrancaId,
    );
    if (!cobranca) {
      // Responder erro só faria o Stripe reenviar para sempre um evento sem destino.
      this.logger.error(
        `Cobrança ${evento.cobrancaId} não encontrada para registrar pagamento do webhook`,
      );
      return;
    }

    if (Math.round(cobranca.valor * 100) !== Math.round(evento.valor * 100)) {
      this.logger.error(
        `Valor divergente na sessão ${evento.sessionId}: cobrança ${cobranca.valor}, pago ${evento.valor}`,
      );
      return;
    }

    await this.cobrancasService.registrarPagamento(
      cobranca.id,
      evento.pagadorId,
    );
    this.logger.log(
      `Cobrança ${cobranca.id} marcada como paga via webhook, sessão ${evento.sessionId}`,
    );
  }

  private comCobranca(url: string, cobrancaId: number): string {
    const destino = new URL(url);
    destino.searchParams.set('cobranca', cobrancaId.toString());
    return destino.toString();
  }

  private ehGestor(user: AuthUserDto): boolean {
    return (
      user.perfil === PerfilUsuario.SINDICO ||
      user.perfil === PerfilUsuario.ADMIN
    );
  }
}
