"use client";

import { createContext, useContext, useState, useEffect } from "react";

const themes = [
  { id: "rose", labelKey: "rosePale", color: "#fecdd3", swatch: "#fb7185" },
  { id: "grenat", labelKey: "grenadinFonce", color: "#f9a8b8", swatch: "#e84073" },
  { id: "peche", labelKey: "peche", color: "#fed7aa", swatch: "#fb923c" },
  { id: "ble-fonce", labelKey: "bleFonce", color: "#bfdbfe", swatch: "#1e40af" },
  { id: "ciel", labelKey: "cielBleu", color: "#bae6fd", swatch: "#38bdf8" },
    { id: "orange", labelKey: "orange", color: "#fed7aa", swatch: "#fb923c" },
  { id: "soleil", labelKey: "soleil", color: "#fde68a", swatch: "#fbbf24" },
];

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState("rose");

  useEffect(() => {
    const saved = localStorage.getItem("lakou-theme");
    if (saved) setThemeId(saved);
  }, []);

  function changeTheme(id) {
    setThemeId(id);
    localStorage.setItem("lakou-theme", id);
  }

  const currentTheme = themes.find((t) => t.id === themeId) || themes[0];

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
