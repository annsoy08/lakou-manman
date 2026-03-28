"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Users, Shield, Award, Globe, Target } from "lucide-react";

export default function AboutPage() {
  const { t, language } = useLanguage();

  const quickLinks = language === "ht"
    ? [
        { label: "Antre nan kominote a", href: "/groups" },
        { label: "Dekouvri zouti yo", href: "/outils" },
        { label: "Kontakte ekip la", href: "/contact" }
      ]
    : [
        { label: "Rejoindre la communauté", href: "/groups" },
        { label: "Découvrir les outils", href: "/outils" },
        { label: "Contacter l'équipe", href: "/contact" }
      ];

  const values = [
    {
      icon: Heart,
      title: t("community") || "Communauté",
      description: t("communityDesc") || "Créer un espace sûr pour les mamans haïtiennes"
    },
    {
      icon: Shield,
      title: t("safety") || "Sécurité",
      description: t("safetyDesc") || "Protéger et soutenir nos membres"
    },
    {
      icon: Users,
      title: t("support") || "Soutien",
      description: t("supportDesc") || "Offrir un accompagnement bienveillant"
    },
    {
      icon: Globe,
      title: t("inclusion") || "Inclusion",
      description: t("inclusionDesc") || "Célébrer la diversité culturelle"
    },
    {
      icon: Target,
      title: t("excellence") || "Excellence",
      description: t("excellenceDesc") || "Fournir des services de qualité"
    },
    {
      icon: Award,
      title: t("innovation") || "Innovation",
      description: t("innovationDesc") || "Innover pour mieux servir"
    }
  ];

  const team = [
    language === "ht"
      ? {
          name: "Ann Soraya B. Villiard",
          role: "Fondatris ak CEO Lakou Manman",
          description: "Fondatris platfòm Lakou Manman — kominote dijital pou manman ayisyèn. Manman fanmi, pasyone.",
          phone: "32589391"
        }
      : {
          name: "Ann Soraya B. Villiard",
          role: "Fondatrice et CEO de Lakou Manman",
          description: "Fondatrice de la plateforme Lakou Manman — communauté digitale pour mamans haïtiennes. Mère de famille passionnée.",
          phone: "32589391"
        },
    language === "ht"
      ? {
          name: "Rose-Angeline Thimogène",
          role: "Direktris Operasyon",
          description: "Ekspè nan devlopman kominotè"
        }
      : {
          name: "Rose-Angeline Thimogène",
          role: "Directrice des Opérations",
          description: "Experte en développement communautaire"
        },
    language === "ht"
      ? {
          name: "Mimose Victor",
          role: "Responsab Teknik",
          description: "Espesyalis nan solisyon dijital pou manman"
        }
      : {
          name: "Mimose Victor",
          role: "Responsable Technique",
          description: "Spécialiste des solutions digitales pour mamans"
        }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">
            {t("aboutUs") || "À propos de Lakou Manman"}
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            {t("aboutDescription") || "Lakou Manman est la plateforme de référence pour les mamans haïtiennes, créée par des mamans pour des mamans."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-full bg-white px-5 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:text-pink-600 hover:ring-pink-200">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Mission */}
        <Card className="bg-gradient-to-r from-pink-100 to-purple-100 border-pink-200">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">
              {t("ourMission") || "Notre Mission"}
            </h2>
            <p className="text-slate-700 max-w-2xl mx-auto">
              {t("missionDescription") || "Connecter, soutenir et autonomiser les mamans haïtiennes à travers une plateforme digitale inclusive, sécurisée et enrichissante."}
            </p>
          </CardContent>
        </Card>

        {/* Values */}
        <div>
          <h2 className="text-2xl font-bold text-slate-800 text-center mb-8">
            {t("ourValues") || "Nos Valeurs"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <Card key={index} className="text-center">
                  <CardContent className="p-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-purple-400 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-2">{value.title}</h3>
                    <p className="text-sm text-slate-600">{value.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="text-center">
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-pink-600 mb-2">10,000+</div>
              <div className="text-slate-600">{t("activeMoms") || "Mamans actives"}</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-purple-600 mb-2">50+</div>
              <div className="text-slate-600">{t("expertPartners") || "Partenaires experts"}</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-blue-600 mb-2">1000+</div>
              <div className="text-slate-600">{t("dailyPosts") || "Publications quotidiennes"}</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-green-600 mb-2">98%</div>
              <div className="text-slate-600">{t("satisfaction") || "Satisfaction"}</div>
            </CardContent>
          </Card>
        </div>

        {/* Team */}
        <div>
          <h2 className="text-2xl font-bold text-slate-800 text-center mb-8">
            {t("ourTeam") || "Notre Équipe"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {team.map((member, index) => (
              <Card key={index}>
                <CardContent className="p-6 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-purple-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-white">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-1">{member.name}</h3>
                  <Badge variant="secondary" className="mb-3">{member.role}</Badge>
                  <p className="text-sm text-slate-600">{member.description}</p>
                  {member.phone && (
                    <a href={`tel:${member.phone}`} className="mt-3 inline-flex text-sm font-medium text-pink-600 hover:underline">
                      {member.phone}
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Card className="bg-gradient-to-r from-pink-600 to-purple-600 text-white">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">
              {t("joinUs") || "Rejoignez-nous"}
            </h2>
            <p className="mb-6">
              {t("joinDescription") || "Faites partie de la communauté Lakou Manman et contribuez à changer la vie des mamans haïtiennes."}
            </p>
            <Link href="/groups" className="inline-flex rounded-full bg-white px-5 py-2 text-sm font-medium text-purple-600 transition hover:bg-purple-50">
              {t("getStarted") || "Commencer"}
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
