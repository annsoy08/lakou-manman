"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { X, Gift, Heart, Baby, Sparkles, ShoppingBag, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const promos = [
  {
    id: "fete-meres",
    icon: Heart,
    title: "Bòn Fèt Manman!",
    description: "Jwenn sipriz espesyal pou Fèt Manman yo — rabè, kado, ak plis ankò!",
    cta: "Wè sipriz yo",
    link: "/guides",
    gradient: "linear-gradient(135deg, #ff6b8a 0%, #ee2d5f 50%, #c2185b 100%)",
    btnColor: "#c2185b",
  },
  {
    id: "nouvo-manman",
    icon: Baby,
    title: "Nouvo manman? Byenveni!",
    description: "Kreye kont ou gratis epi jwenn yon guide konplè pou premye 3 mwa tibebe a.",
    cta: "Enskri gratis",
    link: "/register",
    gradient: "linear-gradient(135deg, #3b82f6 0%, #1e40af 50%, #1e3a8a 100%)",
    btnColor: "#1e3a8a",
  },
  {
    id: "guide-gratuit",
    icon: Gift,
    title: "Guide gratuit disponib!",
    description: "Telechaje guide \"Premye jou ak tibebe\" — konsèy pratik pou nouvo manman.",
    cta: "Telechaje kounye a",
    link: "/guides",
    gradient: "linear-gradient(135deg, #ff8a65 0%, #ff5722 50%, #e64a19 100%)",
    btnColor: "#e64a19",
  },
  {
    id: "kominote",
    icon: Sparkles,
    title: "Rejwenn 1,200+ manman!",
    description: "Pataje eksperyans ou, poze kestyon, epi jwenn sipò nan men lòt manman yo.",
    cta: "Antre nan kominote a",
    link: "/feed",
    gradient: "linear-gradient(135deg, #26c6da 0%, #00acc1 50%, #00838f 100%)",
    btnColor: "#00838f",
  },
  {
    id: "boutik",
    icon: ShoppingBag,
    title: "Boutik Lakou Manman",
    description: "Achte oswa vann atik pou timoun — rad, jwèt, mèb, ak plis ankò!",
    cta: "Vizite boutik la",
    link: "/boutique",
    gradient: "linear-gradient(135deg, #ff4081 0%, #f50057 50%, #c51162 100%)",
    btnColor: "#c51162",
  },
];

export default function PromoBanner() {
  const [current, setCurrent] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [sliding, setSliding] = useState(false);
  const [direction, setDirection] = useState("right");

  const goTo = useCallback((idx, dir = "right") => {
    if (sliding) return;
    setDirection(dir);
    setSliding(true);
    setTimeout(() => {
      setCurrent(idx);
      setTimeout(() => setSliding(false), 50);
    }, 300);
  }, [sliding]);

  const next = useCallback(() => {
    goTo((current + 1) % promos.length, "right");
  }, [current, goTo]);

  const prev = useCallback(() => {
    goTo((current - 1 + promos.length) % promos.length, "left");
  }, [current, goTo]);

  useEffect(() => {
    const interval = setInterval(next, 5000);
    return () => clearInterval(interval);
  }, [next]);

  if (dismissed) return null;

  const promo = promos[current];
  const Icon = promo.icon;

  const slideClass = sliding
    ? direction === "right"
      ? "translate-x-full opacity-0"
      : "-translate-x-full opacity-0"
    : "translate-x-0 opacity-100";

  return (
    <div className="relative overflow-hidden shadow-sm" style={{ background: promo.gradient }}>
      <div className="absolute inset-0">
        <div className="absolute -left-16 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -right-16 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute left-1/3 -top-10 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
      </div>

      <div className="app-shell-container relative py-3.5">
        <div className="flex items-start gap-2 sm:items-center">
          <button
            onClick={prev}
            className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-all hover:bg-white/25 hover:scale-110"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className={`flex min-w-0 flex-1 flex-col gap-3 transition-all duration-300 ease-in-out sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${slideClass}`}>
            <div className="flex min-w-0 items-start gap-3 sm:items-center">
              <div className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 shadow-inner">
                <Icon className="h-5 w-5 text-white drop-shadow" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="line-clamp-1 text-sm font-bold text-white drop-shadow sm:text-base">{promo.title}</span>
                  <span className="hidden md:inline-flex rounded-full bg-white/25 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm">
                    Promo
                  </span>
                </div>
                <p className="line-clamp-2 text-xs text-white/85 sm:truncate sm:text-sm">{promo.description}</p>
              </div>
            </div>
            <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
              <Link href={promo.link} className="w-full sm:w-auto">
                <Button
                  size="sm"
                  className="w-full rounded-full bg-white px-4 text-sm font-bold shadow-lg transition-all hover:scale-105 hover:bg-white/95 hover:shadow-xl sm:w-auto sm:px-5"
                  style={{ color: promo.btnColor }}
                >
                  {promo.cta}
                </Button>
              </Link>
            </div>
          </div>

          <button
            onClick={next}
            className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-all hover:bg-white/25 hover:scale-110"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/50 transition-all hover:bg-white/15 hover:text-white"
            aria-label="Fèmen"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-center gap-1.5">
          {promos.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i, i > current ? "right" : "left")}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? "h-2 w-6 bg-white shadow-sm"
                  : "h-2 w-2 bg-white/35 hover:bg-white/55"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
