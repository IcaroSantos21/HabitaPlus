import api from "./api";

const chatbotService = {
  async sendMessage(text) {
    const { data } = await api.post("/chatbot/message", { text });
    return data;
  },
};

export default chatbotService;
