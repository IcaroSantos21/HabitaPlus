import api from "./api";

const unitsService = {
  async list(params = {}) {
    const { data } = await api.get("/v1/und", { params });
    return data;
  },

  async get(id) {
    const { data } = await api.get(`/v1/und/${id}`);
    return data;
  },

  async create(payload) {
    const { data } = await api.post("/v1/und", payload);
    return data;
  },

  async update(id, payload) {
    const { data } = await api.patch(`/v1/und/${id}`, payload);
    return data;
  },
};

export default unitsService;
