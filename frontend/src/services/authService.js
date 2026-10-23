import api from "./api";

const authService = {
  async login(credentials) {
    const { data } = await api.post("/auth/login", credentials);
    return data;
  },

  async register(userData) {
    const { data } = await api.post("/auth/register", userData);
    return data;
  },

  async me() {
    const { data } = await api.get("/auth/me");
    return data;
  },
};

export default authService;
