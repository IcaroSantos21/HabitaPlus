import api from "./api";

const marketplaceService = {
  async list(params = {}) {
    const { data } = await api.get("/listings", { params });
    return data;
  },
  async categories() {
    const { data } = await api.get("/listings/categories");
    return data;
  },
  async mine() {
    const { data } = await api.get("/listings/mine");
    return data;
  },
  async getById(id) {
    const { data } = await api.get(`/listings/${id}`);
    return data;
  },
  async registerView(id) {
    const { data } = await api.post(`/listings/${id}/view`);
    return data;
  },
  async create(payload) {
    const { data } = await api.post("/listings", payload);
    return data;
  },
  async update(id, payload) {
    const { data } = await api.patch(`/listings/${id}`, payload);
    return data;
  },
  async updateStatus(id, status) {
    const { data } = await api.patch(`/listings/${id}/status`, { status });
    return data;
  },
  async remove(id) {
    const { data } = await api.delete(`/listings/${id}`);
    return data;
  },
};

export default marketplaceService;
