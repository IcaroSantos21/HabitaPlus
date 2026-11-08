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
];
