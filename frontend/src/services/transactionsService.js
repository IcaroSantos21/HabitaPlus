import api from "./api";

const transactionsService = {
  async list(params = {}) {
    const { data } = await api.get("/v1/transacoes", { params });
    return data;
  },

  async get(id) {
    const { data } = await api.get(`/v1/transacoes/${id}`);
    return data;
  },
};

export default transactionsService;
