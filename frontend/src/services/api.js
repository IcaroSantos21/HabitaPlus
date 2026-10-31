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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = String(error?.config?.url || "");
    const isLoginRequest = requestUrl.includes("/auth/login");

    if (error?.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem(AUTH_TOKEN_KEY);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
      }
    }

    return Promise.reject(error);
  },
);

export default api;
