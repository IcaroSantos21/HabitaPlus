import api from "./api";

const forecastsService = {
  async getExpenses(params = {}) {
    const { data } = await api.get("/v1/forecasts/expenses", { params });
    return data;
  },
};

export default forecastsService;
