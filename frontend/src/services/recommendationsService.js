import api from "./api";

const recommendationsService = {
  async get() {
    const { data } = await api.get("/recommendations/me");
    return data;
  },
};

export default recommendationsService;
