import api from "./api";

const nluService = {
  async parse(payload) {
    const { data } = await api.post("/v1/nlu/parse", payload);
    return data;
  },
};

export default nluService;
