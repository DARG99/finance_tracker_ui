import axios, { type InternalAxiosRequestConfig } from "axios";
import { API_URL } from "../config";
import { getToken, setSession } from "../auth/session";
import { renewSession } from "../auth/renewal";

type RetryConfig = InternalAxiosRequestConfig & { sessionRetried?: boolean };
export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config) => {
  if (!config.url?.startsWith("/auth/")) {
    const token = await renewSession();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401 || !error.config
      || error.config.url?.startsWith("/auth/")) throw error;
    const config = error.config as RetryConfig;
    if (config.sessionRetried) {
      if (config.headers.Authorization === `Bearer ${getToken()}`) setSession(null);
      throw error;
    }
    config.sessionRetried = true;
    const rejectedToken = String(config.headers.Authorization || "").replace(/^Bearer /, "");
    const token = await renewSession(rejectedToken);
    config.headers.Authorization = `Bearer ${token}`;
    return api.request(config);
  },
);
