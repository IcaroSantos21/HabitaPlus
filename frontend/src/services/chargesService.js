import api from "./api";

const chargesService = {
  async list(params = {}) {
    const { data } = await api.get("/v1/cobrancas", { params });
    return data;
  },

  async get(id) {
    const { data } = await api.get(`/v1/cobrancas/${id}`);
    return data;
  },

  async create(payload) {
    const { data } = await api.post("/v1/cobrancas", payload);
    return data;
  },

  async pay(id, payload = {}) {
    const { data } = await api.post(`/v1/cobrancas/${id}/pagamentos`, payload);
    return data;
  },
};

export default chargesService;
