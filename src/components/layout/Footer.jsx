"use client";

import Link from "next/link";
import { MessageCircle, Users, Stethoscope, BookOpen, ShoppingBag, Wrench, Mail, MapPin, Phone, Heart, Shield, Baby, Gamepad2 } from "lucide-react";
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
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="app-shell-container py-14">
          <div className="grid gap-10 md:grid-cols-4">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5">
                <img src="/logo-lakou-manman.png" alt="Lakou Manman" className="h-16 w-auto" />
                <div>
                  <span className="text-2xl font-bold tracking-tight text-white">
                    Lakou Manman
                  </span>
                  <div className="text-sm text-slate-400">{t("platformSubtitle") || "Plateforme Communautaire Haïtienne"}</div>
                </div>
              </div>
              <p className="mt-4 max-w-xs text-sm leading-6 text-slate-300">
                {t("footerCommunityPhrase") || "Une communauté de mères haïtiennes du monde entier pour partager, apprendre et se soutenir mutuellement."}
              </p>
              <div className="mt-4 space-y-2">
                <a href="mailto:contact@lakou-manman.com" className="flex items-center gap-3 text-sm text-slate-300 transition-colors hover:text-pink-400">
                  <Mail className="h-4 w-4 text-pink-400" />
                  <span>contact@lakou-manman.com</span>
                </a>
                <a href="tel:+50932589391" className="flex items-center gap-3 text-sm text-slate-300 transition-colors hover:text-pink-400">
                  <Phone className="h-4 w-4 text-pink-400" />
                  <span>+509 32 58 93 91</span>
                </a>
                <a href="https://www.google.com/maps/search/?api=1&query=Hinche%2C+Ha%C3%AFti" target="_blank" rel="noreferrer" className="flex items-center gap-3 text-sm text-slate-300 transition-colors hover:text-pink-400">
                  <MapPin className="h-4 w-4 text-pink-400" />
                  <span>Petion-ville, Haïti</span>
                </a>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold uppercase tracking-wider text-pink-400">{t("footerNavigation") || "Navigation"}</div>
              <div className="mt-4 flex flex-col gap-2.5">
                {navigationLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center gap-2 text-sm text-slate-300 transition-colors hover:text-pink-400"
                    >
                      <Icon className="h-3.5 w-3.5 text-pink-400" />
                      <span>{t(link.labelKey)}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold uppercase tracking-wider text-pink-400">{t("support") || "Support"}</div>
              <div className="mt-4 flex flex-col gap-2.5">
                {supportLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm text-slate-300 transition-colors hover:text-pink-400"
                  >
                    {t(link.labelKey) || link.labelKey}
                  </Link>
                ))}
              </div>

              <div className="mt-6 text-sm font-semibold uppercase tracking-wider text-pink-400">{t("footerLegal") || t("legal") || "Légal"}</div>
              <div className="mt-3 flex flex-col gap-2.5">
                {legalLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm text-slate-300 transition-colors hover:text-pink-400"
                  >
                    {t(link.labelKey) || link.labelKey}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold uppercase tracking-wider text-pink-400">{t("footerInformation") || "Information"}</div>
              <div className="mt-4 space-y-4 text-sm leading-6 text-slate-300">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-600"><Users className="h-5 w-5 text-white" /></div>
                  <div>
                    <div className="font-medium text-white">{t("communityFeature") || "Communauté active"}</div>
                    <div className="text-slate-400">{t("communityFeatureDesc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600"><Baby className="h-5 w-5 text-white" /></div>
                  <div>
                    <div className="font-medium text-white">{t("expertFeature") || "Accès experts"}</div>
                    <div className="text-slate-400">{t("expertFeatureDesc")}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600"><Shield className="h-5 w-5 text-white" /></div>
                  <div>
                    <div className="font-medium text-white">{t("safetyFeature") || "Sécurité"}</div>
                    <div className="text-slate-400">{t("safetyFeatureDesc")}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-700 pt-8 sm:flex-row">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>{t("madeWith") || "Fait avec"}</span>
              <Heart className="h-4 w-4 fill-current text-pink-500" />
              <span>{t("forHaitianMoms") || "pour les mamans haïtiennes"}</span>
            </div>
            <div className="text-sm text-slate-400">
              &copy; 2026 Lakou Manman. {t("allRightsReserved") || "Tous droits réservés."}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
