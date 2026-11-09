import { http, HttpResponse } from "msw";

const demoUsers = [
  {
    id: 1,
    nome: "Marina Morador",
    email: "morador@habitaplus.com",
    senha: "Habita123!",
    perfil: "MORADOR",
  },
  {
    id: 2,
    nome: "Samuel Síndico",
    email: "sindico@habitaplus.com",
    senha: "Habita123!",
    perfil: "SINDICO",
  },
  {
    id: 3,
    nome: "Ana Administradora",
    email: "admin@habitaplus.com",
    senha: "Habita123!",
    perfil: "ADMIN",
  },
];

const registeredUsersKey = "habitaplus.mockUsers";

function getRegisteredUsers() {
  try {
    return JSON.parse(sessionStorage.getItem(registeredUsersKey) || "[]");
  } catch {
    return [];
  }
}

function getAllUsers() {
  return [...demoUsers, ...getRegisteredUsers()];
}

function getMockRequestUser(request) {
  const token = request.headers.get("authorization") || "";
  const match = token.match(/^Bearer mock-token-(\d+)$/);
  return match ? getAllUsers().find((item) => String(item.id) === match[1]) : null;
}

function isTicketManager(user) {
  return ["SINDICO", "ADMIN"].includes(String(user?.perfil || "").toUpperCase());
}

