import api from "./api";

const recommendationsService = {
  async get() {
    const { data } = await api.get("/residents/me/recommendations");
    return data;
  },
};

export default recommendationsService;
