"use client";

import { useLanguage } from "@/contexts/LanguageContext";

export default function WelcomeBanner() {
  const { t } = useLanguage();
  
  return (
    <div className="flex h-10 items-center justify-center bg-gradient-to-r from-[#6B1525] via-[#9B2335] to-[#6B1525] px-4 text-center text-sm font-medium text-white/90 shadow-md">
      {t("welcomeBanner")}
    </div>
  );
}
