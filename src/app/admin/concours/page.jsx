"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToContests, createContest, updateContestStatus,
  addContestQuestion, getAllContestQuestions, validateContestQuestion,
  subscribeToContestLeaderboard, subscribeToContestParticipants,
} from "@/lib/firestore";
import {
  Trophy, Plus, ArrowLeft, CheckCircle2, Clock, XCircle,
  BookOpen, PenLine, Share2, ChevronDown, ChevronUp, Save, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const THEMES_FR = ["Santé maternelle", "Nutrition", "Éducation des enfants", "Développement de l'enfant", "Bien-être familial", "Prévention", "Allaitement", "Vaccination", "Santé mentale", "Hygiène"];

const STATUS_CONFIG = {
  draft:  { label: "Brouillon",  color: "bg-slate-100 text-slate-600",   icon: Clock },
  active: { label: "Actif",      color: "bg-green-100 text-green-700",   icon: CheckCircle2 },
  ended:  { label: "Terminé",    color: "bg-rose-100 text-rose-600",     icon: XCircle },
};

function ContestForm({ onSave, loading }) {
  const [nameFr, setNameFr] = useState("");
  const [nameHt, setNameHt] = useState("");
  const [descFr, setDescFr] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pointsPerAnswer, setPointsPerAnswer] = useState(10);
  const [tiers, setTiers] = useState([
    { count: 5, points: 50 },
    { count: 10, points: 120 },
    { count: 20, points: 300 },
  ]);

  async function handleSubmit(e) {
    e.preventDefault();
    await onSave({
      nameFr, nameHt, descFr,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      pointsPerAnswer: Number(pointsPerAnswer),
      phase3Tiers: tiers,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600">Nom (FR) *</label>
          <input value={nameFr} onChange={(e) => setNameFr(e.target.value)} required
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600">Non (HT)</label>
          <input value={nameHt} onChange={(e) => setNameHt(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold text-slate-600">Description</label>
        <textarea value={descFr} onChange={(e) => setDescFr(e.target.value)} rows={2}
          className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600">Date début</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600">Date fin</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold text-slate-600">Points par bonne réponse (Phase 1)</label>
        <input type="number" min={1} max={100} value={pointsPerAnswer} onChange={(e) => setPointsPerAnswer(e.target.value)}
          className="w-32 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300" />
      </div>
      <div>
        <label className="mb-2 block text-xs font-bold text-slate-600">Paliers soutien communauté (Phase 3)</label>
        <div className="space-y-2">
          {tiers.map((t, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input type="number" min={1} value={t.count} onChange={(e) => setTiers((prev) => prev.map((x, j) => j === i ? { ...x, count: Number(e.target.value) } : x))}
                className="w-20 rounded-xl border border-slate-200 px-3 py-1.5 text-sm outline-none" />
              <span className="text-xs text-slate-400">membres →</span>
              <input type="number" min={1} value={t.points} onChange={(e) => setTiers((prev) => prev.map((x, j) => j === i ? { ...x, points: Number(e.target.value) } : x))}
                className="w-20 rounded-xl border border-slate-200 px-3 py-1.5 text-sm outline-none" />
              <span className="text-xs text-slate-400">pts</span>
            </div>
          ))}
          <button type="button" onClick={() => setTiers((p) => [...p, { count: 30, points: 500 }])}
            className="text-xs font-semibold text-rose-500 hover:underline">+ Ajouter un palier</button>
        </div>
      </div>
      <Button type="submit" disabled={loading || !nameFr.trim()}
        className="rounded-2xl bg-gradient-to-r from-rose-500 to-fuchsia-500 font-bold text-white disabled:opacity-40">
        <Save className="mr-2 h-4 w-4" />
        {loading ? "Création…" : "Créer le concours"}
      </Button>
    </form>
  );
}

function QuestionForm({ contestId, onSaved }) {
  const [textFr, setTextFr] = useState("");
  const [opts, setOpts] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [dayIndex, setDayIndex] = useState(1);
  const [timeLimit, setTimeLimit] = useState(30);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (opts.some((o) => !o.trim()) || !textFr.trim()) return;
    setLoading(true);
    try {
      await addContestQuestion(contestId, {
        textFr, optionsFr: opts,
        correctIndex, dayIndex, timeLimit,
      });
      setTextFr(""); setOpts(["", "", "", ""]); setCorrectIndex(0);
      onSaved?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
      <p className="font-bold text-amber-900">Ajouter une question</p>
      <div>
        <label className="mb-1 block text-xs font-bold text-slate-600">Question (FR) *</label>
        <textarea value={textFr} onChange={(e) => setTextFr(e.target.value)} required rows={2}
          className="w-full resize-none rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-300" />
      </div>
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-600">Options (cochez la bonne réponse)</label>
        {opts.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="radio" name="correct" checked={correctIndex === i} onChange={() => setCorrectIndex(i)} className="accent-green-500" />
            <input value={opt} onChange={(e) => setOpts((p) => p.map((x, j) => j === i ? e.target.value : x))}
              placeholder={`Option ${String.fromCharCode(65 + i)}`} required
              className="flex-1 rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-300" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600">Jour (1-7)</label>
          <input type="number" min={1} max={7} value={dayIndex} onChange={(e) => setDayIndex(Number(e.target.value))}
            className="w-full rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-sm outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600">Timer (sec)</label>
          <input type="number" min={10} max={120} value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))}
            className="w-full rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-sm outline-none" />
        </div>
      </div>
      <Button type="submit" disabled={loading}
        className="rounded-2xl bg-amber-500 font-bold text-white hover:bg-amber-600 disabled:opacity-40">
        <Plus className="mr-2 h-4 w-4" />
        {loading ? "Ajout…" : "Ajouter la question"}
      </Button>
    </form>
  );
}

function ContestManager({ contest }) {
  const [expanded, setExpanded] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [loadingQ, setLoadingQ] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [leaders, setLeaders] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [adminTab, setAdminTab] = useState("participants");

  const cfg = STATUS_CONFIG[contest.status] || STATUS_CONFIG.draft;
  const StatusIcon = cfg.icon;

  async function loadQuestions() {
    setLoadingQ(true);
    try {
      const qs = await getAllContestQuestions(contest.id);
      setQuestions(qs);
    } finally {
      setLoadingQ(false);
    }
  }

  useEffect(() => {
    if (expanded) {
      loadQuestions();
      const unsubLeaders = subscribeToContestLeaderboard(contest.id, setLeaders, () => {});
      const unsubParts = subscribeToContestParticipants(contest.id, setParticipants, () => {});
      return () => { unsubLeaders(); unsubParts(); };
    }
  }, [expanded, contest.id]);

  async function handleValidate(qId, correctIndex) {
    await validateContestQuestion(contest.id, qId, correctIndex);
    await loadQuestions();
  }

  async function handleStatus(status) {
    setStatusLoading(true);
    try { await updateContestStatus(contest.id, status); }
    finally { setStatusLoading(false); }
  }

  const qByDay = questions.reduce((acc, q) => {
    const d = q.dayIndex || 1;
    if (!acc[d]) acc[d] = [];
    acc[d].push(q);
    return acc;
  }, {});

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
      <button onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-fuchsia-500">
            <Trophy className="h-4 w-4 text-white" />
          </div>
          <div className="text-left">
            <p className="font-bold text-slate-800">{contest.nameFr || contest.name}</p>
            <p className="text-xs text-slate-400">{questions.length} questions · {participants.length} participant(s)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${cfg.color}`}>
            <StatusIcon className="mr-1 inline h-3 w-3" />{cfg.label}
          </span>
          {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-6">
          {/* Status actions */}
          <div className="flex flex-wrap gap-2">
            {contest.status === "draft" && (
              <button onClick={() => handleStatus("active")} disabled={statusLoading}
                className="rounded-2xl bg-green-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-green-600 disabled:opacity-40">
                ▶ Activer
              </button>
            )}
            {contest.status === "active" && (
              <button onClick={() => handleStatus("ended")} disabled={statusLoading}
                className="rounded-2xl bg-slate-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-600 disabled:opacity-40">
                ■ Terminer
              </button>
            )}
            {contest.status === "ended" && (
              <button onClick={() => handleStatus("active")} disabled={statusLoading}
                className="rounded-2xl bg-green-100 px-4 py-1.5 text-xs font-bold text-green-700 hover:bg-green-200 disabled:opacity-40">
                ↺ Réactiver
              </button>
            )}
          </div>

          {/* Admin tabs */}
          <div className="flex gap-1 rounded-2xl border border-slate-100 bg-slate-50 p-1">
            {[["participants", `👥 Participants (${participants.length})`], ["questions", `📝 Questions (${questions.length})`], ["scores", "🏆 Classement"]].map(([tab, label]) => (
              <button key={tab} onClick={() => setAdminTab(tab)}
                className={`flex-1 rounded-xl px-3 py-1.5 text-xs font-bold transition ${adminTab === tab ? "bg-white shadow text-rose-700" : "text-slate-500 hover:text-slate-700"}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Participants */}
          {adminTab === "participants" && (
            <div>
              {participants.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-4">Aucun participant inscrit pour l&apos;instant.</p>
              ) : (
                <div className="space-y-1.5">
                  {participants.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2.5">
                      <span className="w-16 shrink-0 rounded-xl bg-rose-100 px-2 py-0.5 text-center text-xs font-extrabold text-rose-600">
                        LM2026-{String(p.participantNumber || "?").padStart(3, "0")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700 truncate">{p.displayName || p.userId?.slice(0, 16)}</p>
                        <p className="text-[11px] text-slate-400">
                          {p.quizStarted ? "Quiz commencé" : "Inscrit — quiz non démarré"}
                          {p.registeredAt?.toDate ? " · " + p.registeredAt.toDate().toLocaleDateString("fr") : ""}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-slate-500">{p.totalScore || 0} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Questions */}
          {adminTab === "questions" && (
            <div className="space-y-4">
              <QuestionForm contestId={contest.id} onSaved={loadQuestions} />
              {Object.entries(qByDay).sort(([a], [b]) => Number(a) - Number(b)).map(([day, qs]) => (
                <div key={day}>
                  <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-400">Jour {day} — {qs.length} question(s)</p>
                  <div className="space-y-2">
                    {qs.map((q) => (
                      <div key={q.id} className={`rounded-2xl border p-3 ${q.expertValidated ? "border-green-100 bg-green-50" : "border-amber-100 bg-white"}`}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-700 leading-snug">{q.textFr}</p>
                          {q.expertValidated
                            ? <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">✓ Validée</span>
                            : <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-600">À valider</span>}
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-400">{q.timeLimit}s</p>
                        <div className="mt-2 grid grid-cols-2 gap-1">
                          {(q.optionsFr || []).map((opt, i) => (
                            <div key={i} className={`flex items-center gap-1.5 rounded-xl px-2 py-1 text-xs ${i === q.correctIndex ? "bg-green-100 text-green-700 font-bold" : "bg-slate-50 text-slate-500"}`}>
                              <span className="font-bold">{String.fromCharCode(65 + i)}.</span> {opt}
                            </div>
                          ))}
                        </div>
                        {!q.expertValidated && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {(q.optionsFr || []).map((opt, i) => (
                              <button key={i} onClick={() => handleValidate(q.id, i)}
                                className="rounded-xl bg-green-500 px-3 py-1 text-xs font-bold text-white hover:bg-green-600">
                                ✓ Valider &quot;{String.fromCharCode(65 + i)}&quot;
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {loadingQ && <div className="flex justify-center py-4"><div className="h-5 w-5 animate-spin rounded-full border-4 border-rose-200 border-t-rose-500" /></div>}
            </div>
          )}

          {/* Leaderboard */}
          {adminTab === "scores" && (
            <div>
              {leaders.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-4">Aucun score enregistré pour l&apos;instant.</p>
              ) : (
                <div className="space-y-1.5">
                  {leaders.slice(0, 20).map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2.5">
                      <span className="w-6 text-center text-sm font-extrabold text-slate-400">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700 truncate">{p.displayName || p.userId?.slice(0, 16)}</p>
                        <p className="text-[11px] text-slate-400">P1: {p.phase1Score || 0} · P2: {p.phase2Score || 0} · P3: {p.phase3Score || 0}</p>
                      </div>
                      <span className="font-extrabold text-rose-600">{p.totalScore || 0} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminConcoursPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [contests, setContests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAdmin = userProfile?.role === "admin";

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) router.push("/");
  }, [user, isAdmin, authLoading]);

  useEffect(() => {
    const unsub = subscribeToContests((data) => { setContests(data); setLoading(false); }, () => setLoading(false));
    return () => unsub();
  }, []);

  async function handleCreate(data) {
    setCreating(true);
    try {
      await createContest(data);
      setShowForm(false);
    } finally {
      setCreating(false);
    }
  }

  if (authLoading || loading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-200 border-t-rose-500" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16 pt-6">
      <div className="mx-auto max-w-3xl px-4">
        {/* Header */}
        <div className="mb-8">
          <button onClick={() => router.push("/admin")}
            className="mb-4 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-4 w-4" /> Admin
          </button>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-fuchsia-500">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-rose-900">Gestion des concours</h1>
                <p className="text-sm text-slate-400">{contests.length} concours</p>
              </div>
            </div>
            <button onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-fuchsia-500 px-4 py-2 font-bold text-white shadow hover:opacity-90">
              <Plus className="h-4 w-4" />
              Nouveau concours
            </button>
          </div>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="mb-6 rounded-3xl border border-rose-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-extrabold text-rose-900">Créer un nouveau concours</h2>
            <ContestForm onSave={handleCreate} loading={creating} />
          </div>
        )}

        {/* Contests list */}
        <div className="space-y-4">
          {contests.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-rose-200 bg-white p-12 text-center">
              <Trophy className="mx-auto mb-3 h-10 w-10 text-rose-200" />
              <p className="font-bold text-rose-900">Aucun concours</p>
              <p className="mt-1 text-sm text-slate-400">Créez le premier concours avec le bouton ci-dessus.</p>
            </div>
          ) : (
            contests.map((c) => <ContestManager key={c.id} contest={c} />)
          )}
        </div>
      </div>
    </div>
  );
}
