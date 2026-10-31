import api from "./api";

const defaultRequest = {
  userId: "usr_demo",
  context: {
    unitId: "unid_001",
    cargo: "RESIDENT",
    interesses: ["MAINTENANCE", "ANNOUNCEMENTS"],
    atividadeRecente: ["OPENED_TICKET"],
  },
  limite: 3,
};

const recommendationsService = {
  async get(payload = defaultRequest) {
    const { data } = await api.post("/v1/recomendacoes", payload);
    return data;
  },
};

export default recommendationsService;
