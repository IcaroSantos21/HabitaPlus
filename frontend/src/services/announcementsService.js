import api from "./api";

const announcementsService = {
  async list(params = {}) {
    const { data } = await api.get("/announcements", { params });
    return data;
  },

  async create(payload) {
    const { data } = await api.post("/announcements", payload);
    return data;
  },

  async update(id, payload) {
    const { data } = await api.patch(`/announcements/${id}`, payload);
    return data;
  },
};

export default announcementsService;
