import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark" | "sunset" | "system";

export type ResolvedTheme = "light" | "dark" | "sunset";

const STORAGE_KEY = "storiq-theme";

const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: "#dbd0c4",
  dark: "#101511",
  sunset: "#0c1519",
};

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const getSystemTheme = (): "light" | "dark" =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

export const resolveTheme = (mode: ThemeMode): ResolvedTheme =>
  mode === "system" ? getSystemTheme() : mode;

export const applyTheme = (resolved: ResolvedTheme) => {
  document.documentElement.setAttribute("data-theme", resolved);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", THEME_COLORS[resolved]);
  }
};

const readStoredMode = (): ThemeMode => {
  try {
    const stored =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem("storeiq-theme") ??
      localStorage.getItem("StorIQ-theme");
    if (stored === "light" || stored === "dark" || stored === "sunset" || stored === "system") {
      if (stored && !localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, stored);
      }
      return stored;
    }
  } catch {
    /* ignore */
  }
  return "system";
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(readStoredMode()));

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    const nextResolved = resolveTheme(next);
    setResolved(nextResolved);
    applyTheme(nextResolved);
  }, []);

  useEffect(() => {
    const nextResolved = resolveTheme(mode);
    setResolved(nextResolved);
    applyTheme(nextResolved);

    if (mode !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const systemResolved = getSystemTheme();
      setResolved(systemResolved);
      applyTheme(systemResolved);
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [mode]);

  const value = useMemo(() => ({ mode, resolved, setMode }), [mode, resolved, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
};
