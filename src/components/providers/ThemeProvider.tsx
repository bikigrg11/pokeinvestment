"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "day" | "pro";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: "day", toggle: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("day");

  useEffect(() => {
    const stored = localStorage.getItem("pokeinvest-theme") as Theme | null;
    if (stored === "pro" || stored === "day") {
      setTheme(stored);
      document.documentElement.setAttribute("data-theme", stored === "pro" ? "pro" : "");
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "day" ? "pro" : "day";
      localStorage.setItem("pokeinvest-theme", next);
      if (next === "pro") {
        document.documentElement.setAttribute("data-theme", "pro");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
