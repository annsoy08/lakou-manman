"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Stethoscope, Heart, MessageCircle, Sparkles, ArrowRight, ShieldAlert } from "lucide-react";

export default function HealthHubPage() {
  const { t, language } = useLanguage();

  const ui = language === "ht"
    ? {
        title: "Espas lasante",
        description: "Jwenn pedyatri, jinekoloji, sikoloji ak zouti lasante yo nan yon sèl espas pou w ka ale dirèkteman kote ou bezwen an.",
        imageAlt: "Ekspè nan domèn lasante Lakou Manman",
        quickAccess: "Espas ak zouti yo",
        structureTitle: "Selon bezwen ou yo",
        structureItems: [
          "Pedyatri pou tibebe, timoun ak adolesan.",
          "Jinekoloji pou swivi sante fanm ak manman.",
          "Sikoloji pou emosyon, chaj mantal ak sipò fanmi.",
        ],
        emergencyTitle: "Enpòtan",
        emergencyText: "Pou ijans medikal oswa kestyon ki mande dyagnostik pèsonalize, kontakte yon pwofesyonèl lasante oswa yon sant sante dirèkteman.",
        openSpace: "Louvri espas la",
        pediatreDesc: "Konsiltasyon, kontni pedyatrik ak swivi pou tibebe, timoun ak adolesan.",
        gynecoTitle: "Jinekoloji",
        gynecoDesc: "Sante fanm, règ, gwosès, post-partum ak swivi jinekolojik.",
        psychologieTitle: "Sikoloji",
        psychologieDesc: "Byennèt emosyonèl, chaj mantal, estrès ak sipò pou manman ak fanmi.",
        toolsDesc: "Zouti pratik pou vaksen, nitrisyon, ijans ak lòt bezwen sante yo.",
      }
    : {
        title: "Espace santé",
        description: "Retrouvez la pédiatrie, la gynécologie, la psychologie et les outils santé dans un seul espace pour aller directement vers ce dont vous avez besoin.",
        imageAlt: "Experts en santé de Lakou Manman",
        quickAccess: "Espaces et outils",
        structureTitle: "Selon vos besoins",
        structureItems: [
          "Pédiatrie pour bébé, enfant et adolescent.",
          "Gynécologie pour le suivi de la santé des femmes et des mamans.",
          "Psychologie pour les émotions, la charge mentale et le soutien familial.",
        ],
        emergencyTitle: "Important",
        emergencyText: "Pour une urgence médicale ou une question qui demande un diagnostic personnalisé, contactez directement un professionnel ou un centre de santé.",
        openSpace: "Ouvrir l'espace",
        pediatreDesc: "Consultations, contenu pédiatrique et suivi pour bébé, enfant et adolescent.",
        gynecoTitle: "Gynécologie",
        gynecoDesc: "Santé féminine, cycle, grossesse, post-partum et suivi gynécologique.",
        psychologieTitle: "Psychologie",
        psychologieDesc: "Bien-être émotionnel, charge mentale, stress et soutien pour les mamans et les familles.",
        toolsDesc: "Des outils pratiques pour les vaccins, la nutrition, les urgences et les autres besoins santé.",
      };

  const spaces = [
    {
      href: "/pediatre",
      icon: Stethoscope,
      title: t("pediatre") || "Pédiatre",
      description: ui.pediatreDesc,
      accent: "from-sky-500 to-blue-600",
    },
    {
      href: "/gynecologie",
      icon: Heart,
      title: ui.gynecoTitle,
      description: ui.gynecoDesc,
      accent: "from-rose-500 to-pink-600",
    },
    {
      href: "/psychologie",
      icon: MessageCircle,
      title: ui.psychologieTitle,
      description: ui.psychologieDesc,
      accent: "from-violet-500 to-fuchsia-600",
    },
    {
      href: "/outils",
      icon: Sparkles,
      title: t("tools") || "Outils",
      description: ui.toolsDesc,
      accent: "from-amber-500 to-orange-500",
    },
  ];

  return (
    <div className="space-y-8">
      <Card className="health-card-strong overflow-hidden">
        <CardContent className="relative min-h-[460px] p-0 lg:min-h-[540px]">
          <div className="absolute inset-0">
            <Image
              src="/expert_en_sante.png"
              alt={ui.imageAlt}
              fill
              className="object-cover object-[center_12%] md:object-[center_16%]"
              sizes="100vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white/82 via-white/60 to-white/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-rose-100/45 via-white/12 to-transparent" />
          </div>

          <div className="relative grid gap-6 p-6 pt-44 md:p-8 md:pt-52 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:p-10 lg:pt-64">
            <div className="max-w-xl self-end rounded-[1.75rem] border border-white/70 bg-white/78 p-5 shadow-lg backdrop-blur-sm md:p-6">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-rose-600 shadow-sm">
                <Heart className="h-4 w-4" />
                {t("health") || "Santé"}
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 lg:text-4xl">{ui.title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-800 md:text-base">{ui.description}</p>
            </div>

            <Card className="health-card lg:justify-self-end">
              <CardHeader>
                <CardTitle className="text-xl">{ui.structureTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-slate-700">
                  {ui.structureItems.map((item) => (
                    <div key={item} className="health-muted-tile shadow-sm">
                      {item}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-4 text-xl font-semibold text-slate-900">{ui.quickAccess}</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {spaces.map((space) => {
            const Icon = space.icon;
            return (
              <Card key={space.href} className="health-card">
                <CardHeader>
                  <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${space.accent} text-white shadow-sm`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{space.title}</CardTitle>
                  <CardDescription className="text-sm leading-6">{space.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full rounded-2xl bg-slate-900 text-white hover:bg-slate-800">
                    <Link href={space.href}>
                      {ui.openSpace}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Card className="rounded-[2rem] border-amber-200 bg-amber-50 shadow-sm">
        <CardContent className="flex gap-3 p-5 text-sm text-amber-900">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <div className="font-semibold">{ui.emergencyTitle}</div>
            <div className="mt-1 leading-6">{ui.emergencyText}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
