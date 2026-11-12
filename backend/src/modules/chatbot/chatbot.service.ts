import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import path from 'node:path';
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

export interface ChatbotMessageResponse {
  reply: string;
  intent: string;
  data?: unknown;
}

interface ChatConversationContext {
  intent: string;
  local?: string;
  equipamento?: string;
  descricao?: string;
}

interface FaqEntry {
  titulo: string;
  texto: string;
}

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly pendingContext = new Map<number, ChatConversationContext>();
  private readonly faq = this.loadFaq();

  constructor(
    private readonly mlClientService: MlClientService,
    private readonly unitsService: UnitsService,
    private readonly chamadosService: ChamadosService,
    private readonly cobrancasService: CobrancasService,
    private readonly cobrancasCheckoutService: CobrancasCheckoutService,
    private readonly predictionsService: PredictionsService,
    private readonly residentsService: ResidentsService,
  ) {}

  async handleMessage(
    text: string,
    user: AuthUserDto,
  ): Promise<ChatbotMessageResponse> {
    const parsed = await this.mlClientService.parse(text);
    const intent = this.normalizarIntent(parsed.intencao);
    const confianca = Number(parsed.confianca ?? 0);

    // Respostas curtas como "garagem" e "elevador" podem ser classificadas
    // como fora de escopo pelo modelo, mas são válidas durante a coleta do chamado.
    const intentsAlternativasConhecidas = new Set([
      'consultar_apartamentos',
      'status_chamado',
      'segunda_via_boleto',
      'status_financeiro',
      'previsao_despesas',
      'recomendar_produtos',
      'regras_condominio',
    ]);
    const possuiChamadoPendente = this.pendingContext.has(user.id);
    if (
      possuiChamadoPendente &&
      (intent === 'abrir_chamado' ||
        !intentsAlternativasConhecidas.has(intent) ||
        confianca < 0.7)
    ) {
      return this.abrirChamado(parsed, text, user);
    }

    if (confianca < 0.7 || intent === 'fora_de_escopo') {
      return this.responderNaoEntendi();
    }

    if (possuiChamadoPendente) {
      this.pendingContext.delete(user.id);
    }

    switch (intent) {
      case 'saudacao':
        return this.responderSaudacao();
      case 'consultar_apartamentos':
        return this.consultarApartamentos(parsed);
      case 'abrir_chamado':
        return this.abrirChamado(parsed, text, user);
      case 'status_chamado':
        return this.statusChamado(user);
      case 'segunda_via_boleto':
        return this.segundaViaBoleto(user);
      case 'status_financeiro':
        return this.statusFinanceiro(user);
      case 'previsao_despesas':
        return this.previsaoDespesas(user);
      case 'recomendar_produtos':
        return this.recomendarProdutos(user);
      case 'regras_condominio':
        return this.regrasCondominio();
      default:
        return this.responderNaoEntendi();
    }
  }

  private async consultarApartamentos(
    payload: NluParseResponse,
  ): Promise<ChatbotMessageResponse> {
    const entities = this.normalizarEntities(payload.entities);
    const quartos = this.lerNumero(
      entities.quartos ?? entities.quartos_minimos,
    );
    // O ml-service devolve `valorMax` (camelCase); as demais chaves ficam como
    // compatibilidade com versões anteriores do contrato.
    const valorMax = this.lerNumero(
      entities.valorMax ??
        entities.valor_max ??
        entities.valor ??
        entities.valor_maximo,
    );
    const bloco = this.valorTexto(entities.bloco);

    const unidades = await this.unitsService.listAvailableUnits({
      bloco,
      quartos: quartos ?? undefined,
      valorMax: valorMax ?? undefined,
    });

    if (!unidades.length) {
      return {
        intent: 'consultar_apartamentos',
        reply:
          'Não encontrei unidades disponíveis com esses filtros no momento. Posso tentar outros valores ou mais quartos.',
      };
    }

    const resumo = unidades
      .slice(0, 3)
      .map(
        (unidade) =>
          `Bloco ${unidade.bloco} ${unidade.numero} · ${unidade.quartos} quartos · R$ ${Number(unidade.valorAluguelSugerido).toFixed(2)}`,
      )
      .join(' | ');

    return {
      intent: 'consultar_apartamentos',
      reply: `Encontrei os seguintes apartamentos: ${resumo}.`,
      data: {
        unidades: unidades.slice(0, 3),
      },
    };
  }

  private async abrirChamado(
    payload: NluParseResponse,
    textoOriginal: string,
    user: AuthUserDto,
  ): Promise<ChatbotMessageResponse> {
    const entities = this.normalizarEntities(payload.entities);
    const existing = this.pendingContext.get(user.id);
    const local = this.valorTexto(
      entities.local ??
        entities.localizacao ??
        existing?.local ??
        this.extrairLocal(textoOriginal),
    );
    const equipamento = this.valorTexto(
      entities.equipamento ??
        existing?.equipamento ??
        this.extrairEquipamento(textoOriginal),
    );

    if (!local) {
      this.pendingContext.set(user.id, {
        intent: 'abrir_chamado',
        equipamento: equipamento ?? existing?.equipamento,
        descricao: textoOriginal,
      });
      return {
        intent: 'abrir_chamado',
        reply:
          'Em qual local? Posso registrar o chamado para piscina, garagem, salão, ou outra área comum.',
        data: {
          require: 'local',
          pending: true,
        },
      };
    }

    if (!equipamento) {
      this.pendingContext.set(user.id, {
        intent: 'abrir_chamado',
        local,
        descricao: textoOriginal,
      });
      return {
        intent: 'abrir_chamado',
        reply:
          'Qual equipamento está com problema? Ex.: elevador, ar-condicionado, portão, energia.',
        data: {
          require: 'equipamento',
          pending: true,
        },
      };
    }

    const chamado = await this.chamadosService.create(
      {
        areaComum: local,
        categoria: 'manutencao',
        equipamento,
        descricao: `Solicitação de manutenção em ${local} para ${equipamento}.`,
      },
      user,
    );

    this.pendingContext.delete(user.id);

    return {
      intent: 'abrir_chamado',
      reply: `Solicitação registrada com sucesso. Seu chamado foi aberto no número ${chamado.id}.`,
      data: {
        chamadoId: chamado.id,
        status: StatusChamado.ABERTO,
      },
    };
  }

  private async statusChamado(
    user: AuthUserDto,
  ): Promise<ChatbotMessageResponse> {
    const resultado = await this.chamadosService.buscaTodos(
      { status: StatusChamado.ABERTO, pagina: 1, limite: 10 },
      user,
    );

    if (!resultado.data.length) {
      return {
        intent: 'status_chamado',
        reply: 'Você não possui chamados abertos no momento.',
      };
    }

    const resumo = resultado.data
      .slice(0, 3)
      .map((chamado) => `#${chamado.id} · ${chamado.status}`)
      .join(' | ');

    return {
      intent: 'status_chamado',
      reply: `Você tem chamados em aberto: ${resumo}.`,
      data: { chamados: resultado.data.slice(0, 3) },
    };
  }

  private async segundaViaBoleto(
    user: AuthUserDto,
  ): Promise<ChatbotMessageResponse> {
    const cobrancas = await this.cobrancasService.buscarMinhas(
      { status: StatusCobranca.PENDENTE, pagina: 1, limite: 10 },
      user,
    );

    if (!cobrancas.data.length) {
      return {
        intent: 'segunda_via_boleto',
        reply:
          'Você não possui cobranças pendentes para emitir a segunda via do boleto.',
      };
    }

    const cobranca = cobrancas.data[0];
    const checkout = await this.cobrancasCheckoutService.criarCheckout(
      cobranca.id,
      user,
    );

    return {
      intent: 'segunda_via_boleto',
      reply: `Sua segunda via do boleto está disponível: cobrança pendente de R$ ${Number(cobranca.valor).toFixed(2)}. Clique no link para pagar: ${checkout.url}`,
      data: {
        cobrancaId: cobranca.id,
        paymentUrl: checkout.url,
      },
    };
  }

  private async statusFinanceiro(
    user: AuthUserDto,
  ): Promise<ChatbotMessageResponse> {
    const cobrancas = await this.cobrancasService.buscarMinhas(
      { status: StatusCobranca.PENDENTE, pagina: 1, limite: 10 },
      user,
    );

    if (!cobrancas.data.length) {
      return {
        intent: 'status_financeiro',
        reply: 'Você não possui cobranças pendentes no momento.',
      };
    }

    const total = cobrancas.data.reduce(
      (soma, item) => soma + Number(item.valor),
      0,
    );

    return {
      intent: 'status_financeiro',
      reply: `Você tem ${cobrancas.data.length} cobrança(s) pendentes, totalizando R$ ${total.toFixed(2)}.`,
      data: {
        totalPendente: Number(total.toFixed(2)),
        cobrancas: cobrancas.data,
      },
    };
  }

  private async previsaoDespesas(
    user: AuthUserDto,
  ): Promise<ChatbotMessageResponse> {
    if (user.perfil === PerfilUsuario.MORADOR) {
      throw new ForbiddenException(
        'A previsão de despesas é exclusiva para síndico ou administrador.',
      );
    }

    const resposta = await this.predictionsService.getExpensesForecast();

    return {
      intent: 'previsao_despesas',
      reply: `A previsão de custo do próximo mês é de R$ ${Number(resposta.predictedTotal).toFixed(2)}.`,
      data: resposta,
    };
  }

  private async recomendarProdutos(
    user: AuthUserDto,
  ): Promise<ChatbotMessageResponse> {
    const resposta = await this.residentsService.obterRecomendacoes(user);

    if (!resposta.recommendations.length) {
      return {
        intent: 'recomendar_produtos',
        reply:
          'Não encontrei recomendações personalizadas para o seu perfil agora.',
      };
    }

    const items = resposta.recommendations
      .slice(0, 3)
      .map(
        (item) =>
          `${item.anuncio.titulo} (R$ ${item.anuncio.preco.toFixed(2)})`,
      )
      .join(' | ');

    return {
      intent: 'recomendar_produtos',
      reply: `Minha recomendação para você: ${items}.`,
      data: resposta,
    };
  }

  private regrasCondominio(): ChatbotMessageResponse {
    const faq = this.faq as { versao?: string; regras?: FaqEntry[] };
    const regras = faq.regras ?? [];
    const resumo = regras
      .slice(0, 3)
      .map((item) => `${item.titulo}: ${item.texto}`)
      .join(' • ');

    return {
      intent: 'regras_condominio',
      reply: `Regras do condomínio (${faq.versao ?? 'v1'}): ${resumo}`,
      data: {
        versao: faq.versao ?? 'v1',
        regras: regras.slice(0, 3),
      },
    };
  }

  private responderSaudacao(): ChatbotMessageResponse {
    return {
      intent: 'saudacao',
      reply:
        'Olá! Sou o assistente Habita+. Posso ajudar com apartamentos disponíveis, chamados, cobranças, regras do condomínio e recomendações do marketplace.',
    };
  }

  private responderNaoEntendi(): ChatbotMessageResponse {
    return {
      intent: 'fora_de_escopo',
      reply:
        'Não entendi. Posso ajudar com apartamentos disponíveis, chamados, cobranças, regras do condomínio e recomendações do marketplace.',
      data: {
        suggestions: [
          'consultar_apartamentos',
          'abrir_chamado',
          'status_chamado',
          'status_financeiro',
          'regras_condominio',
        ],
      },
    };
  }

  private normalizarIntent(value?: string): string {
    return (value ?? 'fora_de_escopo').trim().toLowerCase();
  }

  private normalizarEntities(
    value?: Record<string, unknown>,
  ): Record<string, unknown> {
    return value ?? {};
  }

  private lerNumero(value: unknown): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const numero = Number(value);
    return Number.isFinite(numero) ? numero : undefined;
  }

  private extrairLocal(text: string): string | undefined {
    const normalized = text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const match = normalized.match(
      /\b(piscina|garagem|salao|hall|portaria|academia|jardim|banheiro|corredor|telhado)\b/,
    );
    return match?.[1];
  }

  private extrairEquipamento(text: string): string | undefined {
    const normalized = text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const patterns: Array<[RegExp, string]> = [
      [/\belevador(?:es)?\b/, 'elevador'],
      [/\bport(?:ao|oes)\b/, 'portao'],
      [/\bbombas?\b/, 'bomba'],
      [/\binterfones?\b/, 'interfone'],
      [/\b(?:iluminacao|lampadas?|luminarias?|sem luz)\b/, 'iluminacao'],
      [/\bar[- ]condicionado\b/, 'ar-condicionado'],
      [/\bencanamento\b/, 'encanamento'],
    ];
    return patterns.find(([pattern]) => pattern.test(normalized))?.[1];
  }

  private valorTexto(value: unknown): string | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return String(value).trim();
    }

    return undefined;
  }

  private loadFaq(): Record<string, unknown> {
    const faqPath = path.resolve(__dirname, 'faq', 'regras-condominio.v1.json');
    const raw = readFileSync(faqPath, 'utf8');
    return JSON.parse(raw) as Record<string, unknown>;
  }
}
