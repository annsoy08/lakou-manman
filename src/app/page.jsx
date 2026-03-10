"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

const getFeatures = (t) => [
  {
    icon: MessageCircle,
    titleKey: "communityTitle",
    descKey: "communityDesc",
    color: "from-rose-500 to-pink-500",
    bg: "bg-gradient-to-br from-rose-50 to-pink-50",
  },
  {
    icon: Users,
    titleKey: "supportGroupsTitle",
    descKey: "supportGroupsDesc",
    color: "from-blue-500 to-cyan-500",
    bg: "bg-gradient-to-br from-blue-50 to-cyan-50",
  },
  {
    icon: Stethoscope,
    titleKey: "pediatricAdviceTitle",
    descKey: "pediatricAdviceDesc",
    color: "from-green-500 to-emerald-500",
    bg: "bg-gradient-to-br from-green-50 to-emerald-50",
  },
  {
    icon: BookOpen,
    titleKey: "educationalResourcesTitle",
    descKey: "educationalResourcesDesc",
    color: "from-purple-500 to-violet-500",
    bg: "bg-gradient-to-br from-purple-50 to-violet-50",
  },
  {
    icon: Sparkles,
    titleKey: "practicalToolsTitle",
    descKey: "practicalToolsDesc",
    color: "from-orange-500 to-amber-500",
    bg: "bg-gradient-to-br from-orange-50 to-amber-50",
  },
  {
    icon: Globe2,
    titleKey: "localResourcesTitle",
    descKey: "localResourcesDesc",
    color: "from-teal-500 to-cyan-500",
    bg: "bg-gradient-to-br from-teal-50 to-cyan-50",
  },
];

const AboutSection = ({ t }) => (
  <section className="py-20">
    <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-gradient-to-br from-rose-50 to-pink-50 p-8 shadow-lg">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {t("aboutTitle")}
        </h2>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          {t("siteDescription")}
        </p>
      </div>
    </div>
  </section>
);

const getStats = (t) => [
  { value: "250+", labelKey: "statMothers", icon: Heart },
  { value: "24/7", labelKey: "statSupport", icon: MessageCircle },
  { value: "6", labelKey: "statCities", icon: Globe2 },
  { value: "5", labelKey: "statGroups", icon: Users },
];

const testimonials = [
  {
    text: "Depi mwen jwenn Lakou Manman, mwen santi mwen pa poukont mwen ankò. Manman nan gwoup la ede mwen anpil.",
    author: "Marie J.",
    location: "Montréal",
  },
  {
    text: "Quiz dòmi a te ede mwen konprann poukisa tibebe m pa t ap dòmi byen. Mèsi!",
    author: "Fabiola R.",
    location: "Pòtoprens",
  },
  {
    text: "Finalman yon espas kote manman ayisyèn ka pale lib san jijman. Se sa nou te bezwen.",
    author: "Stéphanie L.",
    location: "Miami",
  },
];

export default function LandingPage() {
  const { t } = useLanguage();
  const features = getFeatures(t);
  const stats = getStats(t);
  
  return (
    <div className="space-y-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[2.5rem] gradient-hero shadow-lg">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-rose-200 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-pink-200 blur-3xl" />
          <div className="absolute left-1/2 top-1/3 h-48 w-48 rounded-full bg-pink-200 blur-3xl" />
        </div>
        <div className="relative grid gap-10 p-8 md:grid-cols-2 md:p-14 lg:p-16">
          <div className="flex flex-col justify-center animate-fade-in">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-rose-100/80 px-4 py-1.5 text-rose-700 shadow-sm hover:bg-rose-100">
                <Heart className="mr-1.5 h-3 w-3 fill-rose-500" /> {t("mission")}
              </Badge>
            </div>
            <h1 className="font-display text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              <span className="gradient-text">Lakou</span>{" "}
              <span className="text-slate-800">Manman</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
              {t("siteDescription")}
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link href="/register">
                <Button size="lg" className="rounded-full bg-gradient-to-r from-[#9B2335] to-[#7B1A2C] px-7 shadow-lg shadow-rose-300 transition-all hover:shadow-xl hover:brightness-110 hover:scale-[1.02]">
                  <UserPlus className="mr-2 h-4 w-4" /> {t("createAccount")}
                </Button>
              </Link>
              <Link href="/feed">
                <Button variant="outline" size="lg" className="rounded-full px-7 shadow-sm transition-all hover:scale-[1.02]">
                  <MessageCircle className="mr-2 h-4 w-4" /> {t("seeCommunity")}
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 animate-slide-up">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={stat.labelKey}
                  className={`glass rounded-3xl border-white/60 shadow-md card-hover ${
                    i === 0 ? "mt-6" : i === 3 ? "-mt-6" : ""
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#9B2335]/10">
                      <Icon className="h-5 w-5 text-[#9B2335]" />
                    </div>
                    <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
                    <div className="mt-1 text-sm text-slate-500">{t(stat.labelKey)}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section>
        <div className="mb-10 text-center">
          <Badge className="mb-4 rounded-full bg-[#9B2335]/10 px-4 py-1.5 text-[#9B2335]">
            <Sparkles className="mr-1.5 h-3 w-3" /> {t("featuresTitle")}
          </Badge>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
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
                className="group rounded-[2rem] border-0 shadow-sm card-hover overflow-hidden"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <CardHeader className="pb-3">
                  <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color} shadow-lg transition-transform group-hover:scale-110`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <CardTitle className="mt-1 text-xl">{t(feature.titleKey)}</CardTitle>
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

      {/* Testimonials */}
      <section className="overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 md:p-14">
        <div className="mb-10 text-center">
          <Badge className="mb-4 rounded-full bg-white/10 px-4 py-1.5 text-rose-300">
            <Star className="mr-1.5 h-3 w-3 fill-rose-400" /> {t("testimonialsTitle")}
          </Badge>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {t("testimonialsTitle")}
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="rounded-2xl bg-white/5 p-6 backdrop-blur-sm border border-white/10 transition-all hover:bg-white/10"
            >
              <Quote className="mb-3 h-8 w-8 text-rose-400/60" />
              <p className="text-sm leading-7 text-slate-300">{t.text}</p>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-pink-500 text-sm font-bold text-white">
                  {t.author[0]}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{t.author}</div>
                  <div className="text-xs text-slate-400">{t.location}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden rounded-[2.5rem] p-10 text-center md:p-16">
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute right-1/4 top-0 h-64 w-64 rounded-full bg-rose-300 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 h-48 w-48 rounded-full bg-pink-300 blur-3xl" />
        </div>
        <div className="relative">
          <div className="mx-auto mb-6 flex h-20 w-20 animate-float items-center justify-center rounded-3xl bg-gradient-to-br from-[#9B2335] to-[#6B1525] shadow-xl shadow-rose-300">
            <div className="text-center">
              <Baby className="h-10 w-10 text-white" />
            </div>
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t("ctaTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-slate-500">
            {t("ctaDescription")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="rounded-full bg-gradient-to-r from-[#9B2335] to-[#7B1A2C] px-8 shadow-lg shadow-rose-300 transition-all hover:shadow-xl hover:brightness-110 hover:scale-[1.02]">
                <UserPlus className="mr-2 h-4 w-4" /> {t("ctaButton")}
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="rounded-full px-8 shadow-sm transition-all hover:scale-[1.02]">
                {t("ctaLogin")} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
