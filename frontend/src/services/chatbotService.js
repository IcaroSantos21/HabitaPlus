import api from "./api";

const chatbotService = {
  async sendMessage(payload) {
    const { data } = await api.post("/v1/chatbot/mensagens", payload);
    return data;
  },

  async getConversation(id = "conv_demo") {
    const { data } = await api.get(`/v1/chatbot/conversas/${id}`);
    return data;
  },
};

export default chatbotService;
