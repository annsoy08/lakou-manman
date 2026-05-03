"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import Link from "next/link";
import Image from "next/image";
import { 
  Facebook, 
  Instagram, 
  Twitter, 
  Youtube, 
  Mail, 
  Phone, 
  MapPin,
  Heart,
  Baby,
  Users,
  Shield
} from "lucide-react";

export default function Footer() {
  const { t } = useLanguage();

  const footerLinks = {
    platform: [
      { name: t("aboutUs") || "À propos", href: "/about" },
      { name: t("howItWorks") || "Comment ça marche", href: "/how-it-works" },
      { name: t("features") || "Fonctionnalités", href: "/features" },
      { name: t("testimonials") || "Témoignages", href: "/testimonials" },
    ],
    support: [
      { name: t("helpCenter") || "Centre d'aide", href: "/help" },
      { name: t("contact") || "Contact", href: "/contact" },
      { name: t("faq") || "FAQ", href: "/faq" },
      { name: t("reportIssue") || "Signaler un problème", href: "/report" },
    ],
    legal: [
      { name: t("privacyPolicy") || "Politique de confidentialité", href: "/privacy" },
      { name: t("termsOfService") || "Conditions d'utilisation", href: "/terms" },
      { name: t("cookiePolicy") || "Politique cookies", href: "/cookies" },
      { name: t("guidelines") || "Directives communautaires", href: "/guidelines" },
    ],
    services: [
      { name: t("pediatre") || "Pédiatre", href: "/pediatre" },
      { name: t("boutique") || "Boutique", href: "/boutique" },
      { name: t("tools") || "Outils", href: "/outils" },
      { name: t("groups") || "Groupes", href: "/groups" },
    ]
  };

  const socialLinks = [
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Youtube, href: "#", label: "YouTube" },
  ];

  return (
    <footer className="bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Logo and Description */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/logo-lakou-manman.svg"
                alt="Lakou Manman"
                width={64}
                height={64}
                className="h-16 w-auto"
              />
              <div>
                <h3 className="text-lg font-bold">Lakou Manman</h3>
                <p className="text-slate-400 text-sm">{t("platformSubtitle") || "Plateforme Communautaire Haïtienne"}</p>
              </div>
            </div>
            
            <p className="text-slate-300 mb-6 leading-relaxed">
              {t("footerDescription") || "Lakou Manman est la plateforme de référence pour les mamans haïtiennes. Connectez-vous, partagez, et accédez à des ressources précieuses pour votre bien-être et celui de vos enfants."}
            </p>

            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-slate-300">
                <Mail className="h-5 w-5 text-pink-400" />
                <a href="mailto:contact@lakoumanman.com" className="transition hover:text-pink-300">contact@lakoumanman.com</a>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <Phone className="h-5 w-5 text-pink-400" />
                <a href="tel:+50932589391" className="transition hover:text-pink-300">+509 32 58 93 91</a>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <MapPin className="h-5 w-5 text-pink-400" />
                <a href="https://www.google.com/maps/search/?api=1&query=Petion-ville%2C+Ha%C3%AFti" target="_blank" rel="noreferrer" className="transition hover:text-pink-300">Petion-ville, Haïti</a>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex gap-3 mt-6">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    className="w-10 h-10 bg-slate-700 hover:bg-pink-600 rounded-full flex items-center justify-center transition-colors"
                    aria-label={social.label}
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="font-semibold mb-4 text-pink-400">
              {t("platform") || "Plateforme"}
            </h4>
            <ul className="space-y-2">
              {footerLinks.platform.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-slate-300 hover:text-pink-400 transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="font-semibold mb-4 text-pink-400">
              {t("support") || "Support"}
            </h4>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-slate-300 hover:text-pink-400 transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services & Legal */}
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold mb-4 text-pink-400">
                {t("services") || "Services"}
              </h4>
              <ul className="space-y-2">
                {footerLinks.services.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-slate-300 hover:text-pink-400 transition-colors text-sm"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-pink-400">
                {t("legal") || "Légal"}
              </h4>
              <ul className="space-y-2">
                {footerLinks.legal.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-slate-300 hover:text-pink-400 transition-colors text-sm"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-12 pt-8 border-t border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-pink-600 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-semibold">{t("communityFeature") || "Communauté Active"}</h4>
                <p className="text-slate-400 text-sm">{t("communityFeatureDesc") || "Rejoignez des milliers de mamans"}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                <Baby className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-semibold">{t("expertFeature") || "Accès Experts"}</h4>
                <p className="text-slate-400 text-sm">{t("expertFeatureDesc") || "Consultez des pédiatres, psychologues, gynécologues et autres professionnels qualifiés"}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-semibold">{t("safetyFeature") || "Sécurité"}</h4>
                <p className="text-slate-400 text-sm">{t("safetyFeatureDesc") || "Plateforme sécurisée et modérée"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="mt-8 pt-8 border-t border-slate-700">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <span>© 2026- Lakou Manman.</span>
              <span>{t("allRightsReserved") || "Tous droits réservés."}</span>
            </div>
            
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <span>{t("madeWith") || "Fait avec"}</span>
              <Heart className="h-4 w-4 text-pink-500 fill-current" />
              <span>{t("forHaitianMoms") || "pour les mamans haïtiennes"}</span>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/privacy" className="text-slate-400 hover:text-pink-400 text-sm transition-colors">
                {t("privacy") || "Confidentialité"}
              </Link>
              <Link href="/terms" className="text-slate-400 hover:text-pink-400 text-sm transition-colors">
                {t("terms") || "Conditions"}
              </Link>
              <Link href="/cookies" className="text-slate-400 hover:text-pink-400 text-sm transition-colors">
                {t("cookies") || "Cookies"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
