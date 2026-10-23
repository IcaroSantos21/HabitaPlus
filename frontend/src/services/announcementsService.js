import api from "./api";

const announcementsService = {
  async list(params = {}) {
    const { data } = await api.get("/v1/announcements", { params });
    return data;
  },

  async create(payload) {
    const { data } = await api.post("/v1/announcements", payload);
    return data;
  },

  async update(id, payload) {
    const { data } = await api.patch(`/v1/announcements/${id}`, payload);
    return data;
  },
};

export default announcementsService;
