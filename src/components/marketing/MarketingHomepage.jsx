"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Heart,
  MessageCircle,
  Users,
  Stethoscope,
  BookOpen,
  Sparkles,
  Globe2,
  UserPlus,
  Baby,
  ArrowRight,
  Star,
  Quote,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

const getFeatures = () => [
  {
    icon: MessageCircle,
    titleKey: "communityTitle",
    descKey: "communityDesc",
    color: "from-rose-500 to-pink-500",
  },
  {
    icon: Users,
    titleKey: "supportGroupsTitle",
    descKey: "supportGroupsDesc",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Stethoscope,
    titleKey: "pediatricAdviceTitle",
    descKey: "pediatricAdviceDesc",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: BookOpen,
    titleKey: "educationalResourcesTitle",
    descKey: "educationalResourcesDesc",
    color: "from-purple-500 to-violet-500",
  },
  {
    icon: Sparkles,
    titleKey: "practicalToolsTitle",
    descKey: "practicalToolsDesc",
    color: "from-orange-500 to-amber-500",
  },
  {
    icon: Globe2,
    titleKey: "localResourcesTitle",
    descKey: "localResourcesDesc",
    color: "from-teal-500 to-cyan-500",
  },
];

const getStats = () => [
  { value: "250+", labelKey: "statMothers", icon: Heart },
  { value: "24/7", labelKey: "statSupport", icon: MessageCircle },
  { value: "6", labelKey: "statCities", icon: Globe2 },
  { value: "5", labelKey: "statGroups", icon: Users },
];

const getTestimonials = (language) => (
  language === "ht"
    ? [
        {
          text: "Depi mwen jwenn Lakou Manman, mwen santi mwen pa poukont mwen ankò. Manman nan gwoup la ede mwen anpil.",
          author: "Marie J.",
          location: "Monreyal",
        },
        {
          text: "Resous yo klè, itil epi fasil pou jwenn. Sa ede mwen pran desizyon ak plis trankilite.",
          author: "Fabiola R.",
          location: "Pòtoprens",
        },
        {
          text: "Finalman yon espas kote manman ayisyèn ka pale lib san jijman. Se sa nou te bezwen.",
          author: "Stéphanie L.",
          location: "Miami",
        },
      ]
    : [
        {
          text: "Depuis que j'ai découvert Lakou Manman, je me sens moins seule. Les autres mamans du groupe m'aident énormément.",
          author: "Marie J.",
          location: "Montréal",
        },
        {
          text: "Les ressources sont claires, utiles et faciles à retrouver. Cela m'aide à prendre des décisions avec plus de sérénité.",
          author: "Fabiola R.",
          location: "Port-au-Prince",
        },
        {
          text: "Enfin un espace où les mères haïtiennes peuvent parler librement sans jugement. C'est exactement ce qu'il nous fallait.",
          author: "Stéphanie L.",
          location: "Miami",
        },
      ]
);

const getMarketingPoints = (language) => (
  language === "ht"
    ? [
        {
          icon: Heart,
          title: "Sipò reyèl ant manman",
          description: "Poze kestyon, jwenn konsèy, epi resevwa ankourajman nan yon kominote ki konprann reyalite w.",
        },
        {
          icon: CheckCircle2,
          title: "Resous ki fasil pou itilize",
          description: "Gid, zouti ak kontni pratik pou ede w nan lavi chak jou kòm manman.",
        },
        {
          icon: ShieldCheck,
          title: "Yon espas ki gen konfyans",
          description: "Yon anviwònman cho ak respè kote manman ayisyèn ka pataje san presyon.",
        },
      ]
    : [
        {
          icon: Heart,
          title: "Un vrai soutien entre mamans",
          description: "Posez vos questions, recevez des conseils et trouvez de l'encouragement auprès d'une communauté qui comprend votre réalité.",
        },
        {
          icon: CheckCircle2,
          title: "Des ressources faciles à utiliser",
          description: "Des guides, des outils et du contenu pratique pour vous accompagner au quotidien.",
        },
        {
          icon: ShieldCheck,
          title: "Un espace de confiance",
          description: "Un environnement bienveillant et respectueux où les mères haïtiennes peuvent s'exprimer librement.",
        },
      ]
);

