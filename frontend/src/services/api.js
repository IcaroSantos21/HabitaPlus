import axios from "axios";

const configuredApiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
const normalizedApiUrl = configuredApiUrl.replace(/\/+$/, "");

export const AUTH_TOKEN_KEY = "habitaplus.accessToken";

const api = axios.create({
  baseURL: normalizedApiUrl.endsWith("/api")
    ? normalizedApiUrl
    : `${normalizedApiUrl}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;