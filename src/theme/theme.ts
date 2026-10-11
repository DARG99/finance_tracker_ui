export type Theme = "light" | "dark";
export const THEME_KEY = "finance-theme-v1";

export function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch { /* The system preference still works when storage is unavailable. */ }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.bsTheme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function saveTheme(theme: Theme): void {
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* Keep the theme usable for this visit. */ }
}