export default function MarketingHomepage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const features = getFeatures();
  const stats = getStats();
  const testimonials = getTestimonials(language);
  const marketingPoints = getMarketingPoints(language);

  return (
    <div className="bg-[#fff0f6] pb-8">
      <section className="mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2.5rem] border border-rose-200 bg-[#ffe0ec] shadow-xl shadow-rose-200/60">
          <div className="grid gap-8 px-5 py-8 sm:px-8 sm:py-10 md:grid-cols-[1.15fr_0.85fr] md:px-12 md:py-14 lg:px-16">
            <div className="flex flex-col justify-center animate-fade-in">
              <h1 className="-mt-2 mb-4 font-brand text-[2.9rem] font-semibold leading-[0.95] tracking-[-0.02em] text-slate-900 sm:-mt-3 sm:mb-5 sm:text-[3.5rem] lg:-mt-4 lg:text-[4.25rem]">
                <span className="gradient-text">Lakou</span>{" "}
                <span className="text-slate-800">Manman</span>
              </h1>
              <div className="overflow-hidden rounded-[2rem] border border-rose-100 bg-white/70 shadow-sm">
                <img
                  src="/photo_accueil.png"
                  alt="Lakou Manman"
                  className="h-auto w-full object-cover"
                />
              </div>
              {!user ? (
                <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
                  <Link href="/register" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full rounded-full bg-gradient-to-r from-[#9B2335] to-[#7B1A2C] px-7 shadow-lg shadow-rose-300 transition-all hover:scale-[1.02] hover:brightness-110 hover:shadow-xl sm:w-auto">
                      <UserPlus className="mr-2 h-4 w-4" /> {t("createAccount")}
                    </Button>
                  </Link>
                  <Link href="/login" className="w-full sm:w-auto">
                    <Button variant="outline" size="lg" className="w-full rounded-full border-rose-200 bg-white px-7 shadow-sm transition-all hover:scale-[1.02] hover:bg-rose-50 sm:w-auto">
                      {t("ctaLogin")} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 animate-slide-up">
              <div className="rounded-[2rem] border border-rose-100 bg-white p-6 shadow-sm">
                <img src="/logo-lakou-manman.png" alt="Lakou Manman" className="h-28 w-auto" />
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {language === "ht"
                    ? "Konekte ak lòt manman, jwenn sipò, pataje eksperyans ou, epi sèvi ak zouti ki vrèman itil."
                    : "Connectez-vous avec d'autres mamans, trouvez du soutien, partagez vos expériences et accédez à des outils réellement utiles."}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {stats.map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <Card
                      key={stat.labelKey}
                      className={`rounded-3xl border border-rose-100 bg-white shadow-sm card-hover ${
                        i === 0 ? "sm:mt-4" : i === 3 ? "sm:-mt-4" : ""
                      }`}
                    >
                      <CardContent className="p-6">
                        <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#9B2335]/10">
                          <Icon className="h-5 w-5 text-[#9B2335]" />
                        </div>
                        <div className="text-3xl font-bold tracking-tight text-slate-900">{stat.value}</div>
                        <div className="mt-1 text-sm text-slate-500">{t(stat.labelKey)}</div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <Badge className="mb-4 rounded-full bg-[#9B2335]/10 px-4 py-1.5 text-[#9B2335]">
            <Sparkles className="mr-1.5 h-3 w-3" /> {t("featuresTitle")}
          </Badge>
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {t("featuresTitle")}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-slate-500">
            {t("featuresSubtitle")}
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.titleKey}
                className="group overflow-hidden rounded-[2rem] border border-rose-100 bg-white shadow-sm card-hover"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <CardHeader className="pb-3">
                  <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color} shadow-lg transition-transform group-hover:scale-110`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <CardTitle className="mt-1 text-xl text-slate-900">{t(feature.titleKey)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-7 text-slate-500">{t(feature.descKey)}</p>
                  <div className={`mt-4 h-1 w-12 rounded-full bg-gradient-to-r ${feature.color} opacity-40 transition-all group-hover:w-20 group-hover:opacity-100`} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <Badge className="mb-4 rounded-full bg-rose-100 px-4 py-1.5 text-rose-700">
            <ShieldCheck className="mr-1.5 h-3 w-3" />
            {language === "ht" ? "Poukisa w ap renmen li" : "Pourquoi vous allez l'aimer"}
          </Badge>
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {language === "ht" ? "Yon akey ki pi klè, pi dous, pi itil" : "Un accueil plus clair, plus doux et plus utile"}
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {marketingPoints.map((point) => {
            const Icon = point.icon;
            return (
              <Card key={point.title} className="rounded-[2rem] border border-rose-100 bg-white shadow-sm">
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100">
                    <Icon className="h-6 w-6 text-[#9B2335]" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{point.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{point.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2.5rem] border border-rose-200 bg-[#fff1f6] p-8 shadow-lg shadow-rose-200/50 md:p-14">
          <div className="mb-10 text-center">
            <Badge className="mb-4 rounded-full bg-rose-100 px-4 py-1.5 text-rose-700">
              <Star className="mr-1.5 h-3 w-3 fill-rose-500" /> {t("testimonialsTitle")}
            </Badge>
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {t("testimonialsTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-500">
              {t("testimonialsSubtitle")}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((item, i) => (
              <div
                key={i}
                className="rounded-2xl border border-rose-100 bg-rose-50/50 p-6 transition-all hover:-translate-y-0.5 hover:shadow-sm"
              >
                <Quote className="mb-3 h-8 w-8 text-rose-300" />
                <p className="text-sm leading-7 text-slate-600">{item.text}</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-pink-500 text-sm font-bold text-white">
                    {item.author[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">{item.author}</div>
                    <div className="text-xs text-slate-500">{item.location}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2.5rem] border border-rose-200 bg-[#ffd8e8] p-10 text-center shadow-xl shadow-rose-200/60 md:p-16">
          <div>
            <div className="mx-auto mb-6 flex h-20 w-20 animate-float items-center justify-center rounded-3xl bg-gradient-to-br from-[#9B2335] to-[#6B1525] shadow-xl shadow-rose-300">
              <div className="text-center">
                <Baby className="h-10 w-10 text-white" />
              </div>
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {t("ctaTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-md text-slate-500">
              {t("ctaDescription")}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              {user ? (
                <Link href="/feed">
                  <Button variant="outline" size="lg" className="rounded-full border-rose-200 bg-white px-8 shadow-sm transition-all hover:scale-[1.02] hover:bg-rose-50">
                    <MessageCircle className="mr-2 h-4 w-4" /> {t("seeCommunity")}
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/register">
                    <Button size="lg" className="rounded-full bg-gradient-to-r from-[#9B2335] to-[#7B1A2C] px-8 shadow-lg shadow-rose-300 transition-all hover:scale-[1.02] hover:brightness-110 hover:shadow-xl">
                      <UserPlus className="mr-2 h-4 w-4" /> {t("ctaButton")}
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="outline" size="lg" className="rounded-full border-rose-300 bg-white px-8 shadow-sm transition-all hover:scale-[1.02] hover:bg-rose-50">
                      <ArrowRight className="mr-2 h-4 w-4" /> {t("login")}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
