"use client";

import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { subscribeToContests } from "@/lib/firestore";
import {
  Trophy, Clock, Star, BookOpen, PenLine,
  Share2, ChevronRight, Gift, ShieldCheck, HelpCircle, ChevronDown,
  ChevronUp, Sparkles, AlertCircle, CalendarDays, Award,
  X, ZoomIn,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUS_LABELS = {
  draft:  { fr: "Bientôt",   ht: "Byento",    color: "bg-slate-100 text-slate-500" },
  active: { fr: "En cours",  ht: "An kouri",  color: "bg-green-100 text-green-700" },
  ended:  { fr: "Terminé",   ht: "Fini",      color: "bg-rose-100 text-rose-600"   },
};

// ── Static content ─────────────────────────────────────────────────────────

const THEMES = [
  { emoji: "🤱", labelFr: "Santé maternelle", labelHt: "Sante manman" },
  { emoji: "🍼", labelFr: "Allaitement & nutrition", labelHt: "Alètman ak nitrisyon" },
  { emoji: "📚", labelFr: "Éducation des enfants", labelHt: "Edikasyon timoun" },
  { emoji: "💊", labelFr: "Vaccination & prévention", labelHt: "Vaksinasyon ak prevansyon" },
  { emoji: "🧠", labelFr: "Développement de l'enfant", labelHt: "Devlopman timoun" },
  { emoji: "💑", labelFr: "Bien-être familial", labelHt: "Byennèt fanmi" },
  { emoji: "🧘", labelFr: "Santé mentale", labelHt: "Sante mantal" },
  { emoji: "🥗", labelFr: "Hygiène & alimentation", labelHt: "Ijyèn ak manje" },
];

const PRIZES_FR = [
  { rank: "🥇 1er prix", desc: "Prix surprise réservé au grand gagnant — annoncé le 31 mai !" },
  { rank: "🥈 2e prix",  desc: "Prix surprise pour le 2e du classement — annoncé le 31 mai !" },
  { rank: "🥉 3e prix",  desc: "Prix surprise pour le 3e du classement — annoncé le 31 mai !" },
];
const PRIZES_HT = [
  { rank: "🥇 1ye pri", desc: "Pri sipriz rezève pou gran gayan an — anonse 31 me !" },
  { rank: "🥈 2yèm pri",  desc: "Pri sipriz pou 2yèm nan klasman an — anonse 31 me !" },
  { rank: "🥉 3yèm pri",  desc: "Pri sipriz pou 3yèm nan klasman an — anonse 31 me !" },
];

const RULES_FR = [
  "Être membre inscrit et actif sur Lakou Manman.",
  "Chaque participant ne peut soumettre qu'une seule publication (Phase 2).",
  "Les réponses au quiz doivent être soumises avant l'expiration du minuteur.",
  "Une fois le quiz d'une journée commencé, le participant doit aller jusqu'au bout sans quitter la page.",
  "Les votes (Phase 2) sont limités à un vote par publication par membre.",
  "Le soutien de la communauté ne compte que pour les nouveaux membres réellement inscrits via le lien unique.",
  "Tout comportement frauduleux (faux comptes, vote automatisé, etc.) entraîne la disqualification immédiate.",
  "Les décisions du jury Lakou Manman sont définitives et sans appel.",
  "Le concours est ouvert aux résidents d'Haïti et de la diaspora haïtienne.",
];
const RULES_HT = [
  "Dwe se manm enskri ak aktif sou Lakou Manman.",
  "Chak patisipan ka soumèt yon sèl piblikasyon (Faz 2).",
  "Repons kiz yo dwe soumèt anvan minuteur a ekspire.",
  "Yon fwa kiz yon jou kòmanse, patisipan an dwe ale jiska bout la san kite paj la.",
  "Vòt (Faz 2) limite a yon vòt pa piblikasyon pa manm.",
  "Parennaj konte sèlman pou nouvo manm ki enskri reyèlman via lyen inik ou.",
  "Tout konpòtman fwodilen (fo kont, vòt otomatik, elatrye) lakoz diskalifiyasyon imedya.",
  "Desizyon jiri Lakou Manman yo definitif epi san apèl.",
  "Konkou a ouvè pou rezidan Ayiti ak dyaspora ayisyèn nan.",
];

const FAQ_FR = [
  { q: "Dois-je payer pour participer ?", a: "Non, le concours est entièrement gratuit pour tous les membres inscrits." },
  { q: "Quand seront annoncés les résultats ?", a: "Les résultats seront annoncés le 31 mai, jour de la Fête des Mères, sur la plateforme et par email." },
  { q: "Puis-je participer depuis l'étranger ?", a: "Oui, la diaspora haïtienne peut participer pleinement à toutes les phases." },
  { q: "Comment est calculé le score final ?", a: "Score total = Points Phase 1 (bonnes réponses) + Points Phase 2 (votes reçus sur votre publication) + Points Phase 3 (palier de soutien de la communauté atteint)." },
  { q: "Y a-t-il un âge minimum ?", a: "Oui, les participants doivent avoir au moins 18 ans." },
  { q: "Que se passe-t-il en cas d'égalité ?", a: "En cas d'égalité parfaite, le jury départage selon la qualité de la publication (Phase 2)." },
];
const FAQ_HT = [
  { q: "Fò m peye pou patisipe ?", a: "Non, konkou a totalman gratis pou tout manm enskri yo." },
  { q: "Ki lè rezilta yo pral anonse ?", a: "Rezilta yo pral anonse 31 me, jou Fèt Manman an, sou platfòm nan ak pa imèl." },
  { q: "Eske m ka patisipe depi lòt peyi ?", a: "Wi, dyaspora ayisyèn nan ka patisipe nèt nan tout faz yo." },
  { q: "Kijan yo kalkile nòt final la ?", a: "Total = Pwen Faz 1 (bon repons) + Pwen Faz 2 (vòt resevwa sou piblikasyon ou) + Pwen Faz 3 (nivo parennaj rive)." },
  { q: "Eske gen laj minimòm ?", a: "Wi, patisipan yo dwe gen omwen 18 an." },
  { q: "Kisa k pase si gen egalite ?", a: "Si gen egalite pafè, jiri a depataje selon kalite piblikasyon (Faz 2) an." },
];

// ── Small components ────────────────────────────────────────────────────────

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm font-semibold text-slate-700 hover:text-rose-700">
        <span>{q}</span>
        {open ? <ChevronUp className="h-4 w-4 shrink-0 text-rose-400" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />}
      </button>
      {open && <p className="pb-3 text-sm text-slate-500 leading-relaxed">{a}</p>}
    </div>
  );
}

