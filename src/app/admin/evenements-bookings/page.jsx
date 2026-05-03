"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToAllEventBookings, updateEventBookingStatus, respondToEventBooking, grantEventManagerRole, revokeEventManagerRole, getEventManagers } from "@/lib/firestore";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BookingThread from "@/components/BookingThread";
import {
  startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek,
  isSameMonth, isSameDay, isToday, addMonths, subMonths,
} from "date-fns";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Send,
  PhoneCall,
  Users,
  UserPlus,
  List,
  Trash2,
} from "lucide-react";

const DOT_COLORS = {
  pending:   "bg-amber-400",
  confirmed: "bg-green-500",
  completed: "bg-slate-400",
  cancelled: "bg-red-400",
};

function CalendarView({ bookings }) {
  const [viewMonth, setViewMonth] = useState(new Date());
  const [selected, setSelected] = useState(null);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
  });

  function getBookingsForDay(day) {
    return bookings.filter((b) => {
      if (!b.eventDate) return false;
      const d = b.eventDate?.toDate ? b.eventDate.toDate() : new Date(b.eventDate);
      return isSameDay(d, day);
    });
  }

  const selectedBookings = selected ? getBookingsForDay(selected) : [];

  return (
    <div className="space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => setViewMonth((m) => subMonths(m, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100">
          <ChevronLeft className="h-4 w-4 text-slate-500" />
        </button>
        <p className="font-extrabold text-rose-900 capitalize">
          {format(viewMonth, "MMMM yyyy", { locale: fr })}
        </p>
        <button onClick={() => setViewMonth((m) => addMonths(m, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100">
          <ChevronRight className="h-4 w-4 text-slate-500" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 text-center">
        {["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map((d) => (
          <p key={d} className="py-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{d}</p>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayBookings = getBookingsForDay(day);
          const inMonth = isSameMonth(day, viewMonth);
          const sel = selected && isSameDay(day, selected);
          const today = isToday(day);
          return (
            <button key={day.toISOString()} onClick={() => setSelected(sel ? null : day)}
              className={[
                "relative flex flex-col items-center rounded-2xl py-2 transition",
                !inMonth && "opacity-30",
                sel && "bg-rose-100 ring-2 ring-rose-400",
                !sel && today && "ring-2 ring-fuchsia-300 bg-fuchsia-50",
                !sel && !today && "hover:bg-slate-50",
              ].filter(Boolean).join(" ")}>
              <span className={`text-sm font-bold ${today ? "text-fuchsia-700" : "text-slate-700"}`}>
                {format(day, "d")}
              </span>
              {dayBookings.length > 0 && (
                <div className="mt-1 flex flex-wrap justify-center gap-0.5">
                  {dayBookings.slice(0, 3).map((b) => (
                    <span key={b.id} className={`h-1.5 w-1.5 rounded-full ${DOT_COLORS[b.status] || "bg-slate-400"}`} />
                  ))}
                  {dayBookings.length > 3 && (
                    <span className="text-[9px] font-bold text-slate-400">+{dayBookings.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day bookings */}
      {selected && (
        <div className="space-y-2 border-t border-slate-100 pt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            {format(selected, "EEEE d MMMM", { locale: fr })}
            {" — "}{selectedBookings.length} événement{selectedBookings.length !== 1 ? "s" : ""}
          </p>
          {selectedBookings.length === 0 ? (
            <p className="text-sm text-slate-300">Aucun événement ce jour.</p>
          ) : (
            selectedBookings.map((b) => {
              const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
              return (
                <div key={b.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                  <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${DOT_COLORS[b.status] || "bg-slate-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-rose-900 truncate">{b.service}</p>
                    <p className="text-xs text-slate-500">{b.userName} · {b.partnerName}</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-3">
        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className={`h-2 w-2 rounded-full ${DOT_COLORS[k]}`} />{v.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function WhatsAppButton({ phone, bookingInfo }) {
  if (!phone) return null;
  const clean = String(phone).replace(/[^\d+]/g, "");
  const msg = encodeURIComponent(
    `Bonjour ! Je vous contacte concernant votre demande de devis pour « ${bookingInfo.service} » (${bookingInfo.partnerName}). Voici notre réponse :`
  );
  return (
    <a
      href={`https://wa.me/${clean}?text=${msg}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 rounded-2xl bg-green-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-600"
      title="Contacter via WhatsApp">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.564 4.14 1.548 5.877L0 24l6.304-1.524A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.019-1.374l-.36-.214-3.737.902.939-3.617-.235-.372A9.818 9.818 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182c5.42 0 9.818 4.398 9.818 9.818 0 5.42-4.398 9.818-9.818 9.818z"/></svg>
      WhatsApp
    </a>
  );
}

const STATUS_CONFIG = {
  pending:   { label: "En attente",  color: "bg-amber-50 text-amber-700 border-amber-200",  icon: Clock },
  confirmed: { label: "Confirmée",   color: "bg-green-50 text-green-700 border-green-200",  icon: CheckCircle2 },
  completed: { label: "Terminée",    color: "bg-slate-50 text-slate-500 border-slate-200",  icon: Sparkles },
  cancelled: { label: "Annulée",     color: "bg-red-50 text-red-600 border-red-200",        icon: XCircle },
};

export default function AdminEventBookingsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const [responding, setResponding] = useState({});
  const [responseText, setResponseText] = useState({});
  const [priceText, setPriceText] = useState({});
  const [submitting, setSubmitting] = useState(null);

  const [agents, setAgents] = useState([]);
  const [agentEmail, setAgentEmail] = useState("");
  const [agentPartner, setAgentPartner] = useState("");
  const [agentError, setAgentError] = useState("");
  const [agentSuccess, setAgentSuccess] = useState("");
  const [agentLoading, setAgentLoading] = useState(false);
  const [showAgentPanel, setShowAgentPanel] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) { router.push("/"); return; }
    const unsub = subscribeToAllEventBookings(
      (data) => { setBookings(data); setLoading(false); },
      () => setLoading(false)
    );
    getEventManagers().then(setAgents).catch(() => {});
    return () => unsub();
  }, [user, isAdmin, authLoading, router]);

  async function handleGrantAccess() {
    if (!agentEmail.trim() || !agentPartner.trim()) return;
    setAgentLoading(true); setAgentError(""); setAgentSuccess("");
    try {
      const u = await grantEventManagerRole(agentEmail.trim(), agentPartner.trim());
      setAgentSuccess(`✓ Accès accordé à ${u.name || u.email}`);
      setAgentEmail(""); setAgentPartner("");
      setAgents(await getEventManagers());
    } catch (e) {
      setAgentError(e.message || "Erreur inconnue");
    } finally {
      setAgentLoading(false);
    }
  }

  async function handleRevokeAccess(uid) {
    try {
      await revokeEventManagerRole(uid);
      setAgents(await getEventManagers());
    } catch (e) {
      console.error(e);
    }
  }

  async function handleRespond(bookingId) {
    const msg = responseText[bookingId] || "";
    const price = priceText[bookingId] || "";
    if (!msg.trim()) return;
    setSubmitting(bookingId);
    try {
      const booking = bookings.find((b) => b.id === bookingId);
      await respondToEventBooking(bookingId, { message: msg, price, status: "confirmed" });
      setResponding((p) => ({ ...p, [bookingId]: false }));
      setResponseText((p) => ({ ...p, [bookingId]: "" }));
      setPriceText((p) => ({ ...p, [bookingId]: "" }));

      if (booking?.userId && user) {
        const idToken = await user.getIdToken();
        const headers = { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` };
        fetch("/api/notify", {
          method: "POST",
          headers,
          body: JSON.stringify({
            recipientUid: booking.userId,
            title: `📋 Réponse à votre demande — ${booking.service}`,
            body: price ? `Devis reçu : ${price}` : "Le partenaire a répondu à votre demande.",
            url: "/evenements/mes-demandes",
          }),
        }).catch(() => {});
        if (booking.userEmail) {
          fetch("/api/event-bookings/email", {
            method: "POST",
            headers,
            body: JSON.stringify({
              type: "booking_responded",
              toEmail: booking.userEmail,
              toName: booking.userName || "Client",
              language: "fr",
              service: booking.service,
              partnerName: booking.partnerName,
              adminMessage: msg,
              price,
            }),
          }).catch(() => {});
        }
      }
    } finally {
      setSubmitting(null);
    }
  }

  async function handleStatusChange(bookingId, status) {
    setSubmitting(bookingId + status);
    try {
      await updateEventBookingStatus(bookingId, status);
    } finally {
      setSubmitting(null);
    }
  }

  const filtered = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);
  const counts = bookings.reduce((acc, b) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc; }, {});
  const pendingCount = counts.pending || 0;

  function exportCSV() {
    const rows = [
      ["Date demande","Client","Email","Téléphone","Partenaire","Service","Date événement","Statut","Réponse","Prix proposé","Acompte payé","Montant acompte","Transaction ID"],
      ...bookings.map((b) => {
        const created = b.createdAt?.toDate ? b.createdAt.toDate() : b.createdAt ? new Date(b.createdAt) : null;
        const evDate = b.eventDate?.toDate ? b.eventDate.toDate() : b.eventDate ? new Date(b.eventDate) : null;
        return [
          created ? format(created, "dd/MM/yyyy HH:mm", { locale: fr }) : "",
          b.userName || "",
          b.userEmail || "",
          b.userPhone || "",
          b.partnerName || "",
          b.service || "",
          evDate ? format(evDate, "dd/MM/yyyy", { locale: fr }) : "",
          b.status || "",
          b.adminResponse?.message || "",
          b.adminResponse?.price || "",
          b.depositPaid ? "Oui" : "Non",
          b.depositAmount > 0 ? b.depositAmount : "",
          b.depositTransactionId || "",
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
      }),
    ];
    const csv = rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings-evenements-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalDeposits = bookings
    .filter((b) => b.depositPaid)
    .reduce((sum, b) => sum + (Number(b.depositAmount) || 0), 0);
  const depositsCount = bookings.filter((b) => b.depositPaid).length;

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-200 border-t-rose-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">

        {/* Header */}
        <div className="mb-8">
          <button onClick={() => router.push("/admin")}
            className="mb-4 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-4 w-4" /> Admin
          </button>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-fuchsia-500">
                <ClipboardList className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-rose-900">Demandes événementielles</h1>
                <p className="text-sm text-slate-500">
                  {bookings.length} demande{bookings.length !== 1 ? "s" : ""} — temps réel
                  {pendingCount > 0 && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                      {pendingCount} en attente
                    </span>
                  )}
                </p>
              </div>
            </div>
            {bookings.length > 0 && (
              <button onClick={exportCSV}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 shadow-sm">
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17"/></svg>
                Exporter CSV
              </button>
            )}
          </div>
        </div>

        {/* View toggle + Filter tabs */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition ${viewMode === "list" ? "bg-rose-900 text-white shadow" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}>
              <List className="h-3.5 w-3.5" /> Liste
            </button>
            <button onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition ${viewMode === "calendar" ? "bg-rose-900 text-white shadow" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}>
              <CalendarDays className="h-3.5 w-3.5" /> Calendrier
            </button>
          </div>
          {viewMode === "list" && (
            <div className="flex flex-wrap gap-2">
              {[["all", "Toutes", null], ["pending", "En attente", Clock], ["confirmed", "Confirmées", CheckCircle2], ["completed", "Terminées", Sparkles], ["cancelled", "Annulées", XCircle]].map(([val, label, Icon]) => (
                <button key={val} onClick={() => setFilter(val)}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    filter === val ? "bg-rose-500 text-white shadow" : "bg-white text-slate-600 hover:bg-rose-50 border border-slate-200"
                  }`}>
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {label}
                  {val !== "all" && counts[val] ? (
                    <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${filter === val ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                      {counts[val]}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Calendar view */}
        {viewMode === "calendar" && (
          <div className="mb-8 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
            <CalendarView bookings={bookings} />
          </div>
        )}

        {/* Empty (list only) */}
        {viewMode === "list" && filtered.length === 0 && (
          <div className="rounded-[2rem] border border-rose-100 bg-white p-12 text-center">
            <CalendarDays className="mx-auto mb-4 h-10 w-10 text-rose-200" />
            <p className="font-bold text-slate-400">Aucune demande dans ce statut.</p>
          </div>
        )}

        {/* Financial summary */}
        {depositsCount > 0 && (
          <div className="mb-6 flex flex-wrap gap-3">
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500">
                <span className="text-base">💳</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-700">Acomptes reçus</p>
                <p className="text-lg font-extrabold text-emerald-900">{depositsCount} paiement{depositsCount > 1 ? "s" : ""}</p>
              </div>
            </div>
            {totalDeposits > 0 && (
              <div className="flex items-center gap-3 rounded-2xl border border-fuchsia-100 bg-fuchsia-50 px-5 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-fuchsia-500">
                  <span className="text-base">💰</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-fuchsia-700">Total encaissé</p>
                  <p className="text-lg font-extrabold text-fuchsia-900">{totalDeposits.toLocaleString("fr-FR")} HTG</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Agent access panel */}
        <div className="mb-6 rounded-[2rem] border border-fuchsia-100 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setShowAgentPanel((v) => !v)}
            className="flex w-full items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-fuchsia-500" />
              <span className="font-bold text-slate-800">Accès agents événements</span>
              <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-xs font-bold text-fuchsia-700">
                {agents.length} agent{agents.length !== 1 ? "s" : ""}
              </span>
            </div>
            <span className="text-xs text-slate-400">{showAgentPanel ? "Masquer ▲" : "Gérer ▼"}</span>
          </button>

          {showAgentPanel && (
            <div className="border-t border-fuchsia-50 px-5 pb-5 pt-4 space-y-4">

              {/* Add agent form */}
              <div className="rounded-2xl bg-fuchsia-50 p-4 space-y-3">
                <p className="text-xs font-bold text-fuchsia-800">Lier un email à un partenaire</p>
                <input
                  type="email"
                  value={agentEmail}
                  onChange={(e) => setAgentEmail(e.target.value)}
                  placeholder="Email du membre (ex : marie@eventoria.ht)"
                  className="w-full rounded-xl border border-fuchsia-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fuchsia-300"
                />
                <input
                  type="text"
                  value={agentPartner}
                  onChange={(e) => setAgentPartner(e.target.value)}
                  placeholder="Nom du partenaire exact (ex : Eventoria)"
                  className="w-full rounded-xl border border-fuchsia-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fuchsia-300"
                />
                {agentError && <p className="text-xs font-semibold text-red-500">{agentError}</p>}
                {agentSuccess && <p className="text-xs font-semibold text-green-600">{agentSuccess}</p>}
                <Button
                  disabled={!agentEmail.trim() || !agentPartner.trim() || agentLoading}
                  onClick={handleGrantAccess}
                  className="rounded-2xl bg-gradient-to-r from-rose-500 to-fuchsia-500 font-bold text-white disabled:opacity-40">
                  <UserPlus className="mr-2 h-4 w-4" />
                  {agentLoading ? "En cours…" : "Donner l'accès"}
                </Button>
              </div>

              {/* Existing agents */}
              {agents.length > 0 && (
                <div className="space-y-2">
                  {agents.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{a.name || a.displayName || a.email}</p>
                        <p className="text-xs text-slate-400">{a.email} — <span className="font-semibold text-fuchsia-600">{a.partnerName}</span></p>
                      </div>
                      <button
                        onClick={() => handleRevokeAccess(a.id)}
                        className="rounded-xl p-2 text-red-400 hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cards (list mode only) */}
        {viewMode === "list" && <div className="space-y-3">
          {filtered.map((b) => {
            const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
            const StatusIcon = cfg.icon;
            const eventDate = b.eventDate?.toDate ? b.eventDate.toDate() : b.eventDate ? new Date(b.eventDate) : null;
            const createdAt = b.createdAt?.toDate ? b.createdAt.toDate() : null;
            const isExpanded = expanded === b.id;
            const isResponding = responding[b.id];
            const hasResponse = !!b.adminResponse?.message;

            return (
              <div key={b.id} className={`rounded-[2rem] border bg-white shadow-sm transition-all ${b.status === "pending" ? "border-amber-200" : "border-slate-100"}`}>

                {/* Card header — always visible */}
                <button type="button" onClick={() => setExpanded(isExpanded ? null : b.id)}
                  className="w-full p-5 text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={`rounded-full border text-xs font-semibold ${cfg.color}`}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {cfg.label}
                        </Badge>
                        {b.status === "pending" && (
                          <span className="animate-pulse rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-white">
                            Nouveau
                          </span>
                        )}
                        {b.depositPaid && (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                            💳 Acompte payé
                          </span>
                        )}
                        {b.lastMessageRole === "user" && (
                          <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white animate-pulse">
                            💬 Nouveau message
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-base font-extrabold text-rose-900">{b.service}</p>
                      <p className="text-sm font-semibold text-slate-700">{b.userName}</p>
                      {eventDate && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          📅 {format(eventDate, "d MMMM yyyy", { locale: fr })}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {createdAt && (
                        <p className="text-[11px] text-slate-300">
                          {format(createdAt, "d MMM HH:mm", { locale: fr })}
                        </p>
                      )}
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </div>
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-4">

                    {/* Contact */}
                    <div className="space-y-1.5">
                      {b.userPhone && (
                        <div className="flex flex-wrap items-center gap-2">
                          <a href={`tel:${b.userPhone}`}
                            className="flex items-center gap-2 text-sm font-semibold text-rose-600 hover:underline">
                            <PhoneCall className="h-4 w-4" /> {b.userPhone}
                          </a>
                          <WhatsAppButton phone={b.userPhone} bookingInfo={{ service: b.service, partnerName: b.partnerName }} />
                        </div>
                      )}
                      {b.userEmail && (
                        <p className="text-xs text-slate-400">{b.userEmail}</p>
                      )}
                    </div>

                    {/* Client message */}
                    {b.message && (
                      <div className="rounded-2xl bg-rose-50 px-4 py-3">
                        <p className="mb-1 text-xs font-bold text-rose-700">Message du client</p>
                        <p className="text-sm italic text-slate-600">&quot;{b.message}&quot;</p>
                      </div>
                    )}

                    {/* Existing admin response */}
                    {hasResponse && (
                      <div className="rounded-2xl bg-fuchsia-50 px-4 py-3">
                        <p className="mb-1 text-xs font-bold text-fuchsia-700">Votre réponse envoyée</p>
                        <p className="text-sm text-slate-700">{b.adminResponse.message}</p>
                        {b.adminResponse.price && (
                          <p className="mt-1 text-sm font-bold text-fuchsia-700">💰 {b.adminResponse.price}</p>
                        )}
                      </div>
                    )}

                    {/* Deposit payment details */}
                    {b.depositPaid && (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 space-y-1">
                        <p className="text-xs font-bold text-emerald-700">💳 Acompte reçu</p>
                        {b.depositAmount > 0 && (
                          <p className="text-sm font-extrabold text-emerald-800">{Number(b.depositAmount).toLocaleString("fr-FR")} HTG</p>
                        )}
                        {b.depositTransactionId && (
                          <p className="text-xs text-emerald-600 font-mono">ID : {b.depositTransactionId}</p>
                        )}
                        {b.depositPaidAt && (
                          <p className="text-xs text-emerald-500">
                            {format(b.depositPaidAt.toDate ? b.depositPaidAt.toDate() : new Date(b.depositPaidAt), "d MMM yyyy à HH:mm", { locale: fr })}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Inline response form */}
                    {b.status !== "cancelled" && b.status !== "completed" && (
                      <>
                        {!isResponding ? (
                          <button
                            onClick={() => setResponding((p) => ({ ...p, [b.id]: true }))}
                            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-fuchsia-500 px-4 py-2 text-sm font-bold text-white hover:opacity-90">
                            <MessageSquare className="h-4 w-4" />
                            {hasResponse ? "Modifier la réponse" : "Répondre au client"}
                          </button>
                        ) : (
                          <div className="space-y-3 rounded-2xl border border-fuchsia-100 bg-fuchsia-50 p-4">
                            <p className="text-xs font-bold text-fuchsia-800">Votre réponse (visible par le client dans l&apos;app)</p>
                            <textarea
                              rows={3}
                              value={responseText[b.id] || ""}
                              onChange={(e) => setResponseText((p) => ({ ...p, [b.id]: e.target.value }))}
                              placeholder="Ex : Bonjour ! Nous pouvons organiser votre baby shower le 12 mai. Voici notre proposition…"
                              className="w-full resize-none rounded-xl border border-fuchsia-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-fuchsia-300"
                            />
                            <input
                              type="text"
                              value={priceText[b.id] || ""}
                              onChange={(e) => setPriceText((p) => ({ ...p, [b.id]: e.target.value }))}
                              placeholder="Prix estimé (ex : 25 000 HTG, ou Gratuite la consultation)"
                              className="w-full rounded-xl border border-fuchsia-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-fuchsia-300"
                            />
                            <div className="flex gap-2">
                              <Button
                                disabled={!responseText[b.id]?.trim() || submitting === b.id}
                                onClick={() => handleRespond(b.id)}
                                className="rounded-2xl bg-gradient-to-r from-rose-500 to-fuchsia-500 font-bold text-white disabled:opacity-40">
                                <Send className="mr-2 h-4 w-4" />
                                {submitting === b.id ? "Envoi…" : "Envoyer au client"}
                              </Button>
                              <Button variant="outline"
                                onClick={() => setResponding((p) => ({ ...p, [b.id]: false }))}
                                className="rounded-2xl border-slate-200 text-slate-500">
                                Annuler
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Conversation thread */}
                    {b.status !== "cancelled" && (
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <BookingThread
                          bookingId={b.id}
                          currentUser={user}
                          senderRole="admin"
                          isFr={true}
                        />
                      </div>
                    )}

                    {/* Status change */}
                    <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                      {b.status !== "completed" && b.status !== "cancelled" && (
                        <Button size="sm"
                          disabled={!!submitting}
                          onClick={() => handleStatusChange(b.id, "completed")}
                          className="rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 font-bold text-white">
                          {submitting === b.id + "completed" ? "…" : "✅ Marquer terminé"}
                        </Button>
                      )}
                      {b.status !== "cancelled" && (
                        <Button size="sm" variant="outline"
                          disabled={!!submitting}
                          onClick={() => handleStatusChange(b.id, "cancelled")}
                          className="rounded-2xl border-red-200 text-red-600 hover:bg-red-50">
                          {submitting === b.id + "cancelled" ? "…" : "✗ Annuler la demande"}
                        </Button>
                      )}
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>}

      </div>
    </div>
  );
}
