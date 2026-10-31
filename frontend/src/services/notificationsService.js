import api from "./api";

const notificationsService = {
  async list(params = {}) {
    const { data } = await api.get("/v1/notificacoes", { params });
    return data;
  },

  async markAsRead(id) {
    const { data } = await api.patch(`/v1/notificacoes/${id}/read`);
    return data;
  },
};

export default notificationsService;
