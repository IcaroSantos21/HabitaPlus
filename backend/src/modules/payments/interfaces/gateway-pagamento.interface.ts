export interface CriarCheckoutInput {
  cobrancaId: number;
  pagadorId: number;
  descricao: string;
  valor: number;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutCriado {
  url: string;
  sessionId: string;
}

export interface PagamentoConfirmado {
  tipo: 'PAGAMENTO_CONFIRMADO';
  sessionId: string;
  cobrancaId: number;
  pagadorId: number;
  valor: number;
}

export interface EventoIgnorado {
  tipo: 'EVENTO_IGNORADO';
  motivo: string;
}

export const PAGAMENTO_GATEWAY = Symbol('PAGAMENTO_GATEWAY');

export type EventoPagamento = PagamentoConfirmado | EventoIgnorado;

export interface GatewayPagamento {
  criarCheckout(input: CriarCheckoutInput): Promise<CheckoutCriado>;
  // Lança BadRequestException quando a assinatura não confere
  parseWebhook(rawBody: Buffer, signature: string): Promise<EventoPagamento>;
}
