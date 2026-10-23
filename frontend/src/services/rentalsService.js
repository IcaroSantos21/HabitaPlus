import api from "./api";

const rentalsService = {
  async list(params = {}) {
    const { data } = await api.get("/v1/contrato", { params });
    return data;
  },

  async get(id) {
    const { data } = await api.get(`/v1/contrato/${id}`);
    return data;
  },

  async create(payload) {
    const { data } = await api.post("/v1/contrato", payload);
    return data;
  },

  async update(id, payload) {
    const { data } = await api.patch(`/v1/contrato/${id}`, payload);
    return data;
  },
};

export default rentalsService;
