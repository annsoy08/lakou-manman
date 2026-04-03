"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Globe, Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function LanguageSelector() {
  const { language, changeLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: "fr", name: "Français", flag: "🇫🇷" },
    { code: "ht", name: "Kreyòl", flag: "🇭🇹" },
  ];

  const currentLanguage = languages.find((lang) => lang.code === language) || languages[0];

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-xl px-2 py-2 hover:bg-slate-100 sm:gap-2 sm:px-3"
      >
        <Globe className="h-4 w-4" />
        <span className="text-xs font-medium uppercase sm:text-sm">{currentLanguage.code}</span>
        <span className="hidden md:inline">{currentLanguage.flag}</span>
        <span className="hidden lg:inline">{currentLanguage.name}</span>
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border bg-white shadow-lg">
            <div className="p-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    changeLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    language === lang.code
                      ? "bg-slate-100 text-[#9B2335]"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="flex-1">{lang.name}</span>
                  {language === lang.code && (
                    <Check className="h-4 w-4 text-[#9B2335]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
