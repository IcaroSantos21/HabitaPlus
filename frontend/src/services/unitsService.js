import api from "./api";

const unitsService = {
  async list(params = {}) {
    const { data } = await api.get("/units", { params });
    return data;
  },

  async listAvailable(params = {}) {
    const { data } = await api.get("/units/available", { params });
    return data;
  },

  async get(id) {
    const { data } = await api.get(`/units/${id}`);
    return data;
  },

  async listRentals(id) {
    const { data } = await api.get(`/units/${id}/rentals`);
    return data;
  },

  async create(payload) {
    const { data } = await api.post("/units", payload);
    return data;
  },

  async update(id, payload) {
    const { data } = await api.patch(`/units/${id}`, payload);
    return data;
  },

  async remove(id) {
    const { data } = await api.delete(`/units/${id}`);
    return data;
  },

  async linkResident(id, payload) {
    const { data } = await api.post(`/units/${id}/residents`, payload);
    return data;
  },

  async unlinkResident(id, usuarioId) {
    const { data } = await api.delete(`/units/${id}/residents/${usuarioId}`);
    return data;
  },
};

export default unitsService;
