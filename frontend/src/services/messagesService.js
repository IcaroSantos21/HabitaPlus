import api from "./api";

const messagesService = {
  async list(params = {}) {
    const { data } = await api.get("/v1/mensagens", { params });
    return data;
  },

  async send(payload) {
    const { data } = await api.post("/v1/mensagens", payload);
    return data;
  },
};

export default messagesService;
