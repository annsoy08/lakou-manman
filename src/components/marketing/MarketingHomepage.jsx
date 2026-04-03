"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMarketingHomepageStats } from "@/lib/firestore";
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
  ChevronLeft,
  ChevronRight,
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

function formatStatValue(value) {
  if (!Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("fr-FR").format(value);
}

const getStats = (stats) => [
  { value: formatStatValue(stats?.membersCount), labelKey: "statMothers", icon: Heart },
  { value: formatStatValue(stats?.exchangesCount), labelKey: "statSupport", icon: MessageCircle },
  { value: formatStatValue(stats?.citiesCount), labelKey: "statCities", icon: Globe2 },
  { value: formatStatValue(stats?.groupsCount), labelKey: "statGroups", icon: Users },
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
          title: "Yon akey fasil pou konprann",
          description: "Sa ki pi enpòtan yo parèt byen vit pou ede w antre, li epi aji san konfizyon.",
        },
        {
          icon: CheckCircle2,
          title: "Bon repè ki konkrè",
          description: "Kontni, konsèy ak zouti yo prezante pou yo rete pratik, itil epi fasil pou jwenn.",
        },
        {
          icon: ShieldCheck,
          title: "Yon kad ki pi trankil",
          description: "Eksperyans lan chèche mete respè, dousè ak konfyans anvan bri ak presyon.",
        },
      ]
    : [
        {
          icon: Heart,
          title: "Un accueil facile à comprendre",
          description: "L'essentiel apparaît rapidement pour vous aider à entrer, lire et agir sans confusion.",
        },
        {
          icon: CheckCircle2,
          title: "Des repères concrets",
          description: "Les contenus, conseils et outils sont présentés pour rester pratiques, utiles et faciles à retrouver.",
        },
        {
          icon: ShieldCheck,
          title: "Un cadre plus serein",
          description: "L'expérience met en avant le respect, la douceur et la confiance avant le bruit et la pression.",
        },
      ]
);

const heroSlides = [
  {
    src: "/photo_accueil.png",
    altFr: "Mamans ayisyennes réunies avec leurs enfants",
    altHt: "Manman ayisyèn ansanm ak pitit yo",
    objectPosition: "center",
    fit: "cover",
  },
  {
    src: "/photo2.png",
    altFr: "Mamans souriantes mises en avant sur Lakou Manman",
    altHt: "Bèl foto manman k ap souri sou Lakou Manman",
    objectPosition: "center top",
    fit: "contain",
  },
  {
    src: "/photo3.png",
    altFr: "Mamans et enfants rassemblés en extérieur",
    altHt: "Manman ak timoun reyini deyò ansanm",
    objectPosition: "center",
    fit: "cover",
  },
];