function utcDate(ts) {
  const d = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
  if (!d) return null;
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

const MOIS_CREOLE = ["Janvye","Fevriye","Mas","Avril","Me","Jen","Jiyè","Out","Septanm","Oktòb","Novanm","Desanm"];

function formatContestDate(date, isFr) {
  if (!date) return "";
  if (isFr) return format(date, "d MMM yyyy", { locale: fr });
  return `${date.getDate()} ${MOIS_CREOLE[date.getMonth()]} ${date.getFullYear()}`;
}

function ContestCard({ contest, isFr, onEnter }) {
  const status = STATUS_LABELS[contest.status] || STATUS_LABELS.draft;
  const startDate = utcDate(contest.startDate);
  const endDate   = utcDate(contest.endDate);
  const name = isFr ? (contest.nameFr || contest.name) : (contest.nameHt || contest.name);
  const desc = isFr ? contest.descFr : contest.descHt;

  return (
    <div className="overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-rose-500 to-fuchsia-600 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-extrabold text-white text-lg leading-tight">{name}</h2>
            <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${status.color}`}>
              {isFr ? status.fr : status.ht}
            </span>
          </div>
        </div>
        {desc && <p className="mt-3 text-sm text-white/80 leading-relaxed">{desc}</p>}
        {(startDate || endDate) && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-white/70">
            <CalendarDays className="h-3.5 w-3.5" />
            {startDate && formatContestDate(startDate, isFr)}
            {startDate && endDate && " → "}
            {endDate && formatContestDate(endDate, isFr)}
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 p-4">
        {[
          { icon: BookOpen, label: isFr ? "Phase 1 · Quiz" : "Faz 1 · Kiz", sub: isFr ? "100 questions minutées" : "100 kesyon minuté", color: "bg-amber-50 border-amber-100 text-amber-900" },
          { icon: PenLine, label: isFr ? "Phase 2 · Pub" : "Faz 2 · Pib", sub: isFr ? "Texte + vote communauté" : "Tèks + vòt kominote", color: "bg-fuchsia-50 border-fuchsia-100 text-fuchsia-900" },
          { icon: Share2, label: isFr ? "Phase 3 · Ref" : "Faz 3 · Ref", sub: isFr ? "Invitez et gagnez" : "Envite epi genyen", color: "bg-green-50 border-green-100 text-green-900" },
        ].map(({ icon: Icon, label, sub, color }) => (
          <div key={label} className={`rounded-2xl border p-3 ${color}`}>
            <Icon className="mb-1.5 h-4 w-4" />
            <p className="font-bold text-xs leading-tight">{label}</p>
            <p className="mt-0.5 text-[10px] opacity-70">{sub}</p>
          </div>
        ))}
      </div>
      <div className="px-4 pb-4">
        <button onClick={() => onEnter(contest.id)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-fuchsia-500 px-5 py-3 font-bold text-white shadow hover:opacity-90">
          {contest.status === "draft"
            ? (isFr ? "Réserver ma place →" : "Rezève plas mwen →")
            : contest.status === "ended"
              ? (isFr ? "Voir les résultats" : "Wè rezilta yo")
              : (isFr ? "Participer maintenant" : "Patisipe kounye a")}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function ConcoursPage() {
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const isFr = language !== "ht";
  const router = useRouter();
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imageZoomed, setImageZoomed] = useState(false);

  useEffect(() => {
    const unsub = subscribeToContests(
      (data) => { setContests(data); setLoading(false); },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  // Auto-patch dates if stored as UTC midnight (causes off-by-one in UTC-4)
  useEffect(() => {
    if (!user || contests.length === 0) return;
    const main = contests.find((c) => c.id === "manman-entelijan-2026");
    if (!main) return;
    const start = main.startDate?.toDate ? main.startDate.toDate() : null;
    if (!start || start.getUTCHours() >= 11) return;
    user.getIdToken().then((idToken) =>
      fetch("/api/contests/ensure", { method: "POST", headers: { authorization: `Bearer ${idToken}` } }).catch(() => {})
    );
  }, [user, contests]);

  const handleEnter = useCallback((contestId) => {
    if (!user) { router.push("/login"); return; }
    router.push(`/concours/${contestId || "manman-entelijan-2026"}`);
  }, [user, router]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-200 border-t-rose-500" />
      </div>
    );
  }

  const prizes = isFr ? PRIZES_FR : PRIZES_HT;
  const rules  = isFr ? RULES_FR : RULES_HT;
  const faqs   = isFr ? FAQ_FR : FAQ_HT;

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-white pb-16">
      <div className="mx-auto max-w-3xl px-4">

        {/* ── Image lightbox modal ── */}
        {imageZoomed && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setImageZoomed(false)}>
            <button
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
              onClick={() => setImageZoomed(false)}>
              <X className="h-6 w-6" />
            </button>
            <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
              <Image
                src="/image concours.png"
                alt="Manman Entelijan — Konkou Fèt Manman"
                width={1800}
                height={1012}
                className="w-full rounded-2xl object-contain shadow-2xl"
              />
            </div>
          </div>
        )}

        {/* ── Hero — image cliquable + strip CTA en dessous ── */}
        <div className="overflow-hidden rounded-b-[2rem] shadow-xl">
          <button
            type="button"
            onClick={() => setImageZoomed(true)}
            className="group relative block w-full cursor-zoom-in">
            <Image
              src="/image concours.png"
              alt="Manman Entelijan — Konkou Fèt Manman"
              width={900}
              height={506}
              className="w-full object-cover"
              priority
            />
            <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-bold text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
              <ZoomIn className="h-3 w-3" /> {isFr ? "Agrandir" : "Agrandi"}
            </div>
          </button>
          {/* Strip CTA sous l’image */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-rose-600 to-fuchsia-600 px-5 py-4">
            <div>
              <p className="text-[11px] font-bold text-white/70">
                {isFr ? "Du 20 au 26 Mai 2026 • Résultats le 31 Mai" : "20 pou 26 Me 2026 • Rezilta 31 Me"}
              </p>
              <p className="mt-0.5 text-sm font-extrabold text-white">
                {isFr ? "Inscrivez-vous dès maintenant !" : "Enskri kounye a !"}
              </p>
            </div>
            <button
              onClick={() => handleEnter(contests[0]?.id)}
              className="shrink-0 rounded-2xl bg-white px-5 py-2.5 text-sm font-extrabold text-rose-600 shadow-lg transition hover:bg-rose-50">
              {isFr ? "Participer maintenant →" : "Patisipe kounye a →"}
            </button>
          </div>
        </div>

        <div className="mt-8 space-y-8">

          {/* ── Timeline ── */}
          <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-violet-900 to-rose-900 px-5 py-5 text-white shadow-lg">
            <p className="mb-4 text-center text-[11px] font-bold uppercase tracking-widest text-white/50">
              {isFr ? "⏱ Durée du concours : 7 jours" : "⏱ Dire konkou a : 7 jou"}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              {[
                { icon: CalendarDays, date: "20 Mai 2026", labelFr: "Début du concours", labelHt: "Kòmansman konkou a", accent: false },
                { icon: CalendarDays, date: "26 Mai 2026", labelFr: "Fin du concours",   labelHt: "Fen konkou a",          accent: false },
                { icon: Trophy,       date: "31 Mai 2026", labelFr: "Résultats",          labelHt: "Rezilta yo",           accent: true  },
              ].map(({ icon: Icon, date, labelFr, labelHt, accent }, i) => (
                <div key={i} className="flex flex-1 items-center gap-2">
                  {i > 0 && <ChevronRight className="hidden h-4 w-4 shrink-0 text-white/30 sm:block" />}
                  <div className={`flex flex-1 items-center gap-3 rounded-2xl px-4 py-3 ${
                    accent ? "border border-amber-400/40 bg-amber-400/20" : "bg-white/10"
                  }`}>
                    <Icon className={`h-5 w-5 shrink-0 ${accent ? "text-amber-300" : "text-white/60"}`} />
                    <div>
                      <p className={`font-extrabold text-sm ${accent ? "text-amber-200" : "text-white"}`}>{date}</p>
                      <p className="text-[11px] text-white/50 mt-0.5">{isFr ? labelFr : labelHt}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-xs font-semibold text-fuchsia-300 italic">
              {isFr ? "Ensemble, élevons la prochaine génération ! ♥" : "Se ansanm n ap grandi pi bon jenerasyon ! ♥"}
            </p>
          </section>

          {/* ── 7-step flow ── */}
          <section className="rounded-3xl border border-rose-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 flex items-center gap-2 font-extrabold text-rose-900">
              <Sparkles className="h-5 w-5 text-amber-400" />
              {isFr ? "Comment participer ?" : "Kijan pou patisipe ?"}
            </h2>
            <div className="space-y-0">
              {[
                {
                  n: 1, emoji: "👤",
                  color: "bg-violet-100 text-violet-700",
                  titleFr: "Créez votre compte ou connectez-vous",
                  titleHt: "Kreye kont ou oswa konekte",
                  descFr:  "Inscription gratuite sur Lakou Manman, ouverte à toutes les mamans.",
                  descHt:  "Enskripsyon gratis sou Lakou Manman, ouvè pou tout manman yo.",
                },
                {
                  n: 2, emoji: "🎟️",
                  color: "bg-rose-100 text-rose-700",
                  titleFr: "Confirmez votre participation",
                  titleHt: "Konfime patisipasyon ou",
                  descFr:  "Cliquez sur « Participer » et recevez votre numéro de participant unique.",
                  descHt:  "Klike sou « Patisipe » epi resevwa nimewo patisipan inik ou.",
                },
                {
                  n: 3, emoji: "🧠",
                  color: "bg-amber-100 text-amber-700",
                  titleFr: "Répondez au quiz de connaissances",
                  titleHt: "Reponn kiz konesans lan",
                  descFr:  "Questions sur la santé et le développement de l'enfant. Chaque bonne réponse rapporte des points.",
                  descHt:  "Kesyon sou sante ak devlopman timoun. Chak bon repons bay pwen.",
                },
                {
                  n: 4, emoji: "📝",
                  color: "bg-sky-100 text-sky-700",
                  titleFr: "Répondez à un cas pratique (si qualifié·e)",
                  titleHt: "Reponn yon ka pratik (si w kalifye)",
                  descFr:  "Partagez votre solution pour une situation réelle du quotidien (max 1 200 caractères).",
                  descHt:  "Pataje solisyon ou pou yon sitiyasyon reyèl lavi chak jou (max 1 200 karaktè).",
                },
                {
                  n: 5, emoji: "👨‍⚕️",
                  color: "bg-emerald-100 text-emerald-700",
                  titleFr: "Un spécialiste valide les meilleures réponses",
                  titleHt: "Yon espesyalis valide pi bon repons yo",
                  descFr:  "Un pédiatre ou expert en santé infantile évalue et valide les réponses.",
                  descHt:  "Yon pedyat oswa ekspè nan sante timoun evalye ak valide repons yo.",
                },
                {
                  n: 6, emoji: "🤝",
                  color: "bg-fuchsia-100 text-fuchsia-700",
                  titleFr: "Invitez des mamans & passez au vote communautaire",
                  titleHt: "Envite manman yo epi pase nan vòt kominote",
                  descFr:  "Chaque maman que vous invitez = points bonis. Les finalistes sont ensuite soumis au vote de la communauté.",
                  descHt:  "Chak manman ou envite = pwen bonis. Epi finalís yo pase nan vòt kominote a.",
                },
                {
                  n: 7, emoji: "🏆",
                  color: "bg-amber-100 text-amber-700",
                  titleFr: "Résultats annoncés le 31 Mai — Fête des Mères !",
                  titleHt: "Rezilta anonse 31 Me — Fèt Manman !",
                  descFr:  "Les gagnants sont sélectionnés et les prix surprises dévoilés ce jour-là.",
                  descHt:  "Gayan yo chwazi epi pri sipriz yo devwale jou sa a.",
                },
              ].map(({ n, emoji, color, titleFr, titleHt, descFr, descHt }, i, arr) => (
                <div key={n} className="flex gap-3">
                  {/* Line connector */}
                  <div className="flex flex-col items-center">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-extrabold ${color}`}>
                      {emoji}
                    </div>
                    {i < arr.length - 1 && <div className="mt-1 w-0.5 flex-1 bg-slate-100" />}
                  </div>
                  <div className={`pb-5 ${i === arr.length - 1 ? "" : ""}`}>
                    <p className="font-extrabold text-slate-800 text-sm leading-snug">{isFr ? titleFr : titleHt}</p>
                    <p className="mt-0.5 text-[12px] text-slate-500 leading-relaxed">{isFr ? descFr : descHt}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Active/upcoming contests ── */}
          {contests.length > 0 ? (
            <section>
              <h2 className="mb-4 flex items-center gap-2 font-extrabold text-rose-900">
                <Sparkles className="h-5 w-5 text-amber-400" />
                {isFr ? "Concours en cours" : "Konkou ki pral komanse"}
              </h2>
              <div className="space-y-4">
                {contests.map((c) => (
                  <ContestCard key={c.id} contest={c} isFr={isFr} onEnter={handleEnter} />
                ))}
              </div>
            </section>
          ) : (
            <div className="rounded-3xl border border-dashed border-rose-200 bg-white p-8 text-center">
              <Clock className="mx-auto mb-3 h-10 w-10 text-rose-200" />
              <p className="font-bold text-rose-900">{isFr ? "Prochain concours bientôt annoncé !" : "Pwochen konkou pral anonse byento !"}</p>
              <p className="mt-1 text-sm text-slate-400">{isFr ? "Inscrivez-vous pour être notifié dès le lancement." : "Enskri pou resevwa notifikasyon dès lansman an."}</p>
              {!user && (
                <button onClick={() => router.push("/register")}
                  className="mt-4 rounded-2xl bg-rose-500 px-5 py-2 text-sm font-bold text-white hover:bg-rose-600">
                  {isFr ? "Créer un compte" : "Kreye yon kont"}
                </button>
              )}
            </div>
          )}

          {/* ── 3 Phases ── */}
          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 flex items-center gap-2 font-extrabold text-rose-900">
              <Star className="h-5 w-5 text-amber-400" />
              {isFr ? "Les 3 phases du concours" : "3 faz konkou a"}
            </h2>
            <div className="space-y-4">
              {[
                {
                  num: "1", icon: BookOpen, color: "bg-amber-500",
                  titleFr: "Quiz chronométré", titleHt: "Kiz minuté",
                  descFr: "100 questions réparties sur 7 jours (environ 14 par jour). Chaque question s'affiche avec un minuteur. Une fois commencé, vous devez répondre à toutes les questions sans quitter. Les réponses sont validées par des experts. Chaque bonne réponse rapporte des points.",
                  descHt: "100 kesyon reparti sou 7 jou (anviwon 14 pa jou). Chak kesyon parèt ak yon minuteur. Yon fwa kòmanse, fòk ou reponn tout kesyon yo san kite. Repons yo valide pa ekspè yo. Chak bon repons bay pwen.",
                },
                {
                  num: "2", icon: PenLine, color: "bg-fuchsia-500",
                  titleFr: "Publication communautaire", titleHt: "Piblikasyon kominote",
                  descFr: "Rédigez un texte original (max 1 200 caractères) sur l'un des thèmes imposés. La communauté vote pour les publications qu'elle préfère. Le nombre de votes reçus se convertit en points. Chaque membre ne peut soumettre qu'une seule publication.",
                  descHt: "Ekri yon tèks orizinal (max 1 200 karaktè) sou youn nan tèm yo impose yo. Kominote a vote pou piblikasyon li pi renmen. Kantite vòt resevwa yo konvèti an pwen. Chak manm ka soumèt yon sèl piblikasyon.",
                },
                {
                  num: "3", icon: Share2, color: "bg-green-500",
                  titleFr: "Soutien de la communauté", titleHt: "Sipò kominote a",
                  descFr: "Chaque participant reçoit un lien unique. Les nouveaux membres inscrits via ce lien comptent pour votre score. Plus vous en amenez, plus vous montez de palier et gagnez des points bonus. Les points sont calculés en fin de concours.",
                  descHt: "Chak patisipan resevwa yon lyen inik. Nouvo manm ki enskri via lyen sa a konte pou nòt ou. Pi plis ou amene, pi ou monte nivo epi genyen pwen bonis. Pwen yo kalkile nan fen konkou a.",
                },
              ].map(({ num, icon: Icon, color, titleFr, titleHt, descFr, descHt }) => (
                <div key={num} className="flex gap-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${color} text-white font-extrabold text-sm shadow`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-800">{isFr ? titleFr : titleHt}</p>
                    <p className="mt-1 text-sm text-slate-500 leading-relaxed">{isFr ? descFr : descHt}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Prizes ── */}
          <section className="rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 to-rose-50 p-6 shadow-sm">
            <h2 className="mb-5 flex items-center gap-2 font-extrabold text-rose-900">
              <Gift className="h-5 w-5 text-rose-500" />
              {isFr ? "Les prix à gagner" : "Pri yo pou genyen"}
            </h2>
            <div className="space-y-3">
              {prizes.map((p) => (
                <div key={p.rank} className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-white px-4 py-3">
                  <span className="text-xl">{p.rank.split(" ")[0]}</span>
                  <div>
                    <p className="font-bold text-slate-800">{p.rank.replace(p.rank.split(" ")[0] + " ", "")}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400">
              {isFr ? "* Les prix seront dévoilés le 31 mai, jour de la Fête des Mères." : "* Pri yo pral devwale 31 me, jou Fèt Manman an."}
            </p>
          </section>

          {/* ── Themes ── */}
          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-extrabold text-rose-900">
              <BookOpen className="h-5 w-5 text-fuchsia-500" />
              {isFr ? "Thèmes couverts" : "Tèm ki kouvri"}
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {THEMES.map((th) => (
                <div key={th.labelFr} className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                  <span className="text-lg">{th.emoji}</span>
                  <span className="text-xs font-semibold text-slate-600">{isFr ? th.labelFr : th.labelHt}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── Rules ── */}
          <section className="rounded-3xl border border-rose-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-extrabold text-rose-900">
              <ShieldCheck className="h-5 w-5 text-rose-500" />
              {isFr ? "Règlement du concours" : "Règleman konkou a"}
            </h2>
            <ol className="space-y-2.5">
              {rules.map((rule, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[10px] font-extrabold text-rose-600 mt-0.5">{i + 1}</span>
                  {rule}
                </li>
              ))}
            </ol>
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-100 bg-amber-50 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p className="text-xs text-amber-700 font-medium">
                {isFr
                  ? "En participant au concours, vous acceptez l'ensemble du règlement ainsi que les conditions générales d'utilisation de Lakou Manman."
                  : "Lè ou patisipe nan konkou a, ou aksepte tout règleman an ansanm ak kondisyon jeneral itilizasyon Lakou Manman an."}
              </p>
            </div>
          </section>

          {/* ── FAQ ── */}
          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-extrabold text-rose-900">
              <HelpCircle className="h-5 w-5 text-slate-400" />
              {isFr ? "Questions fréquentes" : "Kesyon souvan poze"}
            </h2>
            <div className="divide-y divide-slate-100">
              {faqs.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
            </div>
          </section>

          {/* ── CTA bottom ── */}
          {!user && (
            <div className="rounded-3xl bg-gradient-to-br from-rose-500 to-fuchsia-600 p-8 text-center text-white">
              <Award className="mx-auto mb-3 h-10 w-10 text-white/80" />
              <h3 className="text-xl font-extrabold">{isFr ? "Prêt(e) à relever le défi ?" : "Prè pou aksepte defi a ?"}</h3>
              <p className="mt-2 text-sm text-white/80">{isFr ? "Créez un compte gratuit pour participer au prochain concours." : "Kreye yon kont gratis pou patisipe nan pwochen konkou a."}</p>
              <button onClick={() => router.push("/register")}
                className="mt-5 rounded-2xl bg-white px-6 py-2.5 font-bold text-rose-600 shadow hover:bg-rose-50">
                {isFr ? "Rejoindre Lakou Manman" : "Rantre nan Lakou Manman"}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
