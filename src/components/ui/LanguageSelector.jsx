"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function LanguageSelector() {
  console.log("LanguageSelector component loading...");
  
  try {
    const { language, changeLanguage, t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);

    console.log("LanguageSelector rendered, language:", language);

    const languages = [
      { code: "fr", name: "Français", flag: "🇫🇷" },
      { code: "ht", name: "Kreyòl", flag: "🇭🇹" },
    ];

    const currentLanguage = languages.find((lang) => lang.code === language);

    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 rounded-xl hover:bg-slate-100"
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLanguage.flag}</span>
          <span className="hidden sm:inline">{currentLanguage.name}</span>
          <span className="sm:hidden">{currentLanguage.flag}</span>
        </Button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
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
  } catch (error) {
    console.error("LanguageSelector error:", error);
    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 rounded-xl hover:bg-slate-100"
        >
          <Globe className="h-4 w-4" />
          <span>🌐</span>
        </Button>
      </div>
    );
  }
}
