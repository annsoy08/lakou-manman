"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, Shield, AlertCircle } from "lucide-react";

export default function TermsPage() {
  const { t, language } = useLanguage();

  const content = language === "ht"
    ? {
        description: "Règ ak prensip pou itilize Lakou Manman nan yon fason ki respekte kominote a.",
        sections: [
          {
            icon: Users,
            title: "Règleman kominotè",
            description: "Respekte chak manman, chak fanmi ak chak pwofesyonèl nan tout entèraksyon ou yo."
          },
          {
            icon: Shield,
            title: "Responsablite itilizatè",
            description: "Ou responsab sa ou pibliye, sa ou pataje ak fason ou itilize sèvis platfòm nan."
          },
          {
            icon: AlertCircle,
            title: "Kontni entèdi",
            description: "Kontni rayisman, diskriminasyon, fo enfòmasyon danjere oswa kontni ilegal entèdi nèt sou platfòm nan."
          },
          {
            icon: FileText,
            title: "Itilizasyon sèvis la",
            description: "Lè ou itilize Lakou Manman, ou dakò pou swiv kondisyon sa yo ak direktiv ofisyèl platfòm nan."
          }
        ],
        relatedTitle: "Resous ki gen rapò",
        relatedLinks: [
          { label: "Direktiv kominotè", href: "/guidelines" },
          { label: "Politik konfidansyalite", href: "/privacy" },
          { label: "Kontak", href: "/contact" }
        ]
      }
    : {
        description: "Règles et principes à suivre pour utiliser Lakou Manman dans le respect de la communauté.",
        sections: [
          {
            icon: Users,
            title: "Directives communautaires",
            description: "Soyez respectueux, bienveillant et constructif dans toutes vos interactions avec les membres et les professionnels."
          },
          {
            icon: Shield,
            title: "Responsabilité utilisateur",
            description: "Vous êtes responsable du contenu que vous publiez, partagez et des usages que vous faites des services de la plateforme."
          },
          {
            icon: AlertCircle,
            title: "Contenu interdit",
            description: "Le contenu haineux, discriminatoire, trompeur ou illégal est strictement interdit sur Lakou Manman."
          },
          {
            icon: FileText,
            title: "Conditions de service",
            description: "En utilisant Lakou Manman, vous acceptez ces conditions ainsi que les directives officielles de la plateforme."
          }
        ],
        relatedTitle: "Ressources associées",
        relatedLinks: [
          { label: "Directives communautaires", href: "/guidelines" },
          { label: "Politique de confidentialité", href: "/privacy" },
          { label: "Contact", href: "/contact" }
        ]
      };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            {t("termsOfService") || "Conditions d'utilisation"}
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
                <Link key={link.href} href={link.href} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-pink-200 hover:text-pink-600">
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
