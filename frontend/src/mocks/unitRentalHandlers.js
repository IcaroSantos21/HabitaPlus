import { http, HttpResponse } from "msw";

// Massa de dados local para demonstrar unidades, vínculos e contratos de locação.
const mockResidents = [
  {
    id: 1,
    nome: "Marina Morador",
    email: "morador@habitaplus.com",
    perfil: "MORADOR",
  },
  {
    id: 4,
    nome: "João Pedro",
    email: "joao.pedro@habitaplus.com",
    perfil: "MORADOR",
  },
];

function dateInDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
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
    moradores: [],
  },
  {
    id: 103,
    numero: "103",
    bloco: "B",
    quartos: 3,
    areaM2: 82,
    valorAluguelSugerido: 2100,
    disponivelLocacao: false,
    moradores: [
      {
        usuarioId: 1,
        nome: "Marina Morador",
        email: "morador@habitaplus.com",
        tipo: "INQUILINO",
      },
    ],
  },
];

const mockRentals = [
  {
    id: 1,
    unidade: mockUnits[1],
    locatario: mockResidents[0],
    valorMensal: 2100,
    inicio: "2026-01-01",
    fim: dateInDays(15),
    status: "A_VENCER",
  },
];

function isAuthorized(request) {
  return Boolean(request.headers.get("authorization")?.startsWith("Bearer "));
}

function unauthorized() {
  return HttpResponse.json(
    { message: "Sessão ausente ou expirada. Entre novamente." },
    { status: 401 },
  );
}

function protectedJson(request, payload, status = 200) {
  return isAuthorized(request)
    ? HttpResponse.json(payload, { status })
    : unauthorized();
}

function protectedNoContent(request) {
  return isAuthorized(request) ? new HttpResponse(null, { status: 204 }) : unauthorized();
}

function todayDate() {
  return dateInDays(0);
}

function computeStatus(contract) {
  if (contract.status === "ENCERRADO") return "ENCERRADO";
  if (!contract.fim) return "ATIVO";
  const endDate = new Date(`${String(contract.fim).slice(0, 10)}T00:00:00`);
  const today = new Date(`${todayDate()}T00:00:00`);
  const remainingDays = Math.ceil((endDate.getTime() - today.getTime()) / 86400000);
  if (remainingDays < 0) return "ENCERRADO";
  if (remainingDays <= 30) return "A_VENCER";
  return "ATIVO";
}

function listPayload(items, url) {
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") || 20)));
  const start = (page - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    total: items.length,
    page,
    limit,
    totalPages: Math.ceil(items.length / limit),
    meta: { page, limit, total: items.length, totalPages: Math.ceil(items.length / limit) },
  };
}

function findUnit(id) {
  return mockUnits.find((unit) => String(unit.id) === String(id));
}

function findResident(id) {
  return mockResidents.find((resident) => String(resident.id) === String(id));
}

function listActiveContracts(unitId) {
  return mockRentals.filter(
    (contract) =>
      String(contract.unidade?.id) === String(unitId) &&
      computeStatus(contract) !== "ENCERRADO",
  );
}

