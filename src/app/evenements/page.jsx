"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { createEventBooking, subscribeToEventPartners } from "@/lib/firestore";
import {
  CalendarDays,
  Palette,
  Users,
  ShieldCheck,
  Heart,
  ArrowRight,
  Gift,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Baby,
  Cake,
  PartyPopper,
  Wand2,
  Phone,
  MessageSquare,
  ClipboardList,
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfDay,
} from "date-fns";
import { fr } from "date-fns/locale";

const FALLBACK_PARTNER = {
  id: "eventoria",
  name: "Eventoria",
  subtitle: "by Lakou Manman",
  taglineFr: "Chaque détail, un moment magique \u2665",
  taglineHt: "Chak detay, yon moman majik \u2665",
  descFr:
    "Spécialiste des célébrations familiales\u00a0: baby shower, anniversaires d\u2019enfants, fêtes privées. Eventoria crée pour vous des souvenirs d\u2019une beauté inoubliable.",
  descHt:
    "Espesyalis selebrasyon fanmi\u00a0: baby shower, anivèsè timoun, fèt prive. Eventoria kreye pou ou souvni ou pap janm bliye.",
  servicesFr: [
    "Baby Shower",
    "Gender Reveal",
    "Anniversaire (enfant / adulte)",
    "Welcome Baby (Sip & See)",
    "Baptême / Présentation religieuse",
    "Fête de naissance",
    "Premier anniversaire (Smash Cake)",
    "Fête prénatale (Blessingway)",
    "Fête de révélation du prénom",
    "Journée mère-enfant (célébration privée)",
    "Première Communion",
  ],
  servicesHt: [
    "Baby Shower",
    "Gender Reveal",
    "Anivèsè (timoun / granmoun)",
    "Byenveni Bebe (Sip & See)",
    "Batèm / Prezantasyon Relijye",
    "Fèt Nesans",
    "Premye Anivèsè (Smash Cake)",
    "Fèt Prenatal (Blessingway)",
    "Fèt Revelasyon Non",
    "Jounen Manman-Pitit (Selebrasyon Prive)",
    "Premye Kominyon",
  ],
  email: "contact@eventoria.com",
  phone: "+509 00 00 00 00",
  gradient: "from-rose-400 to-pink-500",
  accent: "text-rose-600",
  border: "border-rose-100",
  bg: "bg-rose-50",
  heroSrc: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=900&q=85",
};

const GALLERY = [
  {
    src: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=80",
    labelFr: "Anniversaire d\u2019enfant",
    labelHt: "Anivèsè timoun",
    partner: "Eventoria",
  },
  {
    src: "https://images.unsplash.com/photo-1544126592-807ade215a0b?w=600&q=80",
    labelFr: "Baby Shower",
    labelHt: "Baby Shower",
    partner: "Eventoria",
  },
  {
    src: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&q=80",
    labelFr: "\u00c9v\u00e9nement priv\u00e9",
    labelHt: "Ev\u00e8nman prive",
    partner: "Eventoria",
  },
  {
    src: "https://images.unsplash.com/photo-1478146059778-26028b07395a?w=600&q=80",
    labelFr: "\u00c9v\u00e9nement sur mesure",
    labelHt: "Ev\u00e8nman p\u00e8sonalize",
    partner: "Eventoria",
  },
];


