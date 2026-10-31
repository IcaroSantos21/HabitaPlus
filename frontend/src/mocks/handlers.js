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
  { id: "tra_001", descricao: "Manutenção do elevador", tipo: "DESPESA", valor: 920, data: "2026-10-10" },
  { id: "tra_002", descricao: "Taxa condominial", tipo: "RECEITA", valor: 650, data: "2026-10-12" },
];

const mockCharges = [
  { id: "chg_001", descricao: "Taxa condominial - outubro", valor: 650, status: "PENDENTE", vencimento: "2026-10-30" },
  { id: "chg_002", descricao: "Fundo de reserva", valor: 90, status: "PAGA", vencimento: "2026-10-05" },
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
];
