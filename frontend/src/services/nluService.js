import api from "./api";

const nluService = {
  async parse(payload = {}) {
    const texto = String(
      typeof payload === "string" ? payload : payload?.texto ?? payload?.text ?? "",
    ).trim();
    const request = {
      texto,
      ...(payload?.contexto && typeof payload.contexto === "object"
        ? { contexto: payload.contexto }
        : {}),
    };
    const { data } = await api.post("/nlu/parse", request);
    return data;
  },
};

export default nluService;
