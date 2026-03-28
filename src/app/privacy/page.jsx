"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Eye, Lock, Database } from "lucide-react";

export default function PrivacyPage() {
  const { t, language } = useLanguage();

  const content = language === "ht"
    ? {
        description: "Men kijan nou pwoteje done ou yo epi kijan nou itilize enfòmasyon ou pataje sou Lakou Manman.",
        sections: [
          {
            icon: Shield,
            title: "Pwoteksyon done",
            description: "Nou pran angajman pou pwoteje enfòmasyon pèsonèl ou epi respekte vi prive ou sou platfòm nan."
          },
          {
            icon: Eye,
            title: "Koleksyon done",
            description: "Nou kolekte sèlman enfòmasyon ki nesesè pou pèmèt ou itilize sèvis yo ak jwenn yon eksperyans ki pi senp."
          },
          {
            icon: Lock,
            title: "Itilizasyon done",
            description: "Done ou yo sèvi pou amelyore sèvis yo, sekirite kominote a epi pèsonalize eksperyans ou."
          },
          {
            icon: Database,
            title: "Konsèvasyon done",
            description: "Enfòmasyon ou yo estoke sou sistèm ki pwoteje epi yo pa pataje san konsantman ou, sof si lalwa egzije sa."
          }
        ],
        relatedTitle: "Lyen ki gen rapò",
        relatedLinks: [
          { label: "Kontak", href: "/contact" },
          { label: "Kondisyon itilizasyon", href: "/terms" },
          { label: "Politik cookies", href: "/cookies" }
        ]
      }
    : {
        description: "Voici comment nous protégeons vos données et comment nous utilisons les informations que vous partagez sur Lakou Manman.",
        sections: [
          {
            icon: Shield,
            title: "Protection des données",
            description: "Nous nous engageons à protéger vos informations personnelles et à respecter votre vie privée sur la plateforme."
          },
          {
            icon: Eye,
            title: "Collecte des données",
            description: "Nous collectons uniquement les informations nécessaires pour vous permettre d'utiliser les services et d'obtenir une expérience plus fluide."
          },
          {
            icon: Lock,
            title: "Utilisation des données",
            description: "Vos données sont utilisées pour améliorer les services, sécuriser la communauté et personnaliser votre expérience."
          },
          {
            icon: Database,
            title: "Stockage des données",
            description: "Vos informations sont conservées sur des systèmes sécurisés et ne sont jamais partagées sans votre consentement, sauf obligation légale."
          }
        ],
        relatedTitle: "Liens associés",
        relatedLinks: [
          { label: "Contact", href: "/contact" },
          { label: "Conditions d'utilisation", href: "/terms" },
          { label: "Politique cookies", href: "/cookies" }
        ]
      };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            {t("privacyPolicy") || "Politique de confidentialité"}
          </h1>
          <p className="text-slate-600">
            {content.description}
          </p>
        </div>

        <div className="space-y-6">
          {content.sections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.title}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">{section.description}</p>
                </CardContent>
              </Card>
            );
          })}

          <Card className="bg-slate-50 border-slate-200">
            <CardHeader>
              <CardTitle>{content.relatedTitle}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {content.relatedLinks.map((link) => (
                <Link key={link.href} href={link.href} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-blue-200 hover:text-blue-600">
                  {link.label}
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
