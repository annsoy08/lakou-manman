"use client";

import { createContext, useContext, useState, useEffect } from "react";

const themes = [
  { id: "rose", labelKey: "rosePale", color: "#fff1f2", surface: "#ffe4e6", swatch: "#fb7185", accent: "#e11d48" },
  { id: "grenat", labelKey: "grenadinFonce", color: "#fff1f2", surface: "#fecdd3", swatch: "#be123c", accent: "#9f1239" },
  { id: "peche", labelKey: "peche", color: "#fff7ed", surface: "#fed7aa", swatch: "#fb923c", accent: "#ea580c" },
  { id: "ble-fonce", labelKey: "bleFonce", color: "#eff6ff", surface: "#bfdbfe", swatch: "#1d4ed8", accent: "#1e40af" },
  { id: "ciel", labelKey: "cielBleu", color: "#f0f9ff", surface: "#bae6fd", swatch: "#38bdf8", accent: "#0284c7" },
  { id: "orange", labelKey: "orange", color: "#fff7ed", surface: "#fdba74", swatch: "#f97316", accent: "#ea580c" },
  { id: "soleil", labelKey: "soleil", color: "#fffbeb", surface: "#fde68a", swatch: "#fbbf24", accent: "#d97706" },
];

function normalizeThemeId(themeId) {
  return themes.some((theme) => theme.id === themeId) ? themeId : themes[0].id;
}

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState("rose");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const savedThemeId = window.localStorage.getItem("lakou-theme");
      if (savedThemeId) {
        setThemeId(normalizeThemeId(savedThemeId));
      }
    } catch {
    }
  }, []);

  function changeTheme(id) {
    const nextThemeId = normalizeThemeId(id);
    setThemeId(nextThemeId);

    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem("lakou-theme", nextThemeId);
    } catch {
    }
  }

  const currentTheme = themes.find((theme) => theme.id === themeId) || themes[0];

  return (
    <ThemeContext.Provider value={{ themeId, currentTheme, themes, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
