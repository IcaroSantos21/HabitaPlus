import api from "./api";

const notificationsService = {
  async list(params = {}) {
    const { data } = await api.get("/notifications", { params });
    return data;
  },
  async unreadCount() {
    const { data } = await api.get("/notifications/unread-count");
    return data;
  },
  async markAsRead(id) {
    const { data } = await api.patch(`/notifications/${id}/read`);
    return data;
  },
  async markAllAsRead() {
    const { data } = await api.patch("/notifications/read-all");
    return data;
  },
};

export default notificationsService;
