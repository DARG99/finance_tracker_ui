export const SESSION_KEY = "finance-session-v2";
const SESSION_EVENT = "session-change";

export type Session = {
  token: string;
  expiresAt: number;
  refreshToken: string;
  refreshExpiresAt: number;
};

export function getSession(): Session | null {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    return value && typeof value.token === "string" && typeof value.refreshToken === "string"
      && value.refreshToken && Number.isFinite(value.expiresAt) && Number.isFinite(value.refreshExpiresAt)
      ? value : null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return getSession()?.token || null;
}

export function hasSession(): boolean {
  const session = getSession();
  return Boolean(session && session.refreshExpiresAt > Date.now());
}

export function setSession(session: Session | null): void {
  // One storage write publishes both rotated credentials atomically to other tabs.
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("accessToken");
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function subscribeToSession(onChange: () => void): () => void {
  const onVisible = () => {
    if (document.visibilityState === "visible") onChange();
  };
  window.addEventListener(SESSION_EVENT, onChange);
  window.addEventListener("storage", onChange);
  window.addEventListener("pageshow", onChange);
  window.addEventListener("focus", onChange);
  document.addEventListener("visibilitychange", onVisible);
  const timer = window.setInterval(onChange, 1000);
  return () => {
    window.removeEventListener(SESSION_EVENT, onChange);
    window.removeEventListener("storage", onChange);
    window.removeEventListener("pageshow", onChange);
    window.removeEventListener("focus", onChange);
    document.removeEventListener("visibilitychange", onVisible);
    window.clearInterval(timer);
  };
}
