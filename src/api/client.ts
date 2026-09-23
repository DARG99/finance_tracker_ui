import axios from "axios";
import { API_URL } from "../config";
import { getToken, setToken } from "../auth/session";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token && !config.url?.startsWith("/auth/")) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const token = getToken();
      // A delayed response for an older session must not clear a new login.
      if (token && error.config?.headers.Authorization === `Bearer ${token}`) {
        setToken(null);
      }
    }
    return Promise.reject(error);
  },
);
