"use client";

import Link from "next/link";
import { MessageCircle, Users, BookOpen, ShoppingBag, Wrench, Mail, MapPin, Phone, Heart, Shield, Baby, Gamepad2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();

  const navigationLinks = [
    { href: "/feed", labelKey: "feed", icon: MessageCircle },
    { href: "/groups", labelKey: "groups", icon: Users },
    { href: "/sante", labelKey: "health", icon: Heart },
    { href: "/outils", labelKey: "tools", icon: Wrench },
    { href: "/guides", labelKey: "guides", icon: BookOpen },
    { href: "/games", labelKey: "games", icon: Gamepad2 },
    { href: "/boutique", labelKey: "boutique", icon: ShoppingBag },
  ];

  const supportLinks = [
    { href: "/help", labelKey: "footerHelpCenter" },
    { href: "/contact", labelKey: "footerContact" },
    { href: "/about", labelKey: "footerAboutUs" },
  ];

  const legalLinks = [
    { href: "/privacy", labelKey: "footerPrivacyPolicy" },
    { href: "/terms", labelKey: "footerTermsOfService" },
  ];

  return (
    <footer className="mt-16">
      <div className="border-t border-[#24324a] bg-[radial-gradient(circle_at_top_left,_rgba(155,35,53,0.18),_transparent_24%),linear-gradient(180deg,_#151d31_0%,_#11192b_100%)] text-white">
        <div className="app-shell-container py-14">
          <div className="grid gap-10 border-b border-white/10 pb-10 md:grid-cols-4">
            <div className="md:col-span-1">
              <div className="flex items-center gap-3">
                <img src="/logo-lakou-manman.png" alt="Lakou Manman" className="h-14 w-auto rounded-xl" />
                <div>
                  <span className="text-2xl font-bold tracking-tight text-white">
                    Lakou Manman
                  </span>
                  <div className="mt-1 text-sm text-slate-400">{t("platformSubtitle") || "Plateforme Communautaire Haïtienne"}</div>
                </div>
              </div>
              <p className="mt-5 max-w-xs text-sm leading-7 text-slate-300/95">
                {t("footerCommunityPhrase") || "Une communauté de mères haïtiennes du monde entier pour partager, apprendre et se soutenir mutuellement."}
              </p>
              <div className="mt-5 space-y-3">
                <a href="mailto:contact@lakoumanman.com" className="flex items-center gap-3 text-sm text-slate-300 transition-colors hover:text-[#ff74a6]">
                  <Mail className="h-4 w-4 text-[#ff4f8f]" />
                  <span>contact@lakoumanman.com</span>
                </a>
                <a href="tel:+50932589391" className="flex items-center gap-3 text-sm text-slate-300 transition-colors hover:text-[#ff74a6]">
                  <Phone className="h-4 w-4 text-[#ff4f8f]" />
                  <span>+509 32 58 93 91</span>
                </a>
                <a href="https://www.google.com/maps/search/?api=1&query=Hinche%2C+Ha%C3%AFti" target="_blank" rel="noreferrer" className="flex items-center gap-3 text-sm text-slate-300 transition-colors hover:text-[#ff74a6]">
                  <MapPin className="h-4 w-4 text-[#ff4f8f]" />
                  <span>Petion-ville, Haïti</span>
                </a>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ff4f8f]">{t("footerNavigation") || "Navigation"}</div>
              <div className="mt-4 flex flex-col gap-2.5">
                {navigationLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center gap-2 text-sm text-slate-300 transition-colors hover:text-white"
                    >
                      <Icon className="h-3.5 w-3.5 text-[#ff4f8f]" />
                      <span>{t(link.labelKey)}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ff4f8f]">{t("support") || "Support"}</div>
              <div className="mt-4 flex flex-col gap-2.5">
                {supportLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm text-slate-300 transition-colors hover:text-white"
                  >
                    {t(link.labelKey) || link.labelKey}
                  </Link>
                ))}
              </div>

              <div className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[#ff4f8f]">{t("footerLegal") || t("legal") || "Légal"}</div>
              <div className="mt-3 flex flex-col gap-2.5">
                {legalLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm text-slate-300 transition-colors hover:text-white"
                  >
                    {t(link.labelKey) || link.labelKey}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ff4f8f]">{t("footerInformation") || "Information"}</div>
              <div className="mt-4 space-y-4 text-sm leading-6 text-slate-300">
                <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.04] p-3 backdrop-blur-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff4f8f] text-white shadow-[0_14px_30px_-18px_rgba(255,79,143,0.55)]"><Users className="h-5 w-5" /></div>
                  <div>
                    <div className="font-medium text-white">{t("communityFeature") || "Communauté active"}</div>
                    <div className="text-slate-400">{t("communityFeatureDesc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.04] p-3 backdrop-blur-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#9f48ff] text-white shadow-[0_14px_30px_-18px_rgba(159,72,255,0.55)]"><Baby className="h-5 w-5" /></div>
                  <div>
                    <div className="font-medium text-white">{t("expertFeature") || "Accès experts"}</div>
                    <div className="text-slate-400">{t("expertFeatureDesc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.04] p-3 backdrop-blur-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3d78ff] text-white shadow-[0_14px_30px_-18px_rgba(61,120,255,0.55)]"><Shield className="h-5 w-5" /></div>
                  <div>
                    <div className="font-medium text-white">{t("safetyFeature") || "Sécurité"}</div>
                    <div className="text-slate-400">{t("safetyFeatureDesc")}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-7 flex flex-col items-center justify-between gap-4 pt-2 sm:flex-row">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>{t("madeWith") || "Fait avec"}</span>
              <Heart className="h-4 w-4 fill-current text-[#ff4f8f]" />
              <span>{t("forHaitianMoms") || "pour les mamans haïtiennes"}</span>
            </div>
            <div className="text-sm text-slate-500">
              &copy; 2026 Lakou Manman. {t("allRightsReserved") || "Tous droits réservés."}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
