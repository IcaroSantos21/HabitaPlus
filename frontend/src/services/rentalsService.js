import api from "./api";

const rentalsService = {
  async list(params = {}) {
    const { data } = await api.get("/rentals", { params });
    return data;
  },

  async get(id) {
    const { data } = await api.get(`/rentals/${id}`);
    return data;
  },

  async create(payload) {
    const { data } = await api.post("/rentals", payload);
    return data;
  },

  async update(id, payload) {
    const { data } = await api.patch(`/rentals/${id}`, payload);
    return data;
  },

  async end(id, payload = {}) {
    const { data } = await api.patch(`/rentals/${id}/end`, payload);
    return data;
  },
};

export default rentalsService;