export default function MarketingHomepage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const features = getFeatures();
  const testimonials = getTestimonials(language);
  const marketingPoints = getMarketingPoints(language);
  const [homepageStats, setHomepageStats] = useState(null);
  const [activeHeroSlide, setActiveHeroSlide] = useState(heroSlides.length > 1 ? 1 : 0);
  const [isHeroTransitionEnabled, setIsHeroTransitionEnabled] = useState(true);
  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const [heroRenderVersion, setHeroRenderVersion] = useState(0);
  const touchStartXRef = useRef(null);
  const touchCurrentXRef = useRef(null);
  const loopedHeroSlides = heroSlides.length > 1
    ? [heroSlides[heroSlides.length - 1], ...heroSlides, heroSlides[0]]
    : heroSlides;
  const visibleHeroSlide = heroSlides.length > 1
    ? (activeHeroSlide - 1 + heroSlides.length) % heroSlides.length
    : 0;
  const stats = getStats(homepageStats);

  useEffect(() => {
    let isMounted = true;

    getMarketingHomepageStats()
      .then((nextStats) => {
        if (!isMounted) {
          return;
        }

        setHomepageStats(nextStats);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setHomepageStats(null);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    heroSlides.forEach((slide) => {
      const image = new window.Image();
      image.src = slide.src;
    });

    return undefined;
  }, []);

  useEffect(() => {
    if (heroSlides.length < 2 || isHeroPaused) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      goToNextHeroSlide();
    }, 4500);

    return () => window.clearInterval(intervalId);
  }, [isHeroPaused]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return undefined;
    }

    function refreshHeroCarousel() {
      if (heroSlides.length < 2) {
        setHeroRenderVersion((currentVersion) => currentVersion + 1);
        return;
      }

      setIsHeroTransitionEnabled(false);
      setActiveHeroSlide((currentIndex) => {
        const normalizedIndex = ((currentIndex - 1) % heroSlides.length + heroSlides.length) % heroSlides.length;
        return normalizedIndex + 1;
      });
      setHeroRenderVersion((currentVersion) => currentVersion + 1);

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setIsHeroTransitionEnabled(true);
        });
      });
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        setIsHeroPaused(true);
        return;
      }

      setIsHeroPaused(false);
      refreshHeroCarousel();
    }

    function handlePageShow() {
      refreshHeroCarousel();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  function goToNextHeroSlide() {
    setIsHeroTransitionEnabled(true);
    setActiveHeroSlide((currentIndex) => currentIndex + 1);
  }

  function goToPreviousHeroSlide() {
    setIsHeroTransitionEnabled(true);
    setActiveHeroSlide((currentIndex) => currentIndex - 1);
  }

  function handleHeroTrackTransitionEnd() {
    if (heroSlides.length < 2) {
      return undefined;
    }

    if (activeHeroSlide === 0) {
      setIsHeroTransitionEnabled(false);
      setActiveHeroSlide(heroSlides.length);

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setIsHeroTransitionEnabled(true);
        });
      });

      return undefined;
    }

    if (activeHeroSlide !== heroSlides.length + 1) {
      return undefined;
    }

    setIsHeroTransitionEnabled(false);
    setActiveHeroSlide(1);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setIsHeroTransitionEnabled(true);
      });
    });

    return undefined;
  }

  function handleHeroDotClick(nextIndex) {
    setIsHeroTransitionEnabled(true);
    setActiveHeroSlide(nextIndex + 1);
  }

  function handleHeroTouchStart(event) {
    const touchPoint = event.touches[0];
    touchStartXRef.current = touchPoint?.clientX ?? null;
    touchCurrentXRef.current = touchPoint?.clientX ?? null;
    setIsHeroPaused(true);
  }

  function handleHeroTouchMove(event) {
    const touchPoint = event.touches[0];
    touchCurrentXRef.current = touchPoint?.clientX ?? null;
  }

  function handleHeroTouchEnd() {
    const startX = touchStartXRef.current;
    const endX = touchCurrentXRef.current;
    const swipeDistance = startX != null && endX != null ? endX - startX : 0;

    touchStartXRef.current = null;
    touchCurrentXRef.current = null;
    setIsHeroPaused(false);

    if (Math.abs(swipeDistance) < 40) {
      return;
    }

    if (swipeDistance > 0) {
      goToPreviousHeroSlide();
      return;
    }

    goToNextHeroSlide();
  }

  return (
    <div className="bg-[radial-gradient(circle_at_top,_rgba(244,114,182,0.28),_transparent_32%),linear-gradient(180deg,_#fff2f7_0%,_#ffe0eb_26%,_#ffd4e4_62%,_#fff0f6_100%)] pb-10">
      <section className="mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2.75rem] border border-[#f0b7cc] bg-[linear-gradient(135deg,_rgba(255,224,235,0.99)_0%,_rgba(255,201,223,0.97)_54%,_rgba(248,170,204,0.94)_100%)] shadow-[0_26px_80px_-42px_rgba(190,24,93,0.22)]">
          <div className="grid gap-8 px-5 py-8 sm:px-8 sm:py-10 md:grid-cols-[1.12fr_0.88fr] md:px-12 md:py-14 lg:gap-10 lg:px-16">
            <div className="flex flex-col justify-center animate-fade-in">
              <h1 className="mb-4 font-brand text-[2.9rem] font-semibold leading-[0.95] tracking-[-0.02em] text-slate-950 sm:mb-5 sm:text-[3.5rem] lg:text-[4.25rem]">
                <span className="gradient-text">Lakou</span>{" "}
                <span className="text-[#243248]">Manman</span>
              </h1>
              <p className="mb-6 max-w-xl font-display text-[1.1rem] leading-[1.45] tracking-[-0.015em] text-[#334155] sm:mb-7 sm:text-[1.24rem] lg:text-[1.34rem]">
                {t("homeHeroDescription")}
              </p>
              <div className="overflow-hidden rounded-[2rem] border border-[#f4bfd3] bg-[linear-gradient(180deg,_rgba(255,235,243,0.98)_0%,_rgba(255,205,223,0.96)_100%)] shadow-[0_22px_60px_-40px_rgba(190,24,93,0.2)] backdrop-blur-md">
                <div
                  className="relative h-[280px] w-full touch-pan-y sm:h-[360px] lg:h-[400px]"
                  onMouseEnter={() => setIsHeroPaused(true)}
                  onMouseLeave={() => setIsHeroPaused(false)}
                  onTouchStart={handleHeroTouchStart}
                  onTouchMove={handleHeroTouchMove}
                  onTouchEnd={handleHeroTouchEnd}
                >
                  <div
                    key={`hero-track-${heroRenderVersion}`}
                    className={`flex h-full w-full ease-out ${isHeroTransitionEnabled ? "transition-transform duration-700" : "transition-none"}`}
                    style={{ transform: `translateX(-${activeHeroSlide * 100}%)` }}
                    onTransitionEnd={handleHeroTrackTransitionEnd}
                  >
                    {loopedHeroSlides.map((slide, slideIndex) => (
                      <div key={`${slide.src}-${slideIndex}`} className="relative h-full min-w-full overflow-hidden">
                        <img
                          src={slide.src}
                          alt=""
                          aria-hidden="true"
                          loading="eager"
                          decoding="async"
                          className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl"
                          style={{ objectPosition: slide.objectPosition, opacity: slide.fit === "contain" ? 0.45 : 0.18 }}
                        />
                        <img
                          src={slide.src}
                          alt={language === "ht" ? slide.altHt : slide.altFr}
                          loading="eager"
                          decoding="async"
                          draggable="false"
                          className={`relative h-full w-full ${slide.fit === "contain" ? "object-contain px-3 py-2 sm:px-5 sm:py-4" : "object-cover"}`}
                          style={{ objectPosition: slide.objectPosition }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-white/22 via-[#f7dce6]/10 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#b14a6a]/12 to-transparent" />
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    aria-label="Slide précédente"
                    onClick={goToPreviousHeroSlide}
                    className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/85 bg-white/88 text-[#7B1A2C] shadow-lg shadow-[#7B1A2C]/12 backdrop-blur transition-all hover:scale-105 hover:bg-white sm:left-4"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Slide suivante"
                    onClick={goToNextHeroSlide}
                    className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/85 bg-white/88 text-[#7B1A2C] shadow-lg shadow-[#7B1A2C]/12 backdrop-blur transition-all hover:scale-105 hover:bg-white sm:right-4"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="pointer-events-none absolute left-5 top-5 rounded-full border border-white/85 bg-white/88 px-3 py-1 text-xs font-medium text-[#9B2335] shadow-sm backdrop-blur sm:left-6 sm:top-6">
                    {visibleHeroSlide + 1}/{heroSlides.length}
                  </div>
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white/28 to-transparent" />
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white/28 to-transparent" />
                  <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/85 bg-white/88 px-3 py-2 shadow-lg shadow-[#7B1A2C]/12 backdrop-blur">
                    {heroSlides.map((slide, index) => (
                      <button
                        key={`${slide.src}-dot`}
                        type="button"
                        aria-label={language === "ht" ? slide.altHt : slide.altFr}
                        onClick={() => handleHeroDotClick(index)}
                        className={`h-2.5 rounded-full transition-all duration-300 ${index === visibleHeroSlide ? "w-8 bg-[#9B2335]" : "w-2.5 bg-[#9B2335]/28 hover:bg-[#9B2335]/45"}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              {!user ? (
                <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:gap-4">
                  <Link href="/register" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full rounded-full bg-gradient-to-r from-[#f472b6] via-[#e879f9] to-[#60a5fa] px-7 text-slate-950 shadow-[0_20px_45px_-20px_rgba(192,132,252,0.7)] transition-all hover:scale-[1.02] hover:brightness-105 hover:shadow-[0_24px_52px_-20px_rgba(96,165,250,0.6)] sm:w-auto">
                      <UserPlus className="mr-2 h-4 w-4" /> {t("createAccount")}
                    </Button>
                  </Link>
                  <Link href="/login" className="w-full sm:w-auto">
                    <Button variant="outline" size="lg" className="w-full rounded-full border-white/90 bg-white/86 px-7 text-[#243248] shadow-sm transition-all hover:scale-[1.02] hover:bg-white hover:text-[#243248] sm:w-auto">
                      {t("ctaLogin")} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 animate-slide-up lg:gap-5">
              <div className="rounded-[2rem] border border-white bg-white p-6 shadow-[0_24px_80px_-46px_rgba(36,50,72,0.2)] ring-1 ring-white/70 lg:p-7">
                <img src="/logo-lakou-manman.png" alt="Lakou Manman" className="h-24 w-auto sm:h-28" />
                <h2 className="mt-5 text-2xl font-semibold tracking-tight text-[#243248]">
                  {t("homeHeroCardTitle")}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-[0.95rem]">
                  {t("homeHeroCardDescription")}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {stats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <Card
                      key={stat.labelKey}
                      className="rounded-3xl border border-white bg-white shadow-[0_18px_50px_-40px_rgba(36,50,72,0.16)] card-hover"
                    >
                      <CardContent className="p-5 sm:p-6">
                        <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#9B2335]/10">
                          <Icon className="h-5 w-5 text-[#9B2335]" />
                        </div>
                        <div className="text-3xl font-bold tracking-tight text-[#243248]">{stat.value}</div>
                        <div className="mt-1 text-sm font-medium text-slate-600">{t(stat.labelKey)}</div>
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
          <Badge className="mb-4 rounded-full border border-[#9B2335]/10 bg-[#9B2335]/8 px-4 py-1.5 text-[#7B1A2C]">
            <Sparkles className="mr-1.5 h-3 w-3" /> {t("featuresTitle")}
          </Badge>
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {t("featuresTitle")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-700">
            {t("featuresSubtitle")}
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.titleKey}
                className="group overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.95)_0%,_rgba(246,241,248,0.98)_100%)] shadow-[0_20px_60px_-42px_rgba(83,41,86,0.34)] card-hover transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_70px_-42px_rgba(83,41,86,0.4)]"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <CardHeader className="pb-3">
                  <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color} shadow-lg transition-transform group-hover:scale-110`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <CardTitle className="mt-1 text-xl text-[#7a284d]">{t(feature.titleKey)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-7 text-[#48627f]">{t(feature.descKey)}</p>
                  <div className={`mt-4 h-1 w-12 rounded-full bg-gradient-to-r ${feature.color} opacity-40 transition-all group-hover:w-20 group-hover:opacity-100`} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <Badge className="mb-4 rounded-full border border-[#9B2335]/10 bg-[#9B2335]/8 px-4 py-1.5 text-[#7B1A2C]">
            <ShieldCheck className="mr-1.5 h-3 w-3" />
            {language === "ht" ? "Eksperyans lan" : "L'expérience"}
          </Badge>
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {language === "ht" ? "Yon eksperyans ki pi klè depi premye minit la" : "Une expérience plus claire dès les premières minutes"}
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {marketingPoints.map((point) => {
            const Icon = point.icon;
            return (
              <Card key={point.title} className="rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.96)_0%,_rgba(245,240,247,0.98)_100%)] shadow-[0_20px_60px_-42px_rgba(83,41,86,0.3)]">
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#9B2335]/10">
                    <Icon className="h-6 w-6 text-[#9B2335]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#7a284d]">{point.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#48627f]">{point.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2.5rem] border border-[#4f395f]/12 bg-[linear-gradient(135deg,_rgba(255,247,251,0.9)_0%,_rgba(245,238,247,0.94)_52%,_rgba(234,240,249,0.95)_100%)] p-8 shadow-[0_28px_90px_-48px_rgba(31,41,55,0.36)] md:p-14">
          <div className="mb-10 text-center">
            <Badge className="mb-4 rounded-full border border-[#9B2335]/10 bg-[#9B2335]/8 px-4 py-1.5 text-[#7B1A2C]">
              <Star className="mr-1.5 h-3 w-3 fill-rose-500" /> {t("testimonialsTitle")}
            </Badge>
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              {t("testimonialsTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-700">
              {t("testimonialsSubtitle")}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((item, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.95)_0%,_rgba(246,241,248,0.98)_100%)] p-6 shadow-[0_18px_50px_-38px_rgba(83,41,86,0.26)] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_54px_-36px_rgba(83,41,86,0.32)]"
              >
                <div className="mb-3 flex items-center gap-1 text-rose-400">
                  {Array.from({ length: 5 }).map((_, starIndex) => (
                    <Star key={`${item.author}-${starIndex}`} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <Quote className="mb-3 h-8 w-8 text-rose-300" />
                <p className="text-sm leading-7 text-[#48627f]">{item.text}</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-pink-500 text-sm font-bold text-white">
                    {item.author[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#7a284d]">{item.author}</div>
                    <div className="text-xs text-[#5e7590]">{item.location}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="relative isolate overflow-hidden rounded-[2.75rem] border border-white/10 bg-[linear-gradient(135deg,_rgba(28,24,54,0.98)_0%,_rgba(98,38,75,0.95)_45%,_rgba(24,50,78,0.95)_100%)] p-10 text-center shadow-[0_34px_110px_-44px_rgba(15,23,42,0.68)] md:p-16">
          <div className="pointer-events-none absolute -left-12 top-0 h-40 w-40 rounded-full bg-fuchsia-300/18 blur-3xl" />
          <div className="pointer-events-none absolute -right-12 bottom-0 h-44 w-44 rounded-full bg-sky-300/18 blur-3xl" />
          <div className="relative">
            <div className="mx-auto mb-6 flex h-20 w-20 animate-float items-center justify-center rounded-3xl bg-gradient-to-br from-[#f472b6] via-[#e879f9] to-[#60a5fa] shadow-[0_20px_50px_-18px_rgba(192,132,252,0.7)]">
              <div className="text-center">
                <Baby className="h-10 w-10 text-white" />
              </div>
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t("ctaTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[#f7dced] drop-shadow-[0_8px_24px_rgba(15,23,42,0.45)]">
              {t("ctaDescription")}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              {user ? (
                <Link href="/feed">
                  <Button variant="outline" size="lg" className="rounded-full border-white/16 bg-white/10 px-8 text-white shadow-sm transition-all hover:scale-[1.02] hover:bg-white/16 hover:text-white">
                    <MessageCircle className="mr-2 h-4 w-4" /> {t("seeCommunity")}
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/register">
                    <Button size="lg" className="rounded-full bg-gradient-to-r from-[#f472b6] via-[#e879f9] to-[#60a5fa] px-8 text-slate-950 shadow-[0_22px_54px_-18px_rgba(192,132,252,0.72)] transition-all hover:scale-[1.02] hover:brightness-105 hover:shadow-[0_26px_58px_-18px_rgba(96,165,250,0.66)]">
                      <UserPlus className="mr-2 h-4 w-4" /> {t("ctaButton")}
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="outline" size="lg" className="rounded-full border-white/16 bg-white/10 px-8 text-white shadow-sm transition-all hover:scale-[1.02] hover:bg-white/16 hover:text-white">
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