export const unitRentalHandlers = [
  http.get("*/api/units/available", ({ request }) => {
    if (!isAuthorized(request)) return unauthorized();
    const url = new URL(request.url);
    const block = url.searchParams.get("bloco");
    const rooms = url.searchParams.get("quartos");
    const maxPrice = url.searchParams.get("valorMax");
    const available = mockUnits.filter((unit) => {
      if (!unit.disponivelLocacao) return false;
      if (block && unit.bloco.toLowerCase() !== block.toLowerCase()) return false;
      if (rooms && Number(unit.quartos) !== Number(rooms)) return false;
      if (maxPrice && Number(unit.valorAluguelSugerido) > Number(maxPrice)) return false;
      return true;
    });
    return HttpResponse.json(available);
  }),

  http.get("*/api/units", ({ request }) => {
    if (!isAuthorized(request)) return unauthorized();
    const url = new URL(request.url);
    return HttpResponse.json(listPayload(mockUnits, url));
  }),

  http.post("*/api/units", async ({ request }) => {
    if (!isAuthorized(request)) return unauthorized();
    const payload = await request.json();
    const duplicate = mockUnits.some(
      (unit) =>
        unit.bloco.toLowerCase() === String(payload.bloco).trim().toLowerCase() &&
        unit.numero.toLowerCase() === String(payload.numero).trim().toLowerCase(),
    );
    if (duplicate) {
      return HttpResponse.json(
        { message: "Já existe uma unidade neste bloco e número." },
        { status: 409 },
      );
    }
    const unit = {
      id: Date.now(),
      ...payload,
      bloco: String(payload.bloco).trim(),
      numero: String(payload.numero).trim(),
      moradores: [],
    };
    mockUnits.push(unit);
    return protectedJson(request, unit, 201);
  }),

  http.get("*/api/units/:id/rentals", ({ request, params }) => {
    if (!isAuthorized(request)) return unauthorized();
    if (!findUnit(params.id)) {
      return HttpResponse.json({ message: "Unidade não encontrada." }, { status: 404 });
    }
    const rentals = mockRentals
      .filter((contract) => String(contract.unidade?.id) === String(params.id))
      .map((contract) => ({ ...contract, status: computeStatus(contract) }));
    return HttpResponse.json(rentals);
  }),

  http.get("*/api/units/:id", ({ request, params }) => {
    if (!isAuthorized(request)) return unauthorized();
    const unit = findUnit(params.id);
    return unit
      ? HttpResponse.json(unit)
      : HttpResponse.json({ message: "Unidade não encontrada." }, { status: 404 });
  }),

  http.patch("*/api/units/:id", async ({ request, params }) => {
    if (!isAuthorized(request)) return unauthorized();
    const unit = findUnit(params.id);
    if (!unit) {
      return HttpResponse.json({ message: "Unidade não encontrada." }, { status: 404 });
    }
    const payload = await request.json();
    const duplicate = mockUnits.some(
      (candidate) =>
        candidate.id !== unit.id &&
        candidate.bloco.toLowerCase() === String(payload.bloco ?? unit.bloco).trim().toLowerCase() &&
        candidate.numero.toLowerCase() === String(payload.numero ?? unit.numero).trim().toLowerCase(),
    );
    if (duplicate) {
      return HttpResponse.json(
        { message: "Já existe uma unidade neste bloco e número." },
        { status: 409 },
      );
    }
    Object.assign(unit, payload);
    return HttpResponse.json(unit);
  }),

  http.delete("*/api/units/:id", ({ request, params }) => {
    if (!isAuthorized(request)) return unauthorized();
    const unitIndex = mockUnits.findIndex((unit) => String(unit.id) === String(params.id));
    if (unitIndex < 0) {
      return HttpResponse.json({ message: "Unidade não encontrada." }, { status: 404 });
    }
    if (listActiveContracts(params.id).length > 0) {
      return HttpResponse.json(
        { message: "Não é possível excluir uma unidade com contrato ativo." },
        { status: 409 },
      );
    }
    mockUnits.splice(unitIndex, 1);
    return protectedNoContent(request);
  }),

  http.post("*/api/units/:id/residents", async ({ request, params }) => {
    if (!isAuthorized(request)) return unauthorized();
    const unit = findUnit(params.id);
    if (!unit) {
      return HttpResponse.json({ message: "Unidade não encontrada." }, { status: 404 });
    }
    const payload = await request.json();
    const resident = findResident(payload.usuarioId);
    if (!resident) {
      return HttpResponse.json({ message: "Morador não encontrado." }, { status: 404 });
    }
    if (unit.moradores.some((item) => String(item.usuarioId) === String(resident.id))) {
      return HttpResponse.json(
        { message: "Este morador já está vinculado à unidade." },
        { status: 409 },
      );
    }
    const link = {
      id: Date.now(),
      usuarioId: resident.id,
      nome: resident.nome,
      email: resident.email,
      tipo: payload.tipo,
    };
    unit.moradores.push(link);
    return HttpResponse.json(link, { status: 201 });
  }),

  http.delete("*/api/units/:id/residents/:usuarioId", ({ request, params }) => {
    if (!isAuthorized(request)) return unauthorized();
    const unit = findUnit(params.id);
    if (!unit) {
      return HttpResponse.json({ message: "Unidade não encontrada." }, { status: 404 });
    }
    const index = unit.moradores.findIndex(
      (resident) => String(resident.usuarioId) === String(params.usuarioId),
    );
    if (index < 0) {
      return HttpResponse.json({ message: "Vínculo de morador não encontrado." }, { status: 404 });
    }
    unit.moradores.splice(index, 1);
    return protectedNoContent(request);
  }),

  http.get("*/api/rentals", ({ request }) => {
    if (!isAuthorized(request)) return unauthorized();
    const url = new URL(request.url);
    const contracts = mockRentals.map((contract) => ({
      ...contract,
      status: computeStatus(contract),
    }));
    return HttpResponse.json(listPayload(contracts, url));
  }),

  http.get("*/api/rentals/:id", ({ request, params }) => {
    if (!isAuthorized(request)) return unauthorized();
    const contract = mockRentals.find((item) => String(item.id) === String(params.id));
    return contract
      ? HttpResponse.json({ ...contract, status: computeStatus(contract) })
      : HttpResponse.json({ message: "Contrato de locação não encontrado." }, { status: 404 });
  }),

  http.post("*/api/rentals", async ({ request }) => {
    if (!isAuthorized(request)) return unauthorized();
    const payload = await request.json();
    const unit = findUnit(payload.unidadeId);
    if (!unit) {
      return HttpResponse.json({ message: "Unidade não encontrada." }, { status: 404 });
    }
    const resident = findResident(payload.locatarioId);
    if (!resident) {
      return HttpResponse.json({ message: "Locatário não encontrado." }, { status: 404 });
    }
    if (payload.fim && payload.fim <= payload.inicio) {
      return HttpResponse.json(
        { message: "A data final deve ser posterior à data de início." },
        { status: 400 },
      );
    }
    if (listActiveContracts(unit.id).length > 0 || !unit.disponivelLocacao) {
      return HttpResponse.json(
        { message: "Já existe um contrato ativo para esta unidade." },
        { status: 409 },
      );
    }
    const contract = {
      id: Date.now(),
      unidade: unit,
      locatario: resident,
      valorMensal: Number(payload.valorMensal),
      inicio: payload.inicio,
      fim: payload.fim || null,
      status: "ATIVO",
    };
    mockRentals.push(contract);
    unit.disponivelLocacao = false;
    return HttpResponse.json({ ...contract, status: computeStatus(contract) }, { status: 201 });
  }),

  http.patch("*/api/rentals/:id", async ({ request, params }) => {
    if (!isAuthorized(request)) return unauthorized();
    const contract = mockRentals.find((item) => String(item.id) === String(params.id));
    if (!contract) {
      return HttpResponse.json({ message: "Contrato de locação não encontrado." }, { status: 404 });
    }
    const payload = await request.json();
    Object.assign(contract, payload);
    contract.status = computeStatus(contract);
    return HttpResponse.json(contract);
  }),

  http.patch("*/api/rentals/:id/end", async ({ request, params }) => {
    if (!isAuthorized(request)) return unauthorized();
    const contract = mockRentals.find((item) => String(item.id) === String(params.id));
    if (!contract) {
      return HttpResponse.json({ message: "Contrato de locação não encontrado." }, { status: 404 });
    }
    if (computeStatus(contract) === "ENCERRADO") {
      return HttpResponse.json({ message: "Este contrato já está encerrado." }, { status: 409 });
    }
    const payload = await request.json();
    const finalDate = payload.fim || todayDate();
    if (finalDate < String(contract.inicio).slice(0, 10)) {
      return HttpResponse.json(
        { message: "A data de encerramento deve ser posterior à data de início." },
        { status: 400 },
      );
    }
    contract.fim = finalDate;
    contract.status = "ENCERRADO";
    const otherActive = listActiveContracts(contract.unidade.id).some(
      (item) => item.id !== contract.id,
    );
    if (!otherActive) contract.unidade.disponivelLocacao = true;
    return HttpResponse.json({ ...contract, status: "ENCERRADO" });
  }),
];
