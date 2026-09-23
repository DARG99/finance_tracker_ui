export const TOKEN_KEY = "accessToken";
const SESSION_EVENT = "session-change";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)?.trim() || null;
}

// JWT claims are an expiry hint only; the API still verifies the token.
// Opaque tokens (or JWTs without exp) are validated by the API.
export function hasSession(): boolean {
  const token = getToken();
  if (!token) return false;
  if (token.split(".").length !== 3) return true;
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "=")));
    if (!claims || typeof claims !== "object") return false;
    return claims.exp === undefined || (typeof claims.exp === "number" && claims.exp * 1000 > Date.now());
  } catch {
    return false;
  }
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
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
