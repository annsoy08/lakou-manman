"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import ThemeSelector from "@/components/layout/ThemeSelector";
import LanguageSelector from "@/components/ui/LanguageSelector";

export default function MarketingHeader() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 overflow-x-clip border-b border-white/20 bg-[linear-gradient(180deg,_rgba(248,244,249,0.88)_0%,_rgba(244,238,247,0.82)_55%,_rgba(240,242,247,0.78)_100%)] shadow-[0_12px_40px_-28px_rgba(15,23,42,0.45)] backdrop-blur-2xl">
      <div className="app-shell-container flex flex-wrap items-center justify-between gap-3 py-3 sm:gap-4 sm:py-4">
        <Link href="/" className="flex min-w-0 items-center gap-3 transition-transform hover:scale-[1.01] sm:gap-4">
          <Image src="/logo-lakou-manman.png" alt="Lakou Manman" width={56} height={56} className="h-9 w-auto sm:h-12 lg:h-14" priority />
          <div className="min-w-0">
            <div className="truncate text-[1.15rem] font-bold leading-none tracking-tight text-slate-900 sm:text-xl">
              <span className="gradient-text">Lakou</span> Manman
            </div>
            <p className="hidden text-xs text-slate-500 sm:block">
              {t("platformSubtitle")}
            </p>
          </div>
        </Link>

        <div className="relative ml-auto flex max-w-full items-center justify-end gap-2 rounded-[1.5rem] border border-white/60 bg-white/55 px-2.5 py-2 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.38)] ring-1 ring-white/35 backdrop-blur-xl sm:w-auto sm:flex-nowrap sm:gap-3 sm:rounded-full sm:px-3 sm:py-2.5">
          <div className="hidden items-center gap-2 rounded-full border border-white/55 bg-white/55 px-2 py-1 shadow-sm sm:flex">
            <LanguageSelector />
            <div className="h-5 w-px bg-slate-200" />
            <ThemeSelector />
          </div>
          <div className="sm:hidden">
            <LanguageSelector />
          </div>
          <div className="sm:hidden">
            <ThemeSelector />
          </div>
          {user ? (
            <Button asChild className="h-10 rounded-full bg-gradient-to-r from-[#8f2946] via-[#9B2335] to-[#6f1e36] px-4 text-sm shadow-[0_16px_36px_-20px_rgba(155,35,53,0.55)] transition-all hover:brightness-110 sm:h-11 sm:px-6 sm:text-base">
              <Link href="/feed">{t("seeCommunity")}</Link>
            </Button>
          ) : (
            <>
              <div className="hidden min-[420px]:flex min-[420px]:items-center min-[420px]:gap-2 sm:gap-2.5">
                <Button asChild variant="ghost" className="h-10 rounded-full px-3 text-sm text-slate-700 transition-colors hover:bg-white/70 hover:text-[#9B2335] sm:h-11 sm:px-4 sm:text-base">
                  <Link href="/login">{t("login")}</Link>
                </Button>
                <Button asChild className="h-10 rounded-full bg-gradient-to-r from-[#8f2946] via-[#9B2335] to-[#6f1e36] px-4 text-sm shadow-[0_16px_36px_-20px_rgba(155,35,53,0.55)] transition-all hover:brightness-110 sm:h-11 sm:px-6 sm:text-base">
                  <Link href="/register">{t("createAccount")}</Link>
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-2xl min-[420px]:hidden"
                onClick={() => setMobileActionsOpen((currentValue) => !currentValue)}
                aria-label={mobileActionsOpen ? t("close") : t("menu")}
              >
                {mobileActionsOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
              {mobileActionsOpen && (
                <div className="absolute right-0 top-full z-50 mt-3 flex w-56 flex-col gap-2 rounded-[1.5rem] border border-white/60 bg-white/88 p-2.5 shadow-[0_26px_80px_-34px_rgba(15,23,42,0.42)] backdrop-blur-xl min-[420px]:hidden">
                  <Button asChild variant="ghost" className="justify-start rounded-xl text-slate-700 hover:bg-rose-50 hover:text-[#9B2335]">
                    <Link href="/login" onClick={() => setMobileActionsOpen(false)}>{t("login")}</Link>
                  </Button>
                  <Button asChild className="justify-start rounded-xl bg-gradient-to-r from-[#8f2946] via-[#9B2335] to-[#6f1e36] text-white shadow-[0_16px_36px_-20px_rgba(155,35,53,0.55)] transition-all hover:brightness-110">
                    <Link href="/register" onClick={() => setMobileActionsOpen(false)}>{t("createAccount")}</Link>
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
