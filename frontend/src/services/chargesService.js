import api from "./api";

const chargesService = {
  async list(params = {}) {
    const { data } = await api.get("/charges", { params });
    return data;
  },

  async listMine(params = {}) {
    const { data } = await api.get("/charges/me", { params });
    return data;
  },

  async generate(competencia) {
    const { data } = await api.post("/charges/generate", null, {
      params: { competencia },
    });
    return data;
  },

  async checkout(id) {
    const { data } = await api.post(`/charges/${id}/checkout`);
    return data;
  },
};

export default chargesService;
