import api from "./api";

const ticketsService = {
  async list(params = {}) {
    const { data } = await api.get("/v1/tickets", { params });
    return data;
  },

  async get(id) {
    const { data } = await api.get(`/v1/tickets/${id}`);
    return data;
  },

  async create(payload) {
    const { data } = await api.post("/v1/tickets", payload);
    return data;
  },

  async update(id, payload) {
    const { data } = await api.patch(`/v1/tickets/${id}`, payload);
    return data;
  },

  async sendMessage(id, payload) {
    const { data } = await api.post(`/v1/tickets/${id}/mensagem`, payload);
    return data;
  },
};

export default ticketsService;
