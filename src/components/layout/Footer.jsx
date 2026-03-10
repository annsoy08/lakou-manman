"use client";

import Link from "next/link";
import { Home, Heart, MessageCircle, Users, Stethoscope, BookOpen, ShoppingBag } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();
  
  const footerLinks = [
    { href: "/feed", labelKey: "feed", icon: MessageCircle },
    { href: "/groups", labelKey: "groups", icon: Users },
    { href: "/doctor", labelKey: "doctor", icon: Stethoscope },
    { href: "/guides", labelKey: "guides", icon: BookOpen },
    { href: "/boutique", labelKey: "boutique", icon: ShoppingBag },
  ];
  return (
    <footer className="mt-16">
      <div className="bg-gradient-to-br from-[#6B1525] via-[#9B2335] to-[#7B1A2C]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-3">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 shadow-lg">
                  <Home className="h-5 w-5 text-white" />
                </div>
                <span className="text-2xl font-bold tracking-tight text-white">
                  Lakou Manman
                </span>
              </div>
              <p className="mt-4 max-w-xs text-base leading-7 text-white/70">
                {t("mission")}
              </p>
            </div>
            <div>
              <div className="text-sm font-bold uppercase tracking-wider text-white/50">{t("footerNavigation")}</div>
              <div className="mt-4 flex flex-col gap-3">
                {footerLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center gap-2.5 text-base text-white/80 transition-colors hover:text-white"
                    >
                      <Icon className="h-4 w-4 text-white/50" />
                      <span>{t(link.labelKey)}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="text-sm font-bold uppercase tracking-wider text-white/50">{t("footerInformation")}</div>
              <div className="mt-4 space-y-3 text-base leading-7 text-white/70">
                <p>{t("footerMedicalDisclaimer")}</p>
                <p>{t("footerMedicalAdvice")}</p>
              </div>
            </div>
          </div>
          <div className="mt-10 flex items-center justify-center gap-1.5 border-t border-white/15 pt-8 text-base text-white/50">
            {t("footerMadeWith")}
          </div>
        </div>
      </div>
    </footer>
  );
}
