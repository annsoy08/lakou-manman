"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import ThemeSelector from "@/components/layout/ThemeSelector";
import LanguageSelector from "@/components/ui/LanguageSelector";

export default function MarketingHeader() {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-50 overflow-x-clip border-b border-rose-100/70 bg-white/85 shadow-sm backdrop-blur-xl">
      <div className="app-shell-container flex flex-wrap items-center justify-between gap-3 py-3">
        <Link href="/" className="flex min-w-0 items-center gap-3 transition-transform hover:scale-[1.01]">
          <img src="/logo-lakou-manman.png" alt="Lakou Manman" className="h-12 w-auto sm:h-14" />
          <div>
            <div className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              <span className="gradient-text">Lakou</span> Manman
            </div>
            <p className="hidden text-xs text-slate-500 sm:block">
              {t("platformSubtitle")}
            </p>
          </div>
        </Link>

        <div className="flex w-full flex-wrap items-center justify-end gap-2 rounded-full border border-rose-100 bg-white/90 p-1.5 shadow-sm sm:w-auto sm:flex-nowrap sm:gap-3">
          <LanguageSelector />
          <ThemeSelector />
          {user ? (
            <Button asChild className="rounded-full bg-gradient-to-r from-[#9B2335] to-[#7B1A2C] px-4 shadow-sm shadow-rose-200 transition-all hover:brightness-110 sm:px-5">
              <Link href="/feed">{t("seeCommunity")}</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" className="rounded-full px-3 text-slate-700 hover:bg-rose-50 hover:text-[#9B2335] sm:px-4">
                <Link href="/login">{t("login")}</Link>
              </Button>
              <Button asChild className="rounded-full bg-gradient-to-r from-[#9B2335] to-[#7B1A2C] px-4 shadow-sm shadow-rose-200 transition-all hover:brightness-110 sm:px-5">
                <Link href="/register">{t("createAccount")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