function CalendarPicker({ isFr, selected, onSelect }) {
  const today = startOfDay(new Date());
  const [viewMonth, setViewMonth] = useState(new Date());
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
  });
  const weekDays = isFr
    ? ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"]
    : ["Li", "Ma", "Mè", "Je", "Ve", "Sa", "Di"];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setViewMonth(subMonths(viewMonth, 1))}
          className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-bold capitalize text-rose-900">
          {format(viewMonth, "MMMM yyyy", { locale: fr })}
        </p>
        <button type="button" onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center">
        {weekDays.map((d) => (
          <span key={d} className="py-1 text-[11px] font-bold uppercase text-rose-300">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {days.map((day) => {
          const inMonth = isSameMonth(day, viewMonth);
          const past = isBefore(day, today);
          const sel = selected && isSameDay(day, selected);
          const tod = isSameDay(day, today);
          return (
            <button key={day.toISOString()} type="button"
              disabled={past || !inMonth} onClick={() => onSelect(day)}
              className={[
                "mx-auto flex h-9 w-9 items-center justify-center rounded-2xl text-sm font-medium transition",
                !inMonth || past ? "cursor-default text-slate-200" : "hover:bg-rose-50 hover:text-rose-600",
                sel ? "bg-gradient-to-br from-rose-500 to-fuchsia-500 !text-white shadow-md" : "",
                tod && !sel ? "ring-2 ring-rose-300 font-bold text-rose-700" : "",
              ].join(" ")}>
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BookingModal({ partner, isFr, user, userProfile, onClose }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [service, setService] = useState("");
  const [date, setDate] = useState(null);
  const [phone, setPhone] = useState(userProfile?.phone || "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookingId, setBookingId] = useState(null);

  const services = isFr ? partner.servicesFr : partner.servicesHt;

  const labels = isFr
    ? {
        step1: "Quel service souhaitez-vous\u00a0?",
        step2: "Choisissez votre date",
        step3: "Vos coordonnées",
        next: "Suivant",
        back: "Retour",
        confirm: "Envoyer ma demande de devis",
        phonePlaceholder: "Votre numéro de téléphone",
        msgPlaceholder: "Décrivez votre événement (thème, nombre d'invités, budget approximatif…)",
        successTitle: "Demande de devis envoyée\u00a0!",
        successSub: (d) => `Votre demande de devis pour le ${format(d, "d MMMM yyyy", { locale: fr })} a été transmise. Le partenaire vous contactera sous 24\u00a0h avec une proposition personnalisée.`,
        trackLabel: "Suivre mes demandes",
        phoneLabel: "Téléphone",
        msgLabel: "Décrivez votre événement",
        summary: "Récapitulatif",
      }
    : {
        step1: "Ki sèvis ou vle\u00a0?",
        step2: "Chwazi dat ou",
        step3: "Enfòmasyon ou",
        next: "Kontinye",
        back: "Retounen",
        confirm: "Voye demann devis mwen",
        phonePlaceholder: "Nimewo telefòn ou",
        msgPlaceholder: "Dekri evènman ou (tèm, kantite envite, bidjè…)",
        successTitle: "Demann devis voye\u00a0!",
        successSub: (d) => `Demann ou pou ${format(d, "d MMMM yyyy", { locale: fr })} transmèt. Patnè a pral kontakte ou nan 24\u00a0h ak yon pwopozisyon pèsonalize.`,
        trackLabel: "Swiv demann mwen yo",
        phoneLabel: "Telefòn",
        msgLabel: "Dekri evènman ou",
        summary: "Rezime",
      };

  async function handleConfirm() {
    if (!user) return;
    setLoading(true);
    try {
      const userName = userProfile?.name || userProfile?.displayName || user.displayName || user.email;
      const id = await createEventBooking({
        userId: user.uid,
        userName,
        userEmail: user.email || "",
        userPhone: phone,
        partnerId: partner.id,
        partnerName: partner.name,
        service,
        eventDate: date,
        message,
      });
      setBookingId(id);
      setStep(4);

      const idToken = await user.getIdToken();
      const notifyHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      };
      fetch("/api/event-bookings/notify", {
        method: "POST",
        headers: notifyHeaders,
        body: JSON.stringify({
          bookingId: id,
          partnerName: partner.name,
          service,
          eventDate: date?.toISOString(),
          userName,
        }),
      }).catch(() => {});
      if (user.email) {
        fetch("/api/event-bookings/email", {
          method: "POST",
          headers: notifyHeaders,
          body: JSON.stringify({
            type: "booking_created",
            toEmail: user.email,
            toName: userName,
            language: isFr ? "fr" : "ht",
            service,
            partnerName: partner.name,
            eventDate: date?.toISOString(),
            bookingId: id,
          }),
        }).catch(() => {});
      }
    } catch (e) {
      console.error("Booking error", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Progress dots */}
      {step < 4 && (
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className={[
              "h-2 rounded-full transition-all",
              s === step ? "w-8 bg-gradient-to-r from-rose-500 to-fuchsia-500" : s < step ? "w-2 bg-rose-300" : "w-2 bg-slate-200",
            ].join(" ")} />
          ))}
        </div>
      )}

      {/* Step 1 – Service */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-rose-900">{labels.step1}</p>
          <div className="relative">
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="w-full appearance-none rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 pr-10 text-sm font-semibold text-rose-900 outline-none focus:ring-2 focus:ring-rose-300 cursor-pointer"
            >
              <option value="" disabled>
                {isFr ? "— Choisissez un service —" : "— Chwazi yon sèvis —"}
              </option>
              {services.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <ChevronRight className="h-4 w-4 rotate-90 text-rose-400" />
            </div>
          </div>
          {service && (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-fuchsia-50 px-4 py-3">
              <Gift className="h-5 w-5 shrink-0 text-rose-500" />
              <p className="text-sm font-bold text-rose-800">{service}</p>
            </div>
          )}
          <Button disabled={!service} onClick={() => setStep(2)}
            className="w-full rounded-2xl bg-gradient-to-r from-rose-500 to-fuchsia-500 font-bold text-white hover:opacity-90 disabled:opacity-40">
            {labels.next} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Step 2 – Date */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-rose-900">{labels.step2}</p>
          <CalendarPicker isFr={isFr} selected={date} onSelect={setDate} />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}
              className="flex-1 rounded-2xl border-rose-200 text-rose-700 hover:bg-rose-50">
              <ChevronLeft className="mr-1 h-4 w-4" />{labels.back}
            </Button>
            <Button disabled={!date} onClick={() => setStep(3)}
              className="flex-1 rounded-2xl bg-gradient-to-r from-rose-500 to-fuchsia-500 font-bold text-white disabled:opacity-40">
              {date ? `${format(date, "d MMM", { locale: fr })}` : labels.next}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 – Détails */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-rose-900">{labels.step3}</p>

          {/* Summary card */}
          <div className="rounded-2xl bg-rose-50 p-4 text-sm">
            <p className="font-bold text-rose-800">{labels.summary}</p>
            <p className="mt-1 text-slate-600">📋 {service}</p>
            <p className="text-slate-600">📅 {format(date, "EEEE d MMMM yyyy", { locale: fr })}</p>
            <p className="text-slate-600">🏢 {partner.name}</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-rose-800">{labels.phoneLabel}</label>
              <div className="flex items-center gap-2 rounded-2xl border border-rose-100 bg-white px-3 py-2">
                <Phone className="h-4 w-4 text-rose-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={labels.phonePlaceholder}
                  className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-300 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-rose-800">{labels.msgLabel}</label>
              <div className="flex items-start gap-2 rounded-2xl border border-rose-100 bg-white px-3 py-2">
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={labels.msgPlaceholder}
                  rows={3}
                  className="flex-1 resize-none bg-transparent text-sm text-slate-700 placeholder:text-slate-300 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)}
              className="flex-1 rounded-2xl border-rose-200 text-rose-700 hover:bg-rose-50">
              <ChevronLeft className="mr-1 h-4 w-4" />{labels.back}
            </Button>
            <Button disabled={loading} onClick={handleConfirm}
              className="flex-1 rounded-2xl bg-gradient-to-r from-rose-500 to-fuchsia-500 font-bold text-white disabled:opacity-60">
              {loading ? "…" : labels.confirm}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4 – Succès */}
      {step === 4 && (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-rose-100 to-fuchsia-100">
            <CheckCircle2 className="h-9 w-9 text-rose-500" />
          </div>
          <p className="text-xl font-extrabold text-rose-900">{labels.successTitle}</p>
          <p className="text-sm leading-relaxed text-slate-600">{labels.successSub(date)}</p>
          <div className="mt-2 w-full rounded-2xl bg-rose-50 p-4 text-left text-sm">
            <p className="font-bold text-rose-800">{labels.summary}</p>
            <p className="mt-1 text-slate-600">📋 {service}</p>
            <p className="text-slate-600">📅 {format(date, "EEEE d MMMM yyyy", { locale: fr })}</p>
            <p className="text-slate-600">🏢 {partner.name}</p>
            <p className="mt-1 text-xs text-slate-400">ID: {bookingId}</p>
          </div>
          <Button
            onClick={() => { onClose(); router.push("/evenements/mes-demandes"); }}
            className="w-full rounded-2xl bg-gradient-to-r from-rose-500 to-fuchsia-500 font-bold text-white">
            <ClipboardList className="mr-2 h-4 w-4" />
            {labels.trackLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function EvenementsPage() {
  const { language } = useLanguage();
  const { user, userProfile } = useAuth();
  const isFr = language !== "ht";
  const [bookingPartner, setBookingPartner] = useState(null);
  const [partners, setPartners] = useState([FALLBACK_PARTNER]);

  useEffect(() => {
    const unsub = subscribeToEventPartners(
      (data) => { if (data.length > 0) setPartners(data.filter((p) => p.active !== false)); },
      () => {}
    );
    return () => unsub();
  }, []);

  const ui = isFr
    ? {
        heroTitle1: "Vos événements,",
        heroTitle2: "notre passion\u00a0!",
        heroSub:
          "Chaque famille mérite de vivre des instants précieux gravés pour toujours dans les mémoires. Baby shower, anniversaire d\u2019enfant, célébration privée\u00a0\u2014 nos partenaires transforment vos rêves en réalité, avec soin et élégance.",
        feat1: "Organisation\ncomplète",
        feat2: "Décoration\npersonnalisée",
        feat3: "Équipe\nexpérimentée",
        feat4: "Sérénité\ngarantie",
        partnersTitle: "Nos partenaires",
        ctaBtn: "Réserver une date",
        servicesLabel: "Services",
        galleryTitle: "Nos réalisations",
        modalTitle: "Choisissez votre date",
        modalSub: "Sélectionnez le jour souhaité, nous vous contacterons pour confirmer.",
      }
    : {
        heroTitle1: "Evènman ou yo,",
        heroTitle2: "pasyion nou\u00a0!",
        heroSub:
          "Chak fanmi merite viv moman espesyal yo pap janm bliye. Baby shower, anivèsè timoun, fèt prive\u00a0\u2014 patnè nou yo transfòme rèv ou yo an reyalite, avèk swen ak bèlte.",
        feat1: "Òganizasyon\nkonplè",
        feat2: "Dekorasyon\npèsonalize",
        feat3: "Ekip\nespesyalize",
        feat4: "Serenite\ngaranti",
        partnersTitle: "Patnè nou yo",
        ctaBtn: "Rezève yon dat",
        servicesLabel: "Sèvis",
        galleryTitle: "Reyalizasyon nou yo",
        modalTitle: "Chwazi dat ou",
        modalSub: "Chwazi jou ou vle a, nou pral kontakte ou pou konfime.",
      };

  const features = [
    { icon: CalendarDays, label: ui.feat1 },
    { icon: Palette, label: ui.feat2 },
    { icon: Users, label: ui.feat3 },
    { icon: ShieldCheck, label: ui.feat4 },
  ];

  return (
    <div className="min-h-screen bg-white">

      {/* ── HERO ── */}
      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
        <div className="grid min-h-[520px] overflow-hidden rounded-[2.5rem] border border-pink-100 bg-white shadow-[0_24px_80px_-32px_rgba(225,29,72,0.18)] lg:grid-cols-2">

          {/* Left */}
          <div className="flex flex-col justify-center gap-8 p-8 sm:p-12">
            <div className="space-y-1">
              <h1 className="text-4xl font-extrabold leading-tight text-rose-900 sm:text-5xl">
                {ui.heroTitle1}
              </h1>
              <h1 className="bg-gradient-to-r from-rose-600 to-fuchsia-600 bg-clip-text text-4xl font-extrabold leading-tight text-transparent sm:text-5xl">
                {ui.heroTitle2}
              </h1>
            </div>
            <p className="max-w-md text-[15px] font-medium leading-relaxed text-slate-700">
              {ui.heroSub}
            </p>

            {/* Feature icons */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {features.map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-2 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50">
                    <Icon className="h-5 w-5 text-rose-600" />
                  </div>
                  <p className="whitespace-pre-line text-xs font-semibold leading-tight text-rose-900">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            <div>
              <Button
                onClick={() => document.getElementById("partners-section")?.scrollIntoView({ behavior: "smooth" })}
                className="rounded-2xl bg-gradient-to-r from-rose-500 to-fuchsia-500 px-6 py-3 text-sm font-bold text-white shadow-lg hover:from-rose-600 hover:to-fuchsia-600"
              >
                {isFr ? "Voir nos partenaires" : "Wè patnè nou yo"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Right — photo + brand card */}
          <div className="relative hidden lg:block">
            <Image
              src="https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=900&q=85"
              alt="Événements"
              fill
              sizes="50vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-bl from-fuchsia-400/20 via-transparent to-transparent" />
            <div className="absolute bottom-10 right-10 rounded-3xl border border-pink-100 bg-white/96 px-8 py-6 text-center shadow-2xl backdrop-blur-sm">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-fuchsia-500 shadow">
                <Gift className="h-7 w-7 text-white" />
              </div>
              <p className="text-lg font-black uppercase tracking-widest text-rose-900">Eventoria</p>
              <div className="mt-0.5 flex items-center justify-center gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">by</span>
                <span className="text-sm font-black uppercase tracking-wider text-rose-800">Lakou</span>
                <span className="rounded-lg bg-fuchsia-600 px-2 py-0.5 text-sm font-black uppercase tracking-wider text-white shadow-sm">
                  Manman
                </span>
              </div>
              <div className="mt-3 border-t border-pink-100 pt-3">
                <p className="text-sm font-semibold italic text-rose-700">
                  {isFr ? (partners[0]?.taglineFr || FALLBACK_PARTNER.taglineFr) : (partners[0]?.taglineHt || FALLBACK_PARTNER.taglineHt)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PARTNERS ── */}
      <section id="partners-section" className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
        <div className="mb-8 flex items-center justify-center gap-4">
          <span className="h-px w-16 bg-gradient-to-r from-transparent to-rose-300" />
          <h2 className="text-2xl font-extrabold text-rose-900">{ui.partnersTitle}</h2>
          <span className="h-px w-16 bg-gradient-to-l from-transparent to-rose-300" />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map((partner) => (
            <div
              key={partner.id}
              className={`group rounded-[2rem] border ${partner.border} bg-white p-6 shadow-sm transition hover:shadow-lg`}
            >
              <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${partner.gradient} shadow`}>
                <Gift className="h-7 w-7 text-white" />
              </div>
              <p className={`text-lg font-black uppercase tracking-wider ${partner.accent}`}>
                {partner.name}
              </p>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
                {partner.subtitle}
              </p>
              <p className="mt-3 text-sm font-medium leading-relaxed text-slate-700">
                {isFr ? partner.descFr : partner.descHt}
              </p>

              <div className="mt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-rose-700">
                  {ui.servicesLabel}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(isFr ? partner.servicesFr : partner.servicesHt).map((s) => (
                    <Badge
                      key={s}
                      className="rounded-full border-rose-200 bg-rose-50 text-[11px] font-semibold text-rose-700"
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => setBookingPartner(partner)}
                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-rose-500 to-fuchsia-500 font-bold text-white hover:from-rose-600 hover:to-fuchsia-600"
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                {ui.ctaBtn}
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* ── GALLERY ── */}
      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
        <div className="mb-8 flex items-center justify-center gap-4">
          <span className="h-px w-16 bg-gradient-to-r from-transparent to-rose-300" />
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
            <h2 className="text-2xl font-extrabold text-rose-900">{ui.galleryTitle}</h2>
            <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
          </div>
          <span className="h-px w-16 bg-gradient-to-l from-transparent to-rose-300" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GALLERY.map((item) => (
            <div key={item.labelFr} className="group overflow-hidden rounded-[1.75rem] shadow-md">
              <div className="relative aspect-[4/5] w-full overflow-hidden">
                <Image
                  src={item.src}
                  alt={isFr ? item.labelFr : item.labelHt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
              <p className="mt-3 pb-2 text-center text-sm font-bold text-rose-800">
                {isFr ? item.labelFr : item.labelHt}{" "}
                <Heart className="inline h-3.5 w-3.5 fill-rose-500 text-rose-500" />
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── BOOKING MODAL ── */}
      <Dialog open={!!bookingPartner} onOpenChange={(open) => !open && setBookingPartner(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-rose-900">
              {bookingPartner?.name}
            </DialogTitle>
            <DialogDescription>
              {isFr ? "Réservez votre événement en 3 étapes." : "Rezève evènman ou an 3 etap."}
            </DialogDescription>
          </DialogHeader>
          {bookingPartner && (
            <BookingModal
              partner={bookingPartner}
              isFr={isFr}
              user={user}
              userProfile={userProfile}
              onClose={() => setBookingPartner(null)}
            />
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