function normalizeTicketIdentifier(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function ticketPagination(items, url) {
  const pagina = Math.max(1, Number(url.searchParams.get("pagina") || 1));
  const limite = Math.max(1, Math.min(100, Number(url.searchParams.get("limite") || 20)));
  const inicio = (pagina - 1) * limite;
  return {
    data: items.slice(inicio, inicio + limite),
    meta: { pagina, limite, total: items.length, totalPaginas: Math.ceil(items.length / limite) },
  };
}

const ticketUnitDirectory = [
  { id: 204, bloco: "A", numero: "204", residentIds: [] },
  { id: 103, bloco: "B", numero: "103", residentIds: [1] },
];

const mockMaintenanceTickets = [
  {
    id: 1001,
    usuario: { id: 1, nome: "Marina Morador" },
    unidade: { id: 103, bloco: "B", numero: "103" },
    areaComum: null,
    categoria: "hidraulica",
    equipamento: "bomba_de_agua",
    descricao: "A bomba de água está fazendo um ruído incomum.",
    status: "ABERTO",
    abertoEm: "2026-10-30T09:15:00.000Z",
    encerradoEm: null,
  },
  {
    id: 1002,
    usuario: { id: 1, nome: "Marina Morador" },
    unidade: null,
    areaComum: "garagem",
    categoria: "eletrica",
    equipamento: "portao_eletronico",
    descricao: "O portão da garagem demora para fechar.",
    status: "EM_ANDAMENTO",
    abertoEm: "2026-10-28T13:40:00.000Z",
    encerradoEm: null,
  },
  {
    id: 1003,
    usuario: { id: 4, nome: "João Pedro" },
    unidade: null,
    areaComum: "piscina",
    categoria: "limpeza",
    equipamento: "bomba_da_piscina",
    descricao: "Solicitação de verificação da bomba da piscina.",
    status: "ENCERRADO",
    abertoEm: "2026-10-20T10:00:00.000Z",
    encerradoEm: "2026-10-22T14:30:00.000Z",
  },
];

function safeUser(user) {
  const publicUser = { ...user };
  delete publicUser.senha;
  return publicUser;
}

function isAuthorized(request) {
  return Boolean(request.headers.get("authorization")?.startsWith("Bearer "));
}

function unauthorized() {
  return HttpResponse.json(
    { message: "Sessão ausente ou expirada. Entre novamente." },
    { status: 401 },
  );
}

function protectedJson(request, payload) {
  return isAuthorized(request) ? HttpResponse.json(payload) : unauthorized();
}

function paginated(data) {
  return {
    data,
    meta: { page: 1, limit: 20, total: data.length, totalPages: 1 },
  };
}

const mockUnits = [
  {
    id: 204,
    numero: "204",
    bloco: "A",
    quartos: 2,
    areaM2: 68,
    valorAluguelSugerido: 1850,
    disponivelLocacao: true,
  },
  {
    id: 103,
    numero: "103",
    bloco: "B",
    quartos: 3,
    areaM2: 82,
    valorAluguelSugerido: 2100,
    disponivelLocacao: false,
  },
];

const mockTickets = [
  { id: "tic_001", nome: "Vazamento no banheiro", status: "ABERTO", prioridade: "ALTA" },
  { id: "tic_002", nome: "Lâmpada queimada no corredor", status: "EM_ANDAMENTO", prioridade: "NORMAL" },
];

const mockRentals = [
  { id: "loc_001", undId: "unid_204", moradorId: "usr_001", inicio: "2026-01-01", fim: "2026-12-31", valorAluguel: 1850 },
];

const mockTransactions = [
  { id: 501, usuarioId: 2, tipo: "DESPESA", categoria: "manutenção", valor: 920, competencia: "2026-11", data: "2026-11-04", descricao: "Manutenção preventiva do elevador" },
  { id: 502, usuarioId: 2, tipo: "RECEITA", categoria: "condomínio", valor: 650, competencia: "2026-11", data: "2026-11-05", descricao: "Recebimento de taxa condominial" },
  { id: 503, usuarioId: 2, tipo: "DESPESA", categoria: "energia", valor: 480, competencia: "2026-10", data: "2026-10-10", descricao: "Conta de energia das áreas comuns" },
];

const mockCharges = [
  { id: 701, unidade: { id: 103, bloco: "B", numero: "103" }, competencia: "2026-11", valor: 650, vencimento: "2026-11-10", status: "PENDENTE", _moradorId: 1 },
  { id: 702, unidade: { id: 103, bloco: "B", numero: "103" }, competencia: "2026-10", valor: 650, vencimento: "2026-10-10", status: "ATRASADA", _moradorId: 1 },
  { id: 703, unidade: { id: 103, bloco: "B", numero: "103" }, competencia: "2026-09", valor: 650, vencimento: "2026-09-10", status: "PAGA", _moradorId: 1 },
  { id: 704, unidade: { id: 204, bloco: "A", numero: "204" }, competencia: "2026-11", valor: 650, vencimento: "2026-11-05", status: "ATRASADA", _moradorId: 999 },
];

const mockAnnouncements = [
  { id: "ann_001", titulo: "Limpeza da caixa d'água", descricao: "Serviço programado para sábado.", criadoEm: "2026-10-15" },
];

const mockMessages = [
  { id: "msg_001", remetente: "Administração", texto: "Bem-vindo ao Habita+.", criadoEm: "2026-10-14T10:00:00Z" },
];

const mockNotifications = [
  { id: "not_001", titulo: "Novo comunicado", mensagem: "Há um comunicado disponível.", lida: false },
];

// FE-09/FE-11: marketplace, conversas e notificações seguem os contratos NestJS atuais.
const mockListings = [
  {
    id: 801,
    titulo: "Sofá retrátil de 3 lugares",
    descricao: "Sofá em ótimo estado, pouco uso. Retirada no condomínio.",
    categoria: "MOVEIS",
    preco: 950,
    status: "DISPONIVEL",
    imagemUrl: null,
    vendedor: { id: 2, nome: "Samuel Síndico" },
    visualizacoes: 18,
  },
  {
    id: 802,
    titulo: "Bicicleta urbana aro 29",
    descricao: "Bicicleta revisada, com pneus novos e trava inclusa.",
    categoria: "ESPORTE",
    preco: 780,
    status: "DISPONIVEL",
    imagemUrl: null,
    vendedor: { id: 3, nome: "Ana Administradora" },
    visualizacoes: 11,
  },
  {
    id: 803,
    titulo: "Jogo de panelas inox",
    descricao: "Conjunto com cinco peças, sem amassados.",
    categoria: "UTENSILIOS",
    preco: 220,
    status: "DISPONIVEL",
    imagemUrl: null,
    vendedor: { id: 1, nome: "Marina Morador" },
    visualizacoes: 7,
  },
  {
    id: 804,
    titulo: "Monitor 24 polegadas",
    descricao: "Monitor em bom estado, acompanha cabo HDMI.",
    categoria: "ELETRONICOS",
    preco: 540,
    status: "VENDIDO",
    imagemUrl: null,
    vendedor: { id: 1, nome: "Marina Morador" },
    visualizacoes: 23,
  },
  {
    id: 805,
    titulo: "Luminária de mesa",
    descricao: "Luminária articulada, funcionando perfeitamente.",
    categoria: "OUTROS",
    preco: 65,
    status: "DISPONIVEL",
    imagemUrl: null,
    vendedor: { id: 2, nome: "Samuel Síndico" },
    visualizacoes: 4,
  },
];

let mockListingMessages = [
  { id: 9101, anuncioId: 801, remetenteId: 1, destinatarioId: 2, texto: "Olá! O sofá ainda está disponível?", lida: false, criadaEm: "2026-11-08T13:00:00.000Z" },
  { id: 9102, anuncioId: 801, remetenteId: 2, destinatarioId: 1, texto: "Sim, está disponível. Podemos combinar a retirada.", lida: false, criadaEm: "2026-11-08T13:05:00.000Z" },
];

let mockMarketplaceNotifications = [
  { id: 9201, usuarioId: 1, tipo: "ANUNCIO", texto: "Novo anúncio: Sofá retrátil de 3 lugares", refId: 801, lida: false, criadaEm: "2026-11-08T12:00:00.000Z" },
  { id: 9202, usuarioId: 1, tipo: "MENSAGEM", texto: "Nova mensagem sobre Sofá retrátil de 3 lugares", refId: 801, lida: false, criadaEm: "2026-11-08T13:05:00.000Z" },
  { id: 9203, usuarioId: 1, tipo: "COBRANCA", texto: "Sua cobrança de novembro está disponível.", refId: 701, lida: true, criadaEm: "2026-11-07T10:00:00.000Z" },
  { id: 9204, usuarioId: 2, tipo: "MENSAGEM", texto: "Nova mensagem de Marina Morador sobre Sofá retrátil de 3 lugares", refId: 801, lida: false, criadaEm: "2026-11-08T13:00:00.000Z" },
  { id: 9205, usuarioId: 1, tipo: "ALERTA", texto: "Há um chamado de manutenção aguardando acompanhamento.", refId: 1001, lida: false, criadaEm: "2026-11-06T09:00:00.000Z" },
];

function listingOwner(listing) {
  return Number(listing?.vendedor?.id);
}

function listingPagination(rows, url) {
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") || 20)));
  const start = (page - 1) * limit;
  return {
    data: rows.slice(start, start + limit),
    meta: { page, limit, total: rows.length, totalPages: Math.max(1, Math.ceil(rows.length / limit)) },
  };
}

function appendMockNotification(userId, tipo, texto, refId) {
  mockMarketplaceNotifications.unshift({
    id: Math.max(9200, ...mockMarketplaceNotifications.map((item) => Number(item.id))) + 1,
    usuarioId: Number(userId),
    tipo,
    texto,
    refId: refId ?? null,
    lida: false,
    criadaEm: new Date().toISOString(),
  });
}

function listingForbidden() {
  return HttpResponse.json({ message: "Você não tem permissão para modificar este anúncio." }, { status: 403 });
}


const mockConversation = {
  id: "conv_demo",
  mensagens: [
    { id: "m1", autor: "assistant", texto: "Olá! Sou o assistente virtual Habita+. Como posso ajudar?" },
  ],
};

const mockForecast = {
  predictionId: "pred_demo",
  condominioId: "cond_demo",
  mesDesejado: "2026-11",
  predicaoTotal: 4900,
  moeda: "BRL",
  predictions: [{ category: "ENERGY", predictedAmount: 4900 }],
  versaoModelo: "expenses-v1",
  geradoEm: "2026-10-20T16:30:00Z",
};

const mockRecommendations = {
  recommendations: [
    { id: "rec_001", type: "SERVICE", titulo: "Acompanhar chamado de manutenção", descricao: "Consulte o andamento do seu chamado.", targetId: "tic_001", score: 0.92 },
    { id: "rec_002", type: "ANNOUNCEMENT", titulo: "Comunicados do condomínio", descricao: "Consulte os comunicados recentes.", targetId: "ann_001", score: 0.81 },
  ],
  versaoModelo: "recommend-v1",
};



const mockFinanceDashboard = {
  month: "2026-10",
  metrics: {
    revenue: 58900,
    expenses: 43250,
    balance: 15650,
    delinquency: {
      amount: 3250,
      count: 5,
      rate: 5.5,
    },
  },
  monthlyHistory: [
    { month: "2026-05", amount: 35200 },
    { month: "2026-06", amount: 36750 },
    { month: "2026-07", amount: 38900 },
    { month: "2026-08", amount: 40180 },
    { month: "2026-09", amount: 41750 },
    { month: "2026-10", amount: 43250 },
  ],
  alerts: [
    {
      id: "alt_001",
      title: "Cobranças próximas do vencimento",
      description: "Existem 5 cobranças em aberto que precisam de acompanhamento.",
      type: "warning",
      label: "Atenção",
      createdAt: "2026-10-30T09:00:00-03:00",
    },
    {
      id: "alt_002",
      title: "Manutenção preventiva concluída",
      description: "A manutenção preventiva do elevador foi concluída.",
      type: "success",
      label: "Concluído",
      createdAt: "2026-10-29T15:30:00-03:00",
    },
    {
      id: "alt_003",
      title: "Novo comunicado publicado",
      description: "Há um novo comunicado disponível para os moradores.",
      type: "info",
      label: "Informação",
      createdAt: "2026-10-28T11:15:00-03:00",
    },
  ],
};

const mockExpensePrediction = {
  predictionId: "pred_dashboard_demo",
  mesDesejado: "2026-11",
  predicaoTotal: 45100,
  moeda: "BRL",
  predictions: [{ category: "TOTAL", predictedAmount: 45100 }],
  versaoModelo: "expenses-v1",
  geradoEm: "2026-10-30T10:00:00-03:00",
};


function serializeMockCharge(charge) {
  const publicCharge = { ...charge };
  delete publicCharge._moradorId;
  return publicCharge;
}

function listMockCharges(request, mineOnly) {
  const user = getMockRequestUser(request);
  if (!user) return unauthorized();

  const url = new URL(request.url);
  let filtered = [...mockCharges];
  if (mineOnly || !isTicketManager(user)) {
    filtered = filtered.filter((charge) => charge._moradorId === user.id);
  }
  const competencia = url.searchParams.get("competencia");
  const status = url.searchParams.get("status");
  const unidadeId = url.searchParams.get("unidadeId");
  if (competencia) filtered = filtered.filter((charge) => charge.competencia === competencia);
  if (status) filtered = filtered.filter((charge) => charge.status === status);
  if (unidadeId) filtered = filtered.filter((charge) => String(charge.unidade.id) === unidadeId);

  filtered.sort((a, b) =>
    String(b.competencia).localeCompare(String(a.competencia)) ||
    Number(b.id) - Number(a.id),
  );
  const page = ticketPagination(filtered, url);
  return HttpResponse.json({
    ...page,
    data: page.data.map(serializeMockCharge),
  });
}

export const handlers = [
  http.post("*/api/auth/login", async ({ request }) => {
    const payload = await request.json();
    const email = String(payload?.email || "").trim().toLowerCase();
    const user = getAllUsers().find((item) => item.email.toLowerCase() === email);

    if (!user || user.senha !== payload?.senha) {
      return HttpResponse.json(
        { message: "E-mail ou senha inválidos." },
        { status: 401 },
      );
    }

    return HttpResponse.json({
      accessToken: `mock-token-${user.id}`,
      user: safeUser(user),
    });
  }),

  http.post("*/api/auth/register", async ({ request }) => {
    const payload = await request.json();
    const nome = String(payload?.nome || "").trim();
    const email = String(payload?.email || "").trim().toLowerCase();
    const senha = String(payload?.senha || "");

    if (nome.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || senha.length < 8) {
      return HttpResponse.json(
        { message: ["Informe nome, e-mail válido e senha com pelo menos 8 caracteres."] },
        { status: 400 },
      );
    }

    if (getAllUsers().some((item) => item.email.toLowerCase() === email)) {
      return HttpResponse.json(
        { message: "Este e-mail já está cadastrado." },
        { status: 409 },
      );
    }

    const registeredUsers = getRegisteredUsers();
    const newUser = {
      id: Date.now(),
      nome,
      email,
      senha,
      perfil: "MORADOR",
    };

    sessionStorage.setItem(registeredUsersKey, JSON.stringify([...registeredUsers, newUser]));

    return HttpResponse.json(safeUser(newUser), { status: 201 });
  }),

  http.get("*/api/auth/me", ({ request }) => {
    const token = request.headers.get("authorization") || "";
    const match = token.match(/^Bearer mock-token-(\d+)$/);
    const user = match ? getAllUsers().find((item) => String(item.id) === match[1]) : null;

    return user
      ? HttpResponse.json(safeUser(user))
      : unauthorized();
  }),

  http.get("*/api/v1/und", ({ request }) => protectedJson(request, paginated(mockUnits))),
  http.get("*/api/v1/und/:id", ({ request, params }) => {
    const unit = mockUnits.find((item) => String(item.id) === String(params.id));
    return unit ? protectedJson(request, { data: unit }) : HttpResponse.json({ message: "Unidade não encontrada." }, { status: 404 });
  }),
  http.post("*/api/v1/und", async ({ request }) => protectedJson(request, { data: await request.json() })),
  http.patch("*/api/v1/und/:id", async ({ request, params }) => protectedJson(request, { data: { id: params.id, ...(await request.json()) } })),

  http.get("*/api/v1/contrato", ({ request }) => protectedJson(request, paginated(mockRentals))),
  http.get("*/api/v1/contrato/:id", ({ request, params }) => protectedJson(request, { data: mockRentals.find((item) => String(item.id) === String(params.id)) || mockRentals[0] })),
  http.post("*/api/v1/contrato", async ({ request }) => protectedJson(request, { data: await request.json() })),
  http.patch("*/api/v1/contrato/:id", async ({ request, params }) => protectedJson(request, { data: { id: params.id, ...(await request.json()) } })),

  http.get("*/api/v1/tickets", ({ request }) => protectedJson(request, paginated(mockTickets))),
  http.get("*/api/v1/tickets/:id", ({ request, params }) => protectedJson(request, { data: mockTickets.find((item) => item.id === params.id) || mockTickets[0] })),
  http.post("*/api/v1/tickets", async ({ request }) => protectedJson(request, { data: await request.json() })),
  http.patch("*/api/v1/tickets/:id", async ({ request, params }) => protectedJson(request, { data: { id: params.id, ...(await request.json()) } })),
  http.post("*/api/v1/tickets/:id/mensagem", async ({ request, params }) => protectedJson(request, { data: { ticketId: params.id, ...(await request.json()) } })),

  http.get("*/api/v1/transacoes", ({ request }) => protectedJson(request, paginated(mockTransactions))),
  http.get("*/api/v1/transacoes/:id", ({ request, params }) => protectedJson(request, { data: mockTransactions.find((item) => item.id === params.id) || mockTransactions[0] })),

  http.get("*/api/v1/cobrancas", ({ request }) => protectedJson(request, paginated(mockCharges))),
  http.get("*/api/v1/cobrancas/:id", ({ request, params }) => protectedJson(request, { data: mockCharges.find((item) => item.id === params.id) || mockCharges[0] })),
  http.post("*/api/v1/cobrancas", async ({ request }) => protectedJson(request, { data: await request.json() })),
  http.post("*/api/v1/cobrancas/:id/pagamentos", async ({ request, params }) => protectedJson(request, { data: { cobrancaId: params.id, status: "PENDENTE", ...(await request.json()) } })),

  http.get("*/api/v1/announcements", ({ request }) => protectedJson(request, paginated(mockAnnouncements))),
  http.post("*/api/v1/announcements", async ({ request }) => protectedJson(request, { data: await request.json() })),
  http.patch("*/api/v1/announcements/:id", async ({ request, params }) => protectedJson(request, { data: { id: params.id, ...(await request.json()) } })),

  http.get("*/api/v1/mensagens", ({ request }) => protectedJson(request, paginated(mockMessages))),
  http.post("*/api/v1/mensagens", async ({ request }) => protectedJson(request, { data: await request.json() })),

  http.get("*/api/v1/notificacoes", ({ request }) => protectedJson(request, paginated(mockNotifications))),
  http.patch("*/api/v1/notificacoes/:id/read", ({ request, params }) => protectedJson(request, { data: { id: params.id, lida: true } })),

  http.post("*/api/v1/chatbot/mensagens", async ({ request }) => {
    const payload = await request.json();
    return protectedJson(request, {
      conversationId: "conv_demo",
      userMessage: payload?.texto || payload?.message || "",
      resposta: "Entendi! Esta é uma resposta demonstrativa do assistente Habita+.",
    });
  }),
  http.get("*/api/v1/chatbot/conversas/:id", ({ request }) => protectedJson(request, { data: mockConversation })),

  http.get("*/api/v1/forecasts/expenses", ({ request }) => protectedJson(request, mockForecast)),
  http.post("*/api/v1/recomendacoes", ({ request }) => protectedJson(request, mockRecommendations)),
  http.post("*/api/v1/nlu/parse", async ({ request }) => {
    if (!isAuthorized(request)) {
      return unauthorized();
    }

    const payload = await request.json();
    const texto = String(payload?.texto || "").trim();

    if (!texto) {
      return HttpResponse.json(
        { message: "O campo texto é obrigatório." },
        { status: 400 },
      );
    }

    const normalizedText = texto.toLocaleLowerCase("pt-BR");
    const isChargeQuestion = /taxa|cobrança|cobranca|boleto|pagamento/.test(normalizedText);
    const isTicketQuestion = /chamado|manutenção|manutencao|reparo|problema/.test(normalizedText);
    const intent = isChargeQuestion
      ? "CONSULT_CHARGE"
      : isTicketQuestion
        ? "CONSULT_TICKET"
        : "GENERAL_QUERY";
    const operation = isChargeQuestion
      ? "LIST_CHARGES"
      : isTicketQuestion
        ? "LIST_TICKETS"
        : "GENERAL_ASSISTANCE";

    return HttpResponse.json({
      intencao: intent,
      confianca: 0.9,
      entities: {
        unitId: payload?.contexto?.unitId || null,
        period: null,
      },
      precisaAutenticacao: true,
      acaoSugerida: {
        type: "CALL_API",
        operation,
      },
      versaoModelo: "nlu-mock-v1",
    });
  }),

  http.get("*/api/finance/dashboard", ({ request }) =>
    protectedJson(request, mockFinanceDashboard),
  ),
  http.get("*/api/predictions/expenses", ({ request }) =>
    protectedJson(request, mockExpensePrediction),
  ),

  // Chamados: os caminhos e payloads seguem o ChamadosController/DTO do backend.
  http.get("*/api/tickets/history", ({ request }) => {
    const user = getMockRequestUser(request);
    if (!user) return unauthorized();
    if (!isTicketManager(user)) {
      return HttpResponse.json({ message: "Apenas síndico ou admin podem consultar o histórico." }, { status: 403 });
    }
    const url = new URL(request.url);
    const equipment = normalizeTicketIdentifier(url.searchParams.get("equipamento"));
    const area = normalizeTicketIdentifier(url.searchParams.get("area"));
    if (!equipment && !area) {
      return HttpResponse.json({ message: "Informe ao menos um filtro: equipamento ou area." }, { status: 400 });
    }
    const filtered = mockMaintenanceTickets.filter((ticket) =>
      (!equipment || normalizeTicketIdentifier(ticket.equipamento) === equipment) &&
      (!area || normalizeTicketIdentifier(ticket.areaComum) === area),
    );
    return HttpResponse.json(ticketPagination(filtered, url));
  }),

  http.get("*/api/tickets/stats", ({ request }) => {
    const user = getMockRequestUser(request);
    if (!user) return unauthorized();
    if (!isTicketManager(user)) {
      return HttpResponse.json({ message: "Apenas síndico ou admin podem consultar as estatísticas." }, { status: 403 });
    }
    const totals = new Map();
    const monthly = new Map();
    mockMaintenanceTickets.forEach((ticket) => {
      const equipment = ticket.equipamento || "nao_informado";
      const month = String(ticket.abertoEm).slice(0, 7);
      totals.set(equipment, (totals.get(equipment) || 0) + 1);
      const key = `${month}|${equipment}`;
      monthly.set(key, (monthly.get(key) || 0) + 1);
    });
    return HttpResponse.json({
      porEquipamento: [...totals].map(([equipamento, total]) => ({ equipamento, total })).sort((a, b) => b.total - a.total),
      porEquipamentoEMes: [...monthly].map(([key, total]) => {
        const [mes, equipamento] = key.split("|");
        return { mes, equipamento, total };
      }),
    });
  }),

  http.get("*/api/tickets", ({ request }) => {
    const user = getMockRequestUser(request);
    if (!user) return unauthorized();
    const url = new URL(request.url);
    let filtered = mockMaintenanceTickets;
    if (!isTicketManager(user)) {
      filtered = filtered.filter((ticket) => ticket.usuario.id === user.id);
    }
    const status = url.searchParams.get("status");
    const category = normalizeTicketIdentifier(url.searchParams.get("categoria"));
    const equipment = normalizeTicketIdentifier(url.searchParams.get("equipamento"));
    if (status) filtered = filtered.filter((ticket) => ticket.status === status);
    if (category) filtered = filtered.filter((ticket) => ticket.categoria === category);
    if (equipment) filtered = filtered.filter((ticket) => ticket.equipamento === equipment);
    return HttpResponse.json(ticketPagination(filtered, url));
  }),

  http.post("*/api/tickets", async ({ request }) => {
    const user = getMockRequestUser(request);
    if (!user) return unauthorized();
    const payload = await request.json();
    const hasUnit = payload?.unidadeId !== undefined && payload?.unidadeId !== null && payload?.unidadeId !== "";
    const hasArea = Boolean(String(payload?.areaComum || "").trim());
    if (hasUnit === hasArea) {
      return HttpResponse.json({ message: "Informe a unidade ou a área comum, não os dois." }, { status: 400 });
    }
    if (!String(payload?.categoria || "").trim() || !String(payload?.equipamento || "").trim() || !String(payload?.descricao || "").trim()) {
      return HttpResponse.json({ message: "Informe a categoria, o equipamento e a descrição do chamado." }, { status: 400 });
    }
    let unit = null;
    if (hasUnit) {
      unit = ticketUnitDirectory.find((item) => item.id === Number(payload.unidadeId));
      if (!unit) return HttpResponse.json({ message: "Unidade não encontrada." }, { status: 404 });
      if (!isTicketManager(user) && !unit.residentIds.includes(user.id)) {
        return HttpResponse.json({ message: "Você não possui vínculo com esta unidade." }, { status: 403 });
      }
    }
    const ticket = {
      id: Math.max(1000, ...mockMaintenanceTickets.map((item) => item.id)) + 1,
      usuario: { id: user.id, nome: user.nome },
      unidade: unit ? { id: unit.id, bloco: unit.bloco, numero: unit.numero } : null,
      areaComum: hasArea ? normalizeTicketIdentifier(payload.areaComum) : null,
      categoria: normalizeTicketIdentifier(payload.categoria),
      equipamento: normalizeTicketIdentifier(payload.equipamento),
      descricao: String(payload.descricao).trim(),
      status: "ABERTO",
      abertoEm: new Date().toISOString(),
      encerradoEm: null,
    };
    mockMaintenanceTickets.unshift(ticket);
    return HttpResponse.json(ticket, { status: 201 });
  }),

  http.patch("*/api/tickets/:id/status", async ({ request, params }) => {
    const user = getMockRequestUser(request);
    if (!user) return unauthorized();
    if (!isTicketManager(user)) {
      return HttpResponse.json({ message: "Apenas síndico ou admin podem alterar o status." }, { status: 403 });
    }
    const ticket = mockMaintenanceTickets.find((item) => String(item.id) === String(params.id));
    if (!ticket) return HttpResponse.json({ message: "Chamado não encontrado" }, { status: 404 });
    const payload = await request.json();
    const nextByStatus = { ABERTO: "EM_ANDAMENTO", EM_ANDAMENTO: "ENCERRADO", ENCERRADO: null };
    const allowed = nextByStatus[ticket.status];
    if (allowed !== payload?.status) {
      const message = allowed == null
        ? "O chamado já foi encerrado e não pode mais mudar de status"
        : `Transição inválida: o chamado está ${ticket.status} e só pode seguir para ${allowed}.`;
      return HttpResponse.json({ message }, { status: 400 });
    }
    ticket.status = payload.status;
    ticket.encerradoEm = payload.status === "ENCERRADO" ? new Date().toISOString() : null;
    return HttpResponse.json(ticket);
  }),

  // FE-08: contratos alinhados aos controllers reais de cobranças e transações.
  http.get("*/api/charges/me", ({ request }) => listMockCharges(request, true)),
  http.get("*/api/charges", ({ request }) => listMockCharges(request, false)),

  http.post("*/api/charges/generate", ({ request }) => {
    const user = getMockRequestUser(request);
    if (!user) return unauthorized();
    if (!isTicketManager(user)) {
      return HttpResponse.json(
        { message: "Apenas síndico ou administrador podem gerar cobranças." },
        { status: 403 },
      );
    }

    const url = new URL(request.url);
    const competencia = url.searchParams.get("competencia") || "";
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia)) {
      return HttpResponse.json(
        { message: "A competência deve estar no formato YYYY-MM." },
        { status: 400 },
      );
    }

    const occupiedUnits = [
      { id: 103, bloco: "B", numero: "103", moradorId: 1 },
      { id: 204, bloco: "A", numero: "204", moradorId: 999 },
    ];
    let criadas = 0;
    for (const unit of occupiedUnits) {
      const exists = mockCharges.some(
        (charge) =>
          charge.unidade.id === unit.id &&
          charge.competencia === competencia,
      );
      if (!exists) {
        const nextId = Math.max(700, ...mockCharges.map((charge) => Number(charge.id))) + 1;
        mockCharges.push({
          id: nextId,
          unidade: { id: unit.id, bloco: unit.bloco, numero: unit.numero },
          competencia,
          valor: 650,
          vencimento: `${competencia}-10`,
          status: "PENDENTE",
          _moradorId: unit.moradorId,
        });
        criadas += 1;
      }
    }

    return HttpResponse.json(
      {
        competencia,
        vencimento: `${competencia}-10`,
        valor: 650,
        totalUnidadesOcupadas: occupiedUnits.length,
        criadas,
        jaExistentes: occupiedUnits.length - criadas,
      },
      { status: 201 },
    );
  }),

  http.post("*/api/charges/:id/checkout", ({ request, params }) => {
    const user = getMockRequestUser(request);
    if (!user) return unauthorized();

    const charge = mockCharges.find(
      (item) => String(item.id) === String(params.id),
    );
    if (!charge) {
      return HttpResponse.json(
        { message: "Cobrança não encontrada." },
        { status: 404 },
      );
    }
    if (!isTicketManager(user) && charge._moradorId !== user.id) {
      return HttpResponse.json(
        { message: "Você não tem permissão para pagar esta cobrança." },
        { status: 403 },
      );
    }
    if (charge.status === "PAGA") {
      return HttpResponse.json(
        { message: "Esta cobrança já foi paga." },
        { status: 409 },
      );
    }

    // No modo mock, simula o webhook confirmando o pagamento.
    // O fluxo real usa Stripe Checkout e o webhook assinado do backend.
    charge.status = "PAGA";
    mockTransactions.unshift({
      id: Date.now(),
      usuarioId: user.id,
      tipo: "RECEITA",
      categoria: "condomínio",
      valor: charge.valor,
      competencia: charge.competencia,
      data: new Date().toISOString().slice(0, 10),
      descricao: `Pagamento de cobrança #${charge.id}`,
    });

    const returnUrl = new URL(
      `/success?cobranca=${charge.id}&mock=1`,
      window.location.origin,
    ).toString();
    return HttpResponse.json({ url: returnUrl }, { status: 201 });
  }),

  http.get("*/api/transactions/monthly-summary", ({ request }) => {
    const user = getMockRequestUser(request);
    if (!user) return unauthorized();
    if (!isTicketManager(user)) {
      return HttpResponse.json(
        { message: "Apenas síndico ou administrador podem consultar o financeiro." },
        { status: 403 },
      );
    }

    const url = new URL(request.url);
    const from = url.searchParams.get("from") || new Date().toISOString().slice(0, 7);
    const to = url.searchParams.get("to") || from;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(from) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(to) || from > to) {
      return HttpResponse.json(
        { message: "Informe um intervalo de competências válido." },
        { status: 400 },
      );
    }

    const result = [];
    let cursor = from;
    while (cursor <= to) {
      const items = mockTransactions.filter(
        (item) => item.competencia === cursor,
      );
      const receitas = items
        .filter((item) => item.tipo === "RECEITA")
        .reduce((sum, item) => sum + Number(item.valor), 0);
      const despesas = items
        .filter((item) => item.tipo === "DESPESA")
        .reduce((sum, item) => sum + Number(item.valor), 0);
      result.push({
        month: cursor,
        receitas: Number(receitas.toFixed(2)),
        despesas: Number(despesas.toFixed(2)),
        saldo: Number((receitas - despesas).toFixed(2)),
      });

      const [year, month] = cursor.split("-").map(Number);
      const next = new Date(Date.UTC(year, month, 1));
      cursor = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
    }
    return HttpResponse.json(result);
  }),

  http.get("*/api/transactions", ({ request }) => {
    const user = getMockRequestUser(request);
    if (!user) return unauthorized();
    if (!isTicketManager(user)) {
      return HttpResponse.json(
        { message: "Apenas síndico ou administrador podem consultar transações." },
        { status: 403 },
      );
    }

    const url = new URL(request.url);
    let filtered = [...mockTransactions];
    const competencia = url.searchParams.get("competencia");
    const tipo = url.searchParams.get("tipo");
    const categoria = url.searchParams.get("categoria");
    if (competencia) filtered = filtered.filter((item) => item.competencia === competencia);
    if (tipo) filtered = filtered.filter((item) => item.tipo === tipo);
    if (categoria) {
      filtered = filtered.filter(
        (item) => item.categoria.toLowerCase() === categoria.toLowerCase(),
      );
    }
    filtered.sort((a, b) => String(b.data).localeCompare(String(a.data)));
    return HttpResponse.json(ticketPagination(filtered, url));
  }),

  http.post("*/api/transactions", async ({ request }) => {
    const user = getMockRequestUser(request);
    if (!user) return unauthorized();
    if (!isTicketManager(user)) {
      return HttpResponse.json(
        { message: "Apenas síndico ou administrador podem criar transações." },
        { status: 403 },
      );
    }

    const payload = await request.json();
    if (!["RECEITA", "DESPESA"].includes(payload?.tipo)) {
      return HttpResponse.json({ message: "O tipo deve ser RECEITA ou DESPESA." }, { status: 400 });
    }
    const amount = Number(payload?.valor);
    if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100) {
      return HttpResponse.json({ message: "O valor deve ser maior que zero e ter no máximo duas casas decimais." }, { status: 400 });
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(payload?.competencia || ""))) {
      return HttpResponse.json({ message: "A competência deve estar no formato YYYY-MM." }, { status: 400 });
    }
    if (!String(payload?.categoria || "").trim() || !String(payload?.data || "").trim()) {
      return HttpResponse.json({ message: "Informe categoria e data do lançamento." }, { status: 400 });
    }
    const allowedExpenseCategories = ["água", "energia", "limpeza", "manutenção", "salários", "outros"];
    if (payload.tipo === "DESPESA" && !allowedExpenseCategories.includes(String(payload.categoria).trim().toLowerCase())) {
      return HttpResponse.json(
        { message: "A categoria da despesa deve ser água, energia, limpeza, manutenção, salários ou outros." },
        { status: 400 },
      );
    }

    const transaction = {
      id: Math.max(500, ...mockTransactions.map((item) => Number(item.id))) + 1,
      usuarioId: user.id,
      tipo: payload.tipo,
      categoria: String(payload.categoria).trim().toLowerCase(),
      valor: amount,
      competencia: payload.competencia,
      data: payload.data,
      descricao: payload.descricao ? String(payload.descricao).trim() : null,
    };
    mockTransactions.unshift(transaction);
    return HttpResponse.json(transaction, { status: 201 });
  }),

  // FE-09: feed, meus anúncios, detalhes, visualizações e recomendações.
  http.get("*/api/listings/categories", ({ request }) => {
    if (!isAuthorized(request)) return unauthorized();
    return HttpResponse.json(["MOVEIS", "ELETRONICOS", "UTENSILIOS", "ESPORTE", "OUTROS"]);
  }),
  http.get("*/api/listings/mine", ({ request }) => {
    const user = getMockRequestUser(request);
    if (!user) return unauthorized();
    return HttpResponse.json(mockListings.filter((item) => listingOwner(item) === Number(user.id)));
  }),
  http.get("*/api/listings", ({ request }) => {
    if (!isAuthorized(request)) return unauthorized();
    const url = new URL(request.url);
    let rows = [...mockListings];
    const category = url.searchParams.get("categoria");
    const status = url.searchParams.get("status");
    const q = String(url.searchParams.get("q") || "").trim().toLocaleLowerCase("pt-BR");
    const min = url.searchParams.get("precoMin");
    const max = url.searchParams.get("precoMax");
    if (category) rows = rows.filter((item) => item.categoria === category);
    if (status) rows = rows.filter((item) => item.status === status);
    if (min !== null && min !== "") rows = rows.filter((item) => Number(item.preco) >= Number(min));
    if (max !== null && max !== "") rows = rows.filter((item) => Number(item.preco) <= Number(max));
    if (q) rows = rows.filter((item) => `${item.titulo} ${item.descricao}`.toLocaleLowerCase("pt-BR").includes(q));
    rows.sort((a, b) => Number(b.id) - Number(a.id));
    return HttpResponse.json(listingPagination(rows, url));
  }),
  http.post("*/api/listings", async ({ request }) => {
    const user = getMockRequestUser(request);
    if (!user) return unauthorized();
    const payload = await request.json();
    if (String(payload?.titulo || "").trim().length < 3 || String(payload?.descricao || "").trim().length < 5 || !["MOVEIS", "ELETRONICOS", "UTENSILIOS", "ESPORTE", "OUTROS"].includes(payload?.categoria) || !Number.isFinite(Number(payload?.preco)) || Number(payload.preco) <= 0) {
      return HttpResponse.json({ message: "Confira título, descrição, categoria e preço do anúncio." }, { status: 400 });
    }
    const listing = {
      id: Math.max(800, ...mockListings.map((item) => Number(item.id))) + 1,
      titulo: String(payload.titulo).trim(),
      descricao: String(payload.descricao).trim(),
      categoria: payload.categoria,
      preco: Number(payload.preco),
      status: "DISPONIVEL",
      imagemUrl: payload.imagemUrl || null,
      vendedor: { id: user.id, nome: user.nome },
      visualizacoes: 0,
    };
    mockListings.unshift(listing);
    getAllUsers().filter((item) => Number(item.id) !== Number(user.id)).forEach((item) => appendMockNotification(item.id, "ANUNCIO", `Novo anúncio: ${listing.titulo}`, listing.id));
    return HttpResponse.json(listing, { status: 201 });
  }),
  http.post("*/api/listings/:id/view", ({ request, params }) => {
    const user = getMockRequestUser(request);
    if (!user) return unauthorized();
    const listing = mockListings.find((item) => String(item.id) === String(params.id));
    if (!listing) return HttpResponse.json({ message: "Anúncio não encontrado." }, { status: 404 });
    listing.visualizacoes = Number(listing.visualizacoes || 0) + 1;
    return HttpResponse.json({ message: "Visualização processada com sucesso." });
  }),
  http.get("*/api/listings/:id", ({ request, params }) => {
    if (!isAuthorized(request)) return unauthorized();
    const listing = mockListings.find((item) => String(item.id) === String(params.id));
    if (!listing) return HttpResponse.json({ message: "Anúncio não encontrado." }, { status: 404 });
    return HttpResponse.json({ ...listing, vendedor: { ...listing.vendedor, unidade: { bloco: "B", numero: "103" } } });
  }),
  http.patch("*/api/listings/:id/status", async ({ request, params }) => {
    const user = getMockRequestUser(request);
    if (!user) return unauthorized();
    const listing = mockListings.find((item) => String(item.id) === String(params.id));
    if (!listing) return HttpResponse.json({ message: "Anúncio não encontrado." }, { status: 404 });
    if (listingOwner(listing) !== Number(user.id)) return listingForbidden();
    const payload = await request.json();
    if (!["DISPONIVEL", "VENDIDO"].includes(payload?.status)) return HttpResponse.json({ message: "Status de anúncio inválido." }, { status: 400 });
    listing.status = payload.status;
    return HttpResponse.json(listing);
  }),
  http.patch("*/api/listings/:id", async ({ request, params }) => {
    const user = getMockRequestUser(request);
    if (!user) return unauthorized();
    const listing = mockListings.find((item) => String(item.id) === String(params.id));
    if (!listing) return HttpResponse.json({ message: "Anúncio não encontrado." }, { status: 404 });
    if (listingOwner(listing) !== Number(user.id)) return listingForbidden();
    const payload = await request.json();
    Object.assign(listing, payload, { preco: payload.preco === undefined ? listing.preco : Number(payload.preco) });
    return HttpResponse.json(listing);
  }),
  http.delete("*/api/listings/:id", ({ request, params }) => {
    const user = getMockRequestUser(request);
    if (!user) return unauthorized();
    const index = mockListings.findIndex((item) => String(item.id) === String(params.id));
    if (index < 0) return HttpResponse.json({ message: "Anúncio não encontrado." }, { status: 404 });
    if (listingOwner(mockListings[index]) !== Number(user.id)) return listingForbidden();
    mockListings.splice(index, 1);
    return HttpResponse.json({ message: "Anúncio removido com sucesso." });
  }),
  http.get("*/api/residents/me/recommendations", ({ request }) => {
    if (!isAuthorized(request)) return unauthorized();
    const user = getMockRequestUser(request);
    const recommendations = mockListings
      .filter((item) => item.status === "DISPONIVEL" && listingOwner(item) !== Number(user?.id))
      .sort((a, b) => Number(b.visualizacoes || 0) - Number(a.visualizacoes || 0))
      .slice(0, 3)
      .map((item, index) => ({
        listingId: item.id,
        score: Number((0.95 - index * 0.08).toFixed(2)),
        anuncio: { titulo: item.titulo, descricao: item.descricao, categoria: item.categoria, preco: item.preco, imagemUrl: item.imagemUrl, vendedor: { nome: item.vendedor.nome } },
      }));
    return HttpResponse.json({ cluster: 1, recommendations });
  }),

  // FE-09: inbox, conversa do anúncio, envio e leitura de mensagens.
  http.get("*/api/messages/inbox", ({ request }) => {
    const user = getMockRequestUser(request);
    if (!user) return unauthorized();
    const groups = new Map();
    mockListingMessages
      .filter((message) => Number(message.remetenteId) === Number(user.id) || Number(message.destinatarioId) === Number(user.id))
      .forEach((message) => {
        const otherId = Number(message.remetenteId) === Number(user.id) ? Number(message.destinatarioId) : Number(message.remetenteId);
        const key = `${message.anuncioId}-${otherId}`;
        const current = groups.get(key);
        if (!current || new Date(message.criadaEm) > new Date(current.ultimaMensagem.criadaEm)) {
          const listing = mockListings.find((item) => Number(item.id) === Number(message.anuncioId));
          const otherUser = getAllUsers().find((item) => Number(item.id) === otherId);
          groups.set(key, {
            anuncioId: Number(message.anuncioId),
            anuncioTitulo: listing?.titulo || "Anúncio removido",
            outroUsuario: { id: otherId, nome: otherUser?.nome || `Usuário ${otherId}` },
            ultimaMensagem: { id: message.id, texto: message.texto, remetenteId: message.remetenteId, criadaEm: message.criadaEm },
            naoLidas: mockListingMessages.filter((item) => Number(item.anuncioId) === Number(message.anuncioId) && Number(item.remetenteId) === otherId && Number(item.destinatarioId) === Number(user.id) && !item.lida).length,
          });
        }
      });
    return HttpResponse.json([...groups.values()].sort((a, b) => new Date(b.ultimaMensagem.criadaEm) - new Date(a.ultimaMensagem.criadaEm)));
  }),
  http.get("*/api/listings/:id/messages", ({ request, params }) => {
    const user = getMockRequestUser(request);
    if (!user) return unauthorized();
    const listing = mockListings.find((item) => String(item.id) === String(params.id));
    if (!listing) return HttpResponse.json({ message: "Anúncio não encontrado." }, { status: 404 });
    const url = new URL(request.url);
    const isOwner = listingOwner(listing) === Number(user.id);
    const otherId = isOwner ? Number(url.searchParams.get("usuarioId")) : listingOwner(listing);
    if (isOwner && !otherId) return HttpResponse.json({ message: "Informe o usuarioId (o comprador) para ver a conversa." }, { status: 400 });
    const rows = mockListingMessages.filter((item) => Number(item.anuncioId) === Number(listing.id) && ((Number(item.remetenteId) === Number(user.id) && Number(item.destinatarioId) === otherId) || (Number(item.remetenteId) === otherId && Number(item.destinatarioId) === Number(user.id))));
    return HttpResponse.json(rows.sort((a, b) => new Date(a.criadaEm) - new Date(b.criadaEm)));
  }),
  http.post("*/api/listings/:id/messages", async ({ request, params }) => {
    const user = getMockRequestUser(request);
    if (!user) return unauthorized();
    const listing = mockListings.find((item) => String(item.id) === String(params.id));
    if (!listing) return HttpResponse.json({ message: "Anúncio não encontrado." }, { status: 404 });
    const payload = await request.json();
    const text = String(payload?.texto || "").trim();
    if (!text || text.length > 2000) return HttpResponse.json({ message: "O texto da mensagem é obrigatório e deve ter até 2000 caracteres." }, { status: 400 });
    const sellerId = listingOwner(listing);
    let recipientId = sellerId;
    if (Number(user.id) === sellerId) {
      recipientId = Number(payload?.destinatarioId);
      const buyerAlreadyMessaged = mockListingMessages.some((item) => Number(item.anuncioId) === Number(listing.id) && Number(item.remetenteId) === recipientId && Number(item.destinatarioId) === sellerId);
      if (!recipientId || recipientId === sellerId || !buyerAlreadyMessaged) return HttpResponse.json({ message: "Informe um comprador que já iniciou uma conversa neste anúncio." }, { status: 400 });
    }
    const message = { id: Math.max(9100, ...mockListingMessages.map((item) => Number(item.id))) + 1, anuncioId: Number(listing.id), remetenteId: Number(user.id), destinatarioId: recipientId, texto: text, lida: false, criadaEm: new Date().toISOString() };
    mockListingMessages.push(message);
    appendMockNotification(recipientId, "MENSAGEM", `Nova mensagem de ${user.nome} sobre "${listing.titulo}"`, listing.id);
    return HttpResponse.json(message, { status: 201 });
  }),
  http.patch("*/api/messages/:id/read", ({ request, params }) => {
    const user = getMockRequestUser(request);
    if (!user) return unauthorized();
    const message = mockListingMessages.find((item) => String(item.id) === String(params.id) && Number(item.destinatarioId) === Number(user.id));
    if (!message) return HttpResponse.json({ message: "Mensagem não encontrada." }, { status: 404 });
    message.lida = true;
    return HttpResponse.json(message);
  }),

  // FE-11: notificações paginadas e controle de leitura por usuário.
  http.get("*/api/notifications/unread-count", ({ request }) => {
    const user = getMockRequestUser(request);
    if (!user) return unauthorized();
    return HttpResponse.json({ naoLidas: mockMarketplaceNotifications.filter((item) => Number(item.usuarioId) === Number(user.id) && !item.lida).length });
  }),
  http.get("*/api/notifications", ({ request }) => {
    const user = getMockRequestUser(request);
    if (!user) return unauthorized();
    const url = new URL(request.url);
    let rows = mockMarketplaceNotifications.filter((item) => Number(item.usuarioId) === Number(user.id));
    if (url.searchParams.get("apenasNaoLidas") === "true") rows = rows.filter((item) => !item.lida);
    rows.sort((a, b) => new Date(b.criadaEm) - new Date(a.criadaEm));
    const pagina = Math.max(1, Number(url.searchParams.get("pagina") || 1));
    const limite = Math.max(1, Math.min(100, Number(url.searchParams.get("limite") || 20)));
    const start = (pagina - 1) * limite;
    return HttpResponse.json({
      data: rows.slice(start, start + limite).map((item) => {
        const publicItem = { ...item };
        delete publicItem.usuarioId;
        return publicItem;
      }),
      meta: { pagina, limite, total: rows.length, totalPaginas: Math.max(1, Math.ceil(rows.length / limite)) },
    });
  }),
  http.patch("*/api/notifications/:id/read", ({ request, params }) => {
    const user = getMockRequestUser(request);
    if (!user) return unauthorized();
    const item = mockMarketplaceNotifications.find((row) => String(row.id) === String(params.id) && Number(row.usuarioId) === Number(user.id));
    if (!item) return HttpResponse.json({ message: "Notificação não encontrada." }, { status: 404 });
    item.lida = true;
    const publicItem = { ...item };
    delete publicItem.usuarioId;
    return HttpResponse.json(publicItem);
  }),
  http.patch("*/api/notifications/read-all", ({ request }) => {
    const user = getMockRequestUser(request);
    if (!user) return unauthorized();
    let updated = 0;
    mockMarketplaceNotifications.forEach((item) => {
      if (Number(item.usuarioId) === Number(user.id) && !item.lida) { item.lida = true; updated += 1; }
    });
    return HttpResponse.json({ atualizadas: updated });
  }),

];
