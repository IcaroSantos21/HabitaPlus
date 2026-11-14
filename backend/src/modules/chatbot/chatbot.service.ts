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
  // Dado que o bot acabou de perguntar: a próxima resposta curta preenche esse campo.
  aguardando?: 'local' | 'equipamento';
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
    if (this.pendingContext.has(user.id) && this.querCancelar(text)) {
      this.pendingContext.delete(user.id);
      return {
        intent: 'abrir_chamado',
        reply:
          'Tudo bem, cancelei a abertura do chamado. Posso ajudar com mais alguma coisa?',
        data: { cancelado: true },
      };
    }

    const parsed = await this.mlClientService.parse(text);
    const intent = this.normalizarIntent(parsed.intencao);
    const intentCorreto = this.resolverIntentPorTexto(text, intent);
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
      (intentCorreto === 'abrir_chamado' ||
        !intentsAlternativasConhecidas.has(intentCorreto) ||
        confianca < 0.7)
    ) {
      return this.abrirChamado(parsed, text, user);
    }

    if (intentCorreto === 'fora_de_escopo') {
      return this.responderNaoEntendi();
    }

    if (possuiChamadoPendente) {
      this.pendingContext.delete(user.id);
    }

    switch (intentCorreto) {
      case 'saudacao':
        return this.responderSaudacao();
      case 'consultar_apartamentos':
        return this.consultarApartamentos(parsed, text);
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
    textoOriginal = '',
  ): Promise<ChatbotMessageResponse> {
    const entities = this.normalizarEntities(payload.entities);
    const blocos = this.extrairListaTexto(entities.blocos ?? entities.bloco);
    const quartosLista = this.extrairListaNumeros(
      entities.quartos ?? entities.quartosLista ?? entities.quartos_minimos,
    );
    const quartos = quartosLista?.length === 1 ? quartosLista[0] : undefined;
    const valorMin = this.lerNumero(
      entities.valorMin ??
        entities.valor_min ??
        entities.valorMinimo ??
        this.extrairValorMinimo(textoOriginal),
    );
    // O ml-service devolve `valorMax` (camelCase); as demais chaves ficam como
    // compatibilidade com versões anteriores do contrato.
    const valorMax = this.lerNumero(
      entities.valorMax ??
        entities.valor_max ??
        entities.valor ??
        entities.valor_maximo,
    );
    const bloco = blocos?.length === 1 ? blocos[0] : undefined;

    const filtros: Record<string, unknown> = {};
    if (bloco) {
      filtros.bloco = bloco;
    }
    if (blocos && blocos.length > 1) {
      filtros.blocos = blocos;
    }
    if (quartos !== undefined) {
      filtros.quartos = quartos;
    }
    if (quartosLista && quartosLista.length > 1) {
      filtros.quartosLista = quartosLista;
    }
    if (valorMin !== undefined) {
      filtros.valorMin = valorMin;
    }
    if (valorMax !== undefined) {
      filtros.valorMax = valorMax;
    }

    const unidades = await this.unitsService.listAvailableUnits(filtros);

    if (!unidades.length) {
      return {
        intent: 'consultar_apartamentos',
        reply:
          'Não encontrei unidades disponíveis com esses filtros no momento. Posso tentar outros valores ou mais quartos.',
      };
    }

    const unidadesParaMostrar = this.embaralharUnidades(
      unidades,
      textoOriginal,
    );
    const resumo = unidadesParaMostrar
      .map(
        (unidade) =>
          `Bloco ${unidade.bloco} ${unidade.numero} · ${unidade.quartos} quartos · R$ ${Number(unidade.valorAluguelSugerido).toFixed(2)}`,
      )
      .join(' | ');

    return {
      intent: 'consultar_apartamentos',
      reply: `Encontrei os seguintes apartamentos: ${resumo}.`,
      data: {
        unidades: unidadesParaMostrar,
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
    let local = this.valorTexto(
      entities.local ??
        entities.localizacao ??
        existing?.local ??
        this.extrairLocal(textoOriginal),
    );
    let equipamento = this.valorTexto(
      entities.equipamento ??
        existing?.equipamento ??
        this.extrairEquipamento(textoOriginal),
    );

    // Se o bot acabou de perguntar o dado e o NLU não reconheceu (ex.: "gerador",
    // que não está na lista de equipamentos), a própria resposta é o valor.
    if (!local && existing?.aguardando === 'local') {
      local = this.lerRespostaLivre(textoOriginal);
    }
    if (local && !equipamento && existing?.aguardando === 'equipamento') {
      equipamento = this.lerRespostaLivre(textoOriginal);
    }

    if (!local) {
      this.pendingContext.set(user.id, {
        intent: 'abrir_chamado',
        equipamento: equipamento ?? existing?.equipamento,
        descricao: textoOriginal,
        aguardando: 'local',
      });
      return {
        intent: 'abrir_chamado',
        reply:
          existing?.aguardando === 'local'
            ? 'Não consegui entender o local. Diga só o nome da área, como piscina, garagem ou salão. Se preferir, digite "cancelar".'
            : 'Em qual local? Posso registrar o chamado para piscina, garagem, salão, ou outra área comum.',
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
        aguardando: 'equipamento',
      });
      return {
        intent: 'abrir_chamado',
        reply:
          existing?.aguardando === 'equipamento'
            ? 'Não consegui entender o equipamento. Diga só o nome dele, como gerador ou elevador. Se preferir, digite "cancelar".'
            : 'Qual equipamento está com problema? Ex.: elevador, ar-condicionado, portão, energia. Se for outro, é só me dizer o nome.',
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

  private resolverIntentPorTexto(texto: string, intent: string): string {
    const mensagem = this.normalizarTexto(texto);

    if (this.contemQualquer(mensagem, ['status do chamado', 'meu chamado'])) {
      return 'status_chamado';
    }

    if (
      this.contemQualquer(mensagem, [
        'segunda via',
        'boleto',
        'fatura',
        'cobranca',
        'cobrança',
        'pagar',
      ])
    ) {
      return 'segunda_via_boleto';
    }

    if (
      this.contemQualquer(mensagem, [
        'situacao financeira',
        'status financeiro',
        'minhas cobrancas',
        'minhas cobranças',
        'valor pendente',
        'total pendente',
      ])
    ) {
      return 'status_financeiro';
    }

    if (
      this.contemQualquer(mensagem, [
        'previsao',
        'despesa',
        'despesas',
        'proximo mes',
        'próximo mês',
      ])
    ) {
      return 'previsao_despesas';
    }

    if (
      this.contemQualquer(mensagem, [
        'recomendar',
        'produto',
        'oferta',
        'mercado',
        'anuncio',
        'anúncio',
      ])
    ) {
      return 'recomendar_produtos';
    }

    if (
      this.contemQualquer(mensagem, [
        'regra',
        'condominio',
        'regulamento',
        'proibido',
        'permitido',
      ])
    ) {
      return 'regras_condominio';
    }

    if (
      this.contemQualquer(mensagem, [
        'apartamento',
        'imovel',
        'imóvel',
        'quartos',
        'bloco',
        'aluguel',
        'valor maximo',
        'valor máximo',
        'disponibilidade',
      ])
    ) {
      return 'consultar_apartamentos';
    }

    if (
      this.contemQualquer(mensagem, [
        'chamado',
        'manutencao',
        'manutenção',
        'reparo',
        'quebra',
        'elevador',
        'portao',
        'portão',
        'piscina',
        'garagem',
      ])
    ) {
      return 'abrir_chamado';
    }

    if (
      this.contemQualquer(mensagem, [
        'oi',
        'ola',
        'olá',
        'bom dia',
        'boa tarde',
        'boa noite',
        'tudo bem',
        'hey',
      ])
    ) {
      return 'saudacao';
    }

    return intent;
  }

  private contemQualquer(texto: string, termos: string[]): boolean {
    return termos.some((termo) => texto.includes(termo));
  }

  private normalizarTexto(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private extrairValorMinimo(textoOriginal: string): number | undefined {
    const texto = this.normalizarTexto(textoOriginal);
    const match = texto.match(
      /(?:acima de|mais de|superior a|maior que|a partir de)\s*(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*|\d+)(?:\s*(?:mil|reais|real))?/,
    );

    if (!match) {
      return undefined;
    }

    const valor = Number(match[1].replace('.', '').replace(',', '.'));
    const multiplicaMil =
      /mil\b/.test(texto) || /\d{1,3}(?:\.\d{3})+/.test(match[1]);
    return Number.isFinite(valor)
      ? valor * (multiplicaMil ? 1000 : 1)
      : undefined;
  }

  private extrairListaTexto(value: unknown): string[] | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const valores = Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value.split(/[;,|]/)
        : [value];

    const lista = [
      ...new Set(
        valores
          .map((item) => this.valorTexto(item))
          .filter((item): item is string => Boolean(item)),
      ),
    ].map((item) => item.trim());

    return lista.length ? lista : undefined;
  }

  private extrairListaNumeros(value: unknown): number[] | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const valores = Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value.split(/[;,|]/)
        : [value];

    const lista = [
      ...new Set(
        valores
          .map((item) => this.lerNumero(item))
          .filter((item): item is number => item !== undefined),
      ),
    ];

    return lista.length ? lista : undefined;
  }

  private embaralharUnidades<T>(unidades: T[], textoOriginal = ''): T[] {
    const lista = [...unidades];
    const pediuOutros =
      /(?:mostre|mostrar|traga|quero)\s+(?:outro(?:s)?|outras?|mais op(?:c|ç)ões?|outra op(?:c|ç)ão|novas op(?:c|ç)ões?)/i.test(
        textoOriginal,
      );

    if (lista.length <= 1 && !pediuOutros) {
      return lista;
    }

    for (let indice = lista.length - 1; indice > 0; indice -= 1) {
      const sorteio = Math.floor(Math.random() * (indice + 1));
      [lista[indice], lista[sorteio]] = [lista[sorteio], lista[indice]];
    }

    return lista.slice(0, 5);
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

  private querCancelar(texto: string): boolean {
    return /^(?:cancelar?|cancela|deixa pra la|esquece|desisti|nao quero mais)\b/.test(
      this.normalizarTexto(texto.trim()),
    );
  }

  // Resposta curta a uma pergunta do bot: o texto digitado é o próprio valor do campo.
  private lerRespostaLivre(texto: string): string | undefined {
    const limpo = texto
      .trim()
      .replace(/[.!?,;:]+$/g, '')
      .replace(/^(?:o|a|os|as|um|uma|do|da|no|na)\s+/i, '')
      .trim();
    const palavras = limpo.split(/\s+/).filter(Boolean);
    if (!limpo || limpo.length > 60 || palavras.length > 5) {
      return undefined;
    }
    return limpo.toLowerCase();
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
