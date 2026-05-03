"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { subscribeToUserEventBookings, markEventBookingDepositPaid, updateEventBookingStatus } from "@/lib/firestore";
import MonCashPayment from "@/components/MonCashPayment";
import BookingThread from "@/components/BookingThread";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowLeft,
  PhoneCall,
  MessageSquare,
  CreditCard,
  Send,
  PartyPopper,
} from "lucide-react";

const STATUS_CONFIG = {
  pending:   { labelFr: "En attente",  labelHt: "Ap tann",  color: "bg-amber-50 text-amber-700 border-amber-200",  icon: Clock },
  confirmed: { labelFr: "Confirmée",   labelHt: "Konfime",  color: "bg-green-50 text-green-700 border-green-200",  icon: CheckCircle2 },
  completed: { labelFr: "Terminée",    labelHt: "Fini",     color: "bg-slate-50 text-slate-500 border-slate-200",  icon: Sparkles },
  cancelled: { labelFr: "Annulée",     labelHt: "Anile",    color: "bg-red-50 text-red-600 border-red-200",        icon: XCircle },
};

function parseAmount(str) {
  const n = parseFloat(String(str || "").replace(/[^\d.]/g, ""));
  return isNaN(n) ? 0 : n;
}

export default function MesDemandesPage() {
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();
  const isFr = language !== "ht";
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState(null);
  const [paidIds, setPaidIds] = useState([]);
  const [paySuccess, setPaySuccess] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  async function handleCancel(bookingId) {
    const msg = isFr
      ? "Annuler cette demande ? Cette action est irréversible."
      : "Anile demann sa a ? Aksyon sa pa kapab defèt.";
    if (!confirm(msg)) return;
    setCancelling(bookingId);
    try {
      await updateEventBookingStatus(bookingId, "cancelled");
    } finally {
      setCancelling(null);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    const unsub = subscribeToUserEventBookings(
      user.uid,
      (data) => { setBookings(data); setLoading(false); },
      () => setLoading(false)
    );
    return () => unsub();
  }, [user, authLoading, router]);

  const ui = isFr ? {
    title: "Mes demandes de devis",
    sub: "Suivez l'avancement en temps réel.",
    empty: "Aucune demande pour l'instant.",
    emptySub: "Contactez un partenaire événementiel pour démarrer.",
    ctaEmpty: "Voir les partenaires",
    back: "Retour aux événements",
    stepRequest: "Votre demande",
    stepResponse: "Réponse du partenaire",
    stepPayment: "Paiement de l'acompte",
    pending: "En attente de réponse…",
    pendingHint: "Le partenaire vous répondra sous 24 h dans cette page.",
    payNow: "Payer l'acompte maintenant",
    payDone: "Acompte payé ✓",
    completed: "Événement terminé",
    cancelled: "Demande annulée",
  } : {
    title: "Demann devis mwen yo",
    sub: "Swiv pwogresyon an tan reyèl.",
    empty: "Pa gen demann pou kounye a.",
    emptySub: "Kontakte yon patnè evènman pou kòmanse.",
    ctaEmpty: "Wè patnè yo",
    back: "Retounen nan evènman yo",
    stepRequest: "Demann ou",
    stepResponse: "Repons patnè a",
    stepPayment: "Peman akonp lan",
    pending: "Ap tann repons…",
    pendingHint: "Patnè a pral reponn ou nan 24 h nan paj sa a.",
    payNow: "Peye akonp kounye a",
    payDone: "Akonp peye ✓",
    completed: "Evènman fini",
    cancelled: "Demann anile",
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-200 border-t-rose-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">

        {/* Header */}
        <div className="mb-8">
          <button onClick={() => router.push("/evenements")}
            className="mb-4 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-4 w-4" /> {ui.back}
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-fuchsia-500">
              <ClipboardList className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-rose-900">{ui.title}</h1>
              <p className="text-sm text-slate-500">{ui.sub}</p>
            </div>
          </div>
        </div>

        {/* Payment success toast */}
        {paySuccess && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl bg-emerald-500 px-5 py-3 text-white shadow-lg">
            <PartyPopper className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">{isFr ? "Acompte reçu ! Merci 🎉" : "Akonp resevwa! Mèsi 🎉"}</p>
              <p className="text-xs text-emerald-100">
                {isFr ? "Le partenaire a été notifié. Votre événement est confirmé." : "Patnè a avèti. Evènman ou konfime."}
              </p>
            </div>
            <button onClick={() => setPaySuccess(null)} className="ml-auto text-emerald-200 hover:text-white text-lg">✕</button>
          </div>
        )}

        {/* Empty */}
        {bookings.length === 0 && (
          <div className="rounded-[2rem] border border-rose-100 bg-white p-12 text-center">
            <CalendarDays className="mx-auto mb-4 h-12 w-12 text-rose-200" />
            <p className="font-bold text-rose-800">{ui.empty}</p>
            <p className="mt-1 text-sm text-slate-400">{ui.emptySub}</p>
            <Button onClick={() => router.push("/evenements")}
              className="mt-6 rounded-2xl bg-gradient-to-r from-rose-500 to-fuchsia-500 font-bold text-white">
              {ui.ctaEmpty}
            </Button>
          </div>
        )}

        <div className="space-y-6">
          {bookings.map((b) => {
            const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
            const StatusIcon = cfg.icon;
            const eventDate = b.eventDate?.toDate ? b.eventDate.toDate() : b.eventDate ? new Date(b.eventDate) : null;
            const createdAt = b.createdAt?.toDate ? b.createdAt.toDate() : null;
            const hasResponse = !!b.adminResponse?.message;
            const amount = parseAmount(b.adminResponse?.price);
            const depositPaid = b.depositPaid || paidIds.includes(b.id);
            const canPay = hasResponse && amount > 0 && b.status !== "cancelled" && b.status !== "completed" && !depositPaid;
            const isShowingPayment = payingId === b.id;

            return (
              <div key={b.id} className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">

                {/* Card header */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                  <div>
                    <p className="text-lg font-extrabold text-rose-900">{b.service}</p>
                    <p className="text-xs font-semibold text-slate-400">{b.partnerName}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={`shrink-0 rounded-full border text-xs font-semibold ${cfg.color}`}>
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {isFr ? cfg.labelFr : cfg.labelHt}
                    </Badge>
                    {(b.lastMessageRole === "admin" || b.lastMessageRole === "event_manager") && (
                      <span className="rounded-full bg-fuchsia-500 px-2 py-0.5 text-[10px] font-black text-white animate-pulse">
                        💬 {isFr ? "Réponse reçue" : "Repons resevwa"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Timeline */}
                <div className="px-5 py-4 space-y-0">

                  {/* ── STEP 1 : Votre demande ── */}
                  <TimelineStep
                    icon={<Send className="h-4 w-4 text-rose-500" />}
                    label={ui.stepRequest}
                    dotColor="bg-rose-400"
                    done
                  >
                    <div className="space-y-1.5 text-sm text-slate-600">
                      {eventDate && (
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-rose-300 shrink-0" />
                          <span className="font-medium">{format(eventDate, "EEEE d MMMM yyyy", { locale: fr })}</span>
                        </div>
                      )}
                      {b.userPhone && (
                        <div className="flex items-center gap-2">
                          <PhoneCall className="h-4 w-4 text-rose-300 shrink-0" />
                          <span>{b.userPhone}</span>
                        </div>
                      )}
                      {b.message && (
                        <p className="mt-1 rounded-xl bg-rose-50 px-3 py-2 italic">&quot;{b.message}&quot;</p>
                      )}
                      {createdAt && (
                        <p className="text-xs text-slate-300">
                          {isFr ? "Envoyée le" : "Voye"} {format(createdAt, "d MMM yyyy à HH:mm", { locale: fr })}
                        </p>
                      )}
                    </div>
                  </TimelineStep>

                  {/* ── STEP 2 : Réponse du partenaire ── */}
                  <TimelineStep
                    icon={<MessageSquare className="h-4 w-4 text-fuchsia-500" />}
                    label={ui.stepResponse}
                    dotColor={hasResponse ? "bg-fuchsia-500" : "bg-slate-200"}
                    done={hasResponse}
                  >
                    {hasResponse ? (
                      <div className="space-y-2">
                        <p className="text-sm text-slate-700">{b.adminResponse.message}</p>
                        {b.adminResponse.price && (
                          <div className="inline-flex items-center gap-2 rounded-2xl bg-fuchsia-50 px-4 py-2">
                            <span className="text-xs font-semibold text-fuchsia-600">{isFr ? "Devis" : "Devis"}</span>
                            <span className="text-base font-extrabold text-fuchsia-800">💰 {b.adminResponse.price}</span>
                          </div>
                        )}
                      </div>
                    ) : b.status === "cancelled" ? (
                      <p className="text-sm font-medium text-red-500">{ui.cancelled}</p>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                        <p className="text-sm text-slate-400">{ui.pending}</p>
                      </div>
                    )}
                    {!hasResponse && b.status !== "cancelled" && (
                      <p className="mt-1 text-xs text-slate-300">{ui.pendingHint}</p>
                    )}
                  </TimelineStep>

                  {/* ── Cancel button (pending only) ── */}
                  {b.status === "pending" && !depositPaid && (
                    <div className="px-5 pb-3">
                      <button
                        onClick={() => handleCancel(b.id)}
                        disabled={cancelling === b.id}
                        className="text-xs font-semibold text-red-400 hover:text-red-600 disabled:opacity-40">
                        {cancelling === b.id
                          ? (isFr ? "Annulation…" : "Annilasyon…")
                          : (isFr ? "✕ Annuler ma demande" : "✕ Anile demann mwen")}
                      </button>
                    </div>
                  )}

                  {/* ── STEP 3 : Paiement ── */}
                  {b.status !== "cancelled" && (
                    <TimelineStep
                      icon={<CreditCard className="h-4 w-4 text-emerald-500" />}
                      label={ui.stepPayment}
                      dotColor={depositPaid ? "bg-emerald-500" : "bg-slate-200"}
                      done={depositPaid}
                      isLast
                    >
                      {b.status === "completed" ? (
                        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                          <PartyPopper className="h-4 w-4" /> {ui.completed}
                        </div>
                      ) : depositPaid ? (
                        <p className="text-sm font-semibold text-emerald-600">{ui.payDone}</p>
                      ) : canPay ? (
                        <>
                          {!isShowingPayment ? (
                            <Button
                              onClick={() => setPayingId(b.id)}
                              className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 font-bold text-white shadow">
                              <CreditCard className="mr-2 h-4 w-4" />
                              {ui.payNow} — {b.adminResponse.price}
                            </Button>
                          ) : (
                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                              <MonCashPayment
                                amount={amount}
                                itemInfo={{
                                  id: b.id,
                                  title: `${b.service} — ${b.partnerName}`,
                                  price: amount,
                                  authorName: b.partnerName || "Eventoria",
                                  authorId: b.partnerId || "",
                                  shopName: b.partnerName || "Eventoria",
                                }}
                                onSuccess={async (paymentData) => {
                                  try {
                                    await markEventBookingDepositPaid(b.id, paymentData || {});
                                    setPaidIds((p) => [...p, b.id]);
                                    setPaySuccess(b.id);
                                    setPayingId(null);
                                    if (user) {
                                      const idToken = await user.getIdToken();
                                      const hdr = { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` };
                                      fetch("/api/event-bookings/notify", {
                                        method: "POST",
                                        headers: hdr,
                                        body: JSON.stringify({
                                          type: "deposit_paid",
                                          bookingId: b.id,
                                          partnerName: b.partnerName,
                                          service: b.service,
                                          userName: user.displayName || user.email,
                                        }),
                                      }).catch(() => {});
                                      if (user.email) {
                                        fetch("/api/event-bookings/email", {
                                          method: "POST",
                                          headers: hdr,
                                          body: JSON.stringify({
                                            type: "deposit_confirmed",
                                            toEmail: user.email,
                                            toName: user.displayName || user.email,
                                            language: isFr ? "fr" : "ht",
                                            service: b.service,
                                            partnerName: b.partnerName,
                                            amount: paymentData?.amount,
                                            transactionId: paymentData?.transactionId,
                                          }),
                                        }).catch(() => {});
                                      }
                                    }
                                  } catch (e) {
                                    console.error("Deposit marking error", e);
                                    setPayingId(null);
                                  }
                                }}
                              />
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-slate-300">
                          {isFr
                            ? "Disponible dès que le partenaire confirme le prix."
                            : "Disponib lè patnè a konfime pri a."}
                        </p>
                      )}
                    </TimelineStep>
                  )}

                  {/* ── Conversation ── */}
                  {b.status !== "cancelled" && (
                    <div className="mt-2 px-1">
                      <div className="rounded-2xl border border-slate-100 bg-white p-4">
                        <BookingThread
                          bookingId={b.id}
                          currentUser={user}
                          senderRole="user"
                          isFr={isFr}
                        />
                      </div>
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TimelineStep({ icon, label, dotColor, done, isLast, children }) {
  return (
    <div className="flex gap-4">
      {/* Left: dot + line */}
      <div className="flex flex-col items-center">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${done ? "border-transparent bg-white shadow-sm" : "border-slate-100 bg-slate-50"}`}>
          {icon}
        </div>
        {!isLast && <div className={`mt-1 w-0.5 grow ${done ? "bg-rose-100" : "bg-slate-100"}`} />}
      </div>
      {/* Right: content */}
      <div className={`min-w-0 ${isLast ? "pb-2" : "pb-5"}`}>
        <p className={`mb-2 text-xs font-bold uppercase tracking-wider ${done ? "text-slate-700" : "text-slate-300"}`}>
          {label}
        </p>
        {children}
      </div>
    </div>
  );
}
