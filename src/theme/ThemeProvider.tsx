import { useEffect, useState, type ReactNode } from "react";
import { applyTheme, readTheme, saveTheme, THEME_KEY, type Theme } from "./theme";

import { ThemeContext } from "./useTheme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, updateTheme] = useState(readTheme);

  function setTheme(value: Theme) {
    applyTheme(value);
    updateTheme(value);
    saveTheme(value);
  }

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_KEY || event.key === null) updateTheme(readTheme());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
