import api from "./api";

const ticketsService = {
  async list(params = {}) {
    const { data } = await api.get("/tickets", { params });
    return data;
  },

  async create(payload) {
    const { data } = await api.post("/tickets", payload);
    return data;
  },

  async updateStatus(id, payload) {
    const { data } = await api.patch(`/tickets/${id}/status`, payload);
    return data;
  },

  async history(params = {}) {
    const { data } = await api.get("/tickets/history", { params });
    return data;
  },

  async stats() {
    const { data } = await api.get("/tickets/stats");
    return data;
  },
};

export default ticketsService;
