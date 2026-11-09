import api from "./api";

const messagesService = {
  async inbox() {
    const { data } = await api.get("/messages/inbox");
    return data;
  },
  async conversation(listingId, otherUserId) {
    const params = otherUserId ? { usuarioId: otherUserId } : {};
    const { data } = await api.get(`/listings/${listingId}/messages`, { params });
    return data;
  },
  async send(listingId, payload) {
    const { data } = await api.post(`/listings/${listingId}/messages`, payload);
    return data;
  },
  async markAsRead(id) {
    const { data } = await api.patch(`/messages/${id}/read`);
    return data;
  },
};

export default messagesService;
