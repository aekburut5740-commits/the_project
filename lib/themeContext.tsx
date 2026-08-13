"use client";

import React, { createContext, useContext, useLayoutEffect, useState } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  // ใช้ useLayoutEffect แทน useEffect เพราะรันก่อน browser paint
  // (useEffect ปกติรันหลัง paint ไปแล้ว เลยเห็น dark แวบก่อนสลับเป็น light)
  useLayoutEffect(() => {
    const saved = localStorage.getItem("app_theme") as Theme | null;
    const active = saved === "light" ? "light" : "dark";
    setThemeState(active);
    if (active === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("app_theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      <div className={theme === "light" ? "theme-light min-h-screen bg-gray-50 text-slate-900" : "theme-dark min-h-screen bg-slate-950 text-white"}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return { theme: "dark" as Theme, toggleTheme: () => { }, setTheme: () => { } };
  }
  return context;
}