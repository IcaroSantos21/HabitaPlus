import api from "./api";

const transactionsService = {
  async list(params = {}) {
    const { data } = await api.get("/transactions", { params });
    return data;
  },

  async create(payload) {
    const { data } = await api.post("/transactions", payload);
    return data;
  },

  async monthlySummary(params = {}) {
    const { data } = await api.get("/transactions/monthly-summary", {
      params,
    });
    return data;
  },
};

export default transactionsService;
