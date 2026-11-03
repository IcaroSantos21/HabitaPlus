import api from "./api";

const dashboardService = {
  async getFinanceDashboard(params = {}) {
    const { data } = await api.get("/finance/dashboard", { params });
    return data;
  },

  async getExpensePrediction(params = {}) {
    const { data } = await api.get("/predictions/expenses", { params });
    return data;
  },
};

export default dashboardService;
