"use client";

import { useLanguage } from "@/contexts/LanguageContext";

export default function LanguageSelector() {
  const { language, changeLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white/80 p-1">
      <button
        type="button"
        onClick={() => changeLanguage("fr")}
        className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
          language === "fr"
            ? "bg-[#9B2335] text-white shadow-sm"
            : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        🇫🇷 <span>FR</span>
      </button>
      <button
        type="button"
        onClick={() => changeLanguage("ht")}
        className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
          language === "ht"
            ? "bg-[#9B2335] text-white shadow-sm"
            : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        🇭🇹 <span>HT</span>
      </button>
    </div>
  );
}
