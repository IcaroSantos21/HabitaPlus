import api from "./api";

const forecastsService = {
  async getExpenses(params = {}) {
    const { data } = await api.get("/predictions/expenses", { params });
    return data;
  },
};

export default forecastsService;
