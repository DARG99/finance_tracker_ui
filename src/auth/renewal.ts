import axios from "axios";
import { API_URL } from "../config";
import { loginResponseSchema } from "../schemas/authSchema";
import { getSession, setSession } from "./session";

// Separate client: session endpoints never attach a bearer or trigger renewal.
export const authApi = axios.create({ baseURL: API_URL, timeout: 15000, headers: { "Content-Type": "application/json" } });
const LOCK = "finance-session-renewal";
let pending: Promise<string> | null = null;

export function withSessionLock<T>(action: () => Promise<T>): Promise<T> {
  if (!navigator.locks) return Promise.reject(new Error("Session renewal requires a browser with Web Locks and HTTPS (or localhost)."));
  return navigator.locks.request(LOCK, action);
}

export function saveSession(data: unknown): void {
  const response = loginResponseSchema.parse(data);
  const now = Date.now();
  setSession({ token: response.token, refreshToken: response.refreshToken,
    expiresAt: now + response.expiresIn, refreshExpiresAt: now + response.refreshExpiresIn });
}

// rejectedToken is supplied only for a 401. A newer token from another tab/request
// already satisfies that retry, even when the failed request finished late.
export function renewSession(rejectedToken?: string): Promise<string> {
  if (pending) return pending;
  pending = withSessionLock(async () => {
    const session = getSession();
    if (!session || session.refreshExpiresAt <= Date.now()) {
      setSession(null);
      throw new Error("Please sign in again.");
    }
    if (session.token && session.expiresAt > Date.now() + 30000
      && (!rejectedToken || rejectedToken !== session.token)) return session.token;
    try {
      const response = await authApi.post("/auth/refresh", { refreshToken: session.refreshToken });
      // Never resurrect credentials cleared or replaced while the request ran.
      if (getSession()?.refreshToken !== session.refreshToken) throw new Error("Session changed. Please retry.");
      saveSession(response.data);
      return getSession()!.token;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401
        && getSession()?.refreshToken === session.refreshToken) setSession(null);
      throw error;
    }
  }).finally(() => { pending = null; });
  return pending;
}

export async function logoutSession(): Promise<void> {
  await withSessionLock(async () => {
    const session = getSession();
    try {
      if (session) await authApi.post("/auth/logout", { refreshToken: session.refreshToken });
    } finally {
      if (getSession()?.refreshToken === session?.refreshToken) setSession(null);
    }
  });
}
