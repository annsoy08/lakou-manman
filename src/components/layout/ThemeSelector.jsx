"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { Palette, Check } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ThemeSelector() {
  const { themeId, themes, changeTheme, currentTheme } = useTheme();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/70 bg-white/80 text-slate-600 shadow-sm transition-colors hover:text-[#9B2335]"
        style={{ boxShadow: `0 8px 20px -16px ${currentTheme.accent}` }}
        aria-label={t("changeTheme")}
        title={t("changeTheme")}
      >
        <div
          className="flex h-6 w-6 items-center justify-center rounded-full border border-white"
          style={{ backgroundColor: currentTheme.swatch }}
        >
          <Palette className="h-3.5 w-3.5 text-white" />
        </div>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border bg-white p-3 shadow-xl">
            <div className="mb-2 text-sm font-semibold text-slate-700">{t("chooseTheme")}</div>
            <div className="grid grid-cols-4 gap-2">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => {
                    changeTheme(theme.id);
                    setOpen(false);
                  }}
                  className={`group relative flex flex-col items-center gap-1 rounded-xl border border-transparent p-2 transition-all hover:bg-slate-50 ${
                    themeId === theme.id ? "ring-2 ring-[#9B2335] ring-offset-1" : ""
                  }`}
                  title={t(theme.labelKey)}
                >
                  <div
                    className="h-9 w-9 rounded-full border-2 border-white shadow-inner transition-transform group-hover:scale-110"
                    style={{
                      background: `linear-gradient(135deg, ${theme.surface} 0%, ${theme.swatch} 100%)`,
                      boxShadow: `0 10px 24px -18px ${theme.accent}`,
                    }}
                  />
                  {themeId === theme.id && (
                    <Check className="absolute right-1 top-1 h-3 w-3 text-[#9B2335]" />
                  )}
                  <span className="text-[10px] font-medium text-slate-500">{t(theme.labelKey)}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
