"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Image from "next/image";
import {
  getContest, getContestQuestionsForDay, startContestQuizSession,
  submitContestAnswer, getContestParticipant, addContestPublication,
  subscribeToContestPublications, voteContestPublication, getUserVotesForContest,
  subscribeToContestLeaderboard, registerForContest,
} from "@/lib/firestore";
import {
  Trophy, BookOpen, PenLine, Share2, Clock, CheckCircle2, XCircle,
  ChevronLeft, ChevronRight, Heart, Star, Users, Copy, ArrowLeft, AlertTriangle,
  CalendarDays, Hash, Sparkles,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getContestDay(contest) {
  if (!contest?.startDate) return 1;
  const start = contest.startDate?.toDate ? contest.startDate.toDate() : new Date(contest.startDate);
  const diff = differenceInDays(new Date(), start);
  return Math.max(1, Math.min(diff + 1, contest.phase1Days || 7));
}

// ─── Quiz Timer ───────────────────────────────────────────────────────────────
function QuizTimer({ seconds, onExpire }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    setLeft(seconds);
  }, [seconds]);
  useEffect(() => {
    if (left <= 0) { onExpire(); return; }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left, onExpire]);
  const pct = (left / seconds) * 100;
  const color = left <= 5 ? "bg-red-500" : left <= 10 ? "bg-amber-400" : "bg-green-500";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-bold">
        <span className="flex items-center gap-1 text-slate-500"><Clock className="h-3.5 w-3.5" />{left}s</span>
        <span className={`rounded-full px-2 py-0.5 text-white text-[10px] ${left <= 5 ? "bg-red-500" : left <= 10 ? "bg-amber-400" : "bg-green-500"}`}>{left <= 5 ? "⚡ Vite !" : left <= 10 ? "⏱ Dépêche-toi" : "✓ Temps OK"}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Phase 1 – Quiz ───────────────────────────────────────────────────────────
function Phase1Quiz({ contest, participant, currentUser, isFr, onScoreUpdate }) {
  const [questions, setQuestions] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [expired, setExpired] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const [sessionScore, setSessionScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const day = getContestDay(contest);
  const answered = participant?.answeredQuestions || {};

  useEffect(() => {
    getContestQuestionsForDay(contest.id, day)
      .then((qs) => { setQuestions(qs); setLoading(false); })
      .catch(() => setLoading(false));
  }, [contest.id, day]);

  const unanswered = questions.filter((q) => !answered[q.id]);

  const currentQ = unanswered[qIndex] || null;
  const opts = isFr ? (currentQ?.optionsFr || []) : (currentQ?.optionsHt?.length ? currentQ.optionsHt : currentQ?.optionsFr || []);

  function handleExpire() {
    if (result !== null) return;
    setExpired(true);
    setResult({ isCorrect: false, points: 0 });
  }

  async function handleSubmit() {
    if (selected === null || submitting || result !== null) return;
    setSubmitting(true);
    try {
      const res = await submitContestAnswer(
        contest.id, currentUser.uid, currentQ.id,
        selected, currentQ.correctIndex, contest.pointsPerAnswer || 10
      );
      setResult(res);
      if (res.isCorrect) setSessionScore((s) => s + (res.points || 0));
      onScoreUpdate?.();
    } finally {
      setSubmitting(false);
    }
  }

  function nextQuestion() {
    setSelected(null);
    setResult(null);
    setExpired(false);
    setTimerKey((k) => k + 1);
    if (qIndex + 1 >= unanswered.length) { setFinished(true); return; }
    setQIndex((i) => i + 1);
  }

  if (loading) return <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-4 border-rose-200 border-t-rose-500" /></div>;

  if (unanswered.length === 0 || finished) {
    return (
      <div className="rounded-2xl border border-green-100 bg-green-50 p-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-500" />
        <p className="font-extrabold text-green-800">{isFr ? "Questions du jour terminées !" : "Kesyon jou a fini !"}</p>
        {sessionScore > 0 && <p className="mt-1 text-sm text-green-600">+{sessionScore} pts {isFr ? "cette session" : "sesyon sa a"}</p>}
        <p className="mt-2 text-xs text-slate-400">{isFr ? `Revenez demain pour le Jour ${Math.min(day + 1, contest.phase1Days || 7)}` : `Tounen demen pou Jou ${Math.min(day + 1, contest.phase1Days || 7)}`}</p>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="font-bold text-amber-900">{isFr ? "Attention !" : "Atansyon !"}</p>
              <p className="mt-1 text-sm text-amber-700">{isFr ? `Une fois commencé, vous devez répondre aux ${unanswered.length} questions sans quitter. Chaque question a un minuteur de ${currentQ?.timeLimit || 30} secondes.` : `Yon fwa ou kòmanse, fòk ou reponn ${unanswered.length} kesyon yo san kite. Chak kesyon gen yon minuteur ${currentQ?.timeLimit || 30} segond.`}</p>
            </div>
          </div>
        </div>
        <div className="text-center text-sm text-slate-500">
          <p className="font-semibold text-rose-900">{isFr ? `Jour ${day} — ${unanswered.length} questions` : `Jou ${day} — ${unanswered.length} kesyon`}</p>
          <p className="mt-0.5">{isFr ? `${contest.pointsPerAnswer || 10} pts par bonne réponse` : `${contest.pointsPerAnswer || 10} pts pou chak bon repons`}</p>
        </div>
        <button onClick={() => setStarted(true)}
          className="w-full rounded-2xl bg-gradient-to-r from-rose-500 to-fuchsia-500 py-3 font-bold text-white shadow hover:opacity-90">
          {isFr ? "Je suis prêt(e) — Commencer" : "Mwen prè — Kòmanse"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{isFr ? `Question ${qIndex + 1} / ${unanswered.length}` : `Kesyon ${qIndex + 1} / ${unanswered.length}`}</span>
        <span className="font-bold text-rose-600">{isFr ? `Jour ${day}` : `Jou ${day}`}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-rose-400 to-fuchsia-500 transition-all" style={{ width: `${((qIndex) / unanswered.length) * 100}%` }} />
      </div>

      {/* Timer */}
      {result === null && !expired && (
        <QuizTimer key={timerKey} seconds={currentQ?.timeLimit || 30} onExpire={handleExpire} />
      )}

      {/* Question */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="font-bold text-slate-800 leading-snug text-base">{isFr ? currentQ?.textFr : (currentQ?.textHt || currentQ?.textFr)}</p>
      </div>

      {/* Options */}
      <div className="grid gap-2">
        {opts.map((opt, i) => {
          let style = "border-slate-200 bg-white text-slate-700 hover:border-rose-300 hover:bg-rose-50";
          if (result !== null || expired) {
            if (i === currentQ?.correctIndex) style = "border-green-400 bg-green-50 text-green-800 font-bold";
            else if (i === selected && !result?.isCorrect) style = "border-red-300 bg-red-50 text-red-700";
            else style = "border-slate-100 bg-slate-50 text-slate-400 opacity-60";
          } else if (selected === i) {
            style = "border-rose-400 bg-rose-50 text-rose-800 font-semibold";
          }
          return (
            <button key={i} disabled={result !== null || expired || submitting}
              onClick={() => setSelected(i)}
              className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${style}`}>
              <span className="mr-2 font-bold text-slate-400">{String.fromCharCode(65 + i)}.</span>{opt}
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      {(result !== null || expired) && (
        <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${result?.isCorrect ? "border-green-200 bg-green-50 text-green-700" : "border-red-100 bg-red-50 text-red-600"}`}>
          {expired && !result?.isCorrect
            ? (isFr ? "⏱ Temps écoulé ! Bonne réponse : " : "⏱ Tan fini ! Bon repons : ") + opts[currentQ?.correctIndex]
            : result?.isCorrect
              ? (isFr ? `✓ Bonne réponse ! +${result.points} pts` : `✓ Bon repons ! +${result.points} pts`)
              : (isFr ? `✗ Mauvaise réponse. Bonne réponse : ${opts[currentQ?.correctIndex]}` : `✗ Move repons. Bon repons : ${opts[currentQ?.correctIndex]}`)}
        </div>
      )}

      {/* Actions */}
      {result !== null || expired ? (
        <button onClick={nextQuestion} className="w-full rounded-2xl bg-gradient-to-r from-rose-500 to-fuchsia-500 py-3 font-bold text-white shadow hover:opacity-90">
          {qIndex + 1 >= unanswered.length ? (isFr ? "Terminer" : "Fini") : (isFr ? "Question suivante →" : "Pwochen kesyon →")}
        </button>
      ) : (
        <button onClick={handleSubmit} disabled={selected === null || submitting}
          className="w-full rounded-2xl bg-gradient-to-r from-rose-500 to-fuchsia-500 py-3 font-bold text-white shadow disabled:opacity-40 hover:opacity-90">
          {submitting ? "…" : (isFr ? "Valider ma réponse" : "Valide repons mwen")}
        </button>
      )}
    </div>
  );
}

// ─── Phase 2 – Publications ───────────────────────────────────────────────────
const PUB_CATEGORIES_FR = ["Santé maternelle", "Éducation des enfants", "Bien-être familial", "Nutrition & alimentation", "Développement de l'enfant"];
const PUB_CATEGORIES_HT = ["Sante manman", "Edikasyon timoun", "Byennèt fanmi", "Nitrisyon ak manje", "Devlopman timoun"];

function Phase2Publications({ contest, currentUser, isFr, userProfile }) {
  const [publications, setPublications] = useState([]);
  const [myVotes, setMyVotes] = useState(new Set());
  const [textFr, setTextFr] = useState("");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [voting, setVoting] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [myPub, setMyPub] = useState(null);

  useEffect(() => {
    const unsub = subscribeToContestPublications(contest.id, (pubs) => {
      setPublications(pubs);
      setMyPub(pubs.find((p) => p.userId === currentUser?.uid) || null);
    }, () => {});
    return () => unsub();
  }, [contest.id, currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserVotesForContest(contest.id, currentUser.uid).then(setMyVotes).catch(() => {});
  }, [contest.id, currentUser?.uid]);

  async function handlePublish(e) {
    e.preventDefault();
    if (!textFr.trim() || !category) return;
    setSubmitting(true); setError(""); setSuccess("");
    try {
      await addContestPublication(contest.id, {
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email?.split("@")[0] || "Participant",
        userAvatar: currentUser.photoURL || null,
        textFr: textFr.trim(), textHt: textFr.trim(), category,
      });
      setSuccess(isFr ? "Publication soumise !" : "Piblikasyon soumèt !");
      setTextFr(""); setCategory("");
    } catch (err) {
      setError(err.message === "already_published" ? (isFr ? "Vous avez déjà publié." : "Ou deja pibliye.") : (isFr ? "Erreur lors de la publication." : "Erè pandan pibliye."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVote(pubId) {
    if (!currentUser || voting || myVotes.has(pubId)) return;
    setVoting(pubId);
    try {
      await voteContestPublication(contest.id, pubId, currentUser.uid);
      setMyVotes((v) => new Set([...v, pubId]));
    } catch {
      /* already voted */
    } finally {
      setVoting(null);
    }
  }

  const categories = isFr ? PUB_CATEGORIES_FR : PUB_CATEGORIES_HT;

  return (
    <div className="space-y-5">
      {/* Submit form */}
      {!myPub ? (
        <form onSubmit={handlePublish} className="space-y-3 rounded-2xl border border-fuchsia-100 bg-fuchsia-50 p-4">
          <p className="font-bold text-fuchsia-900">{isFr ? "Rédiger ma publication" : "Ekri piblikasyon mwen"}</p>
          <select value={category} onChange={(e) => setCategory(e.target.value)} required
            className="w-full rounded-xl border border-fuchsia-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fuchsia-300">
            <option value="">{isFr ? "Choisir une catégorie…" : "Chwazi yon kategori…"}</option>
            {categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
          </select>
          <textarea value={textFr} onChange={(e) => setTextFr(e.target.value)} required
            rows={5} maxLength={1200}
            placeholder={isFr ? "Rédigez votre texte ici (max 1200 caractères)…" : "Ekri tèks ou la (max 1200 karaktè)…"}
            className="w-full resize-none rounded-xl border border-fuchsia-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-fuchsia-300"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">{textFr.length}/1200</span>
            <button type="submit" disabled={submitting || !textFr.trim() || !category}
              className="rounded-2xl bg-gradient-to-r from-fuchsia-500 to-rose-500 px-5 py-2 text-sm font-bold text-white disabled:opacity-40 hover:opacity-90">
              {submitting ? "…" : (isFr ? "Publier" : "Pibliye")}
            </button>
          </div>
          {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
          {success && <p className="text-xs font-semibold text-green-600">{success}</p>}
        </form>
      ) : (
        <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-center">
          <CheckCircle2 className="mx-auto mb-1 h-5 w-5 text-green-500" />
          <p className="font-bold text-green-800 text-sm">{isFr ? "Votre publication est soumise !" : "Piblikasyon ou a soumèt !"}</p>
          <p className="text-xs text-green-600 mt-0.5">{myPub.votes} {isFr ? "vote(s) reçu(s)" : "vòt resevwa"}</p>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {publications.map((pub, i) => {
          const isMe = pub.userId === currentUser?.uid;
          const voted = myVotes.has(pub.id);
          return (
            <div key={pub.id} className={`rounded-2xl border p-4 ${isMe ? "border-fuchsia-200 bg-fuchsia-50" : "border-slate-100 bg-white"}`}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-fuchsia-100 font-extrabold text-xs text-fuchsia-700">#{i + 1}</span>
                  <span className="font-semibold text-slate-700 text-sm">{pub.userName}</span>
                  {isMe && <span className="rounded-full bg-fuchsia-200 px-2 py-0.5 text-[10px] font-bold text-fuchsia-700">Moi</span>}
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{pub.category}</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed line-clamp-4">{isFr ? pub.textFr : (pub.textHt || pub.textFr)}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm font-bold text-rose-600">{pub.votes} {isFr ? "vote(s)" : "vòt"}</span>
                {!isMe && (
                  <button onClick={() => handleVote(pub.id)} disabled={voted || voting === pub.id}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${voted ? "bg-rose-100 text-rose-400 cursor-default" : "bg-rose-500 text-white hover:bg-rose-600"}`}>
                    <Heart className={`h-3.5 w-3.5 ${voted ? "fill-rose-400" : ""}`} />
                    {voted ? (isFr ? "Voté" : "Vote") : (isFr ? "Voter" : "Vote")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {publications.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-4">{isFr ? "Aucune publication pour l'instant. Soyez le premier !" : "Pa gen piblikasyon. Se ou ki premye !"}</p>
        )}
      </div>
    </div>
  );
}

// ─── Phase 3 – Parrainage ─────────────────────────────────────────────────────
function Phase3Referral({ contest, currentUser, isFr }) {
  const [copied, setCopied] = useState(false);
  const referralLink = `${typeof window !== "undefined" ? window.location.origin : ""}/register?ref=${currentUser?.uid}&contest=${contest.id}`;

  function copyLink() {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        {isFr
          ? "Partagez votre lien unique. Chaque nouvel inscrit via votre lien vous rapporte des points selon le barème ci-dessous."
          : "Pataje lyen inik ou. Chak nouvo manm ki enskri via lyen ou rapòte pwen selon barrèm anba a."}
      </p>

      {/* Tiers */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {(contest.phase3Tiers || []).map((t, i) => (
          <div key={i} className="rounded-2xl border border-green-100 bg-green-50 p-3 text-center">
            <p className="font-extrabold text-green-700 text-lg">{t.points}<span className="text-xs font-semibold ml-0.5">pts</span></p>
            <p className="text-xs text-green-600 mt-0.5">{t.count} {isFr ? "membres" : "manm"}</p>
          </div>
        ))}
      </div>

      {/* Link */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 text-xs font-bold text-slate-500 uppercase tracking-wide">{isFr ? "Votre lien de soutien" : "Lyen sipò ou"}</p>
        <div className="flex min-w-0 items-center gap-2">
          <input readOnly value={referralLink} className="min-w-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none" />
          <button onClick={copyLink}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${copied ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-700 hover:bg-slate-300"}`}>
            <Copy className="h-3.5 w-3.5" />
            {copied ? (isFr ? "Copié !" : "Kopye !") : (isFr ? "Copier" : "Kopye")}
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center">
        {isFr ? "Les points de soutien sont calculés à la fin du concours." : "Pwen sipò yo kalkile nan fen konkou a."}
      </p>
    </div>
  );
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
function Leaderboard({ contest, currentUser, isFr }) {
  const [leaders, setLeaders] = useState([]);
  useEffect(() => {
    const unsub = subscribeToContestLeaderboard(contest.id, setLeaders, () => {});
    return () => unsub();
  }, [contest.id]);

  return (
    <div className="space-y-2">
      {leaders.length === 0 && <p className="text-center text-sm text-slate-400 py-4">{isFr ? "Pas encore de scores." : "Pa gen nòt ankò."}</p>}
      {leaders.map((p, i) => {
        const isMe = p.id === currentUser?.uid || p.userId === currentUser?.uid;
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
        return (
          <div key={p.id} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${isMe ? "border-rose-200 bg-rose-50" : "border-slate-100 bg-white"}`}>
            <span className="w-8 text-center font-extrabold text-sm">{medal}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-800 text-sm truncate">{p.userName || p.userId?.slice(0, 8)}{isMe && " (moi)"}</p>
              <p className="text-xs text-slate-400">P1: {p.phase1Score || 0} · P2: {p.phase2Score || 0} · P3: {p.phase3Score || 0}</p>
            </div>
            <span className="font-extrabold text-rose-600">{p.totalScore || 0} pts</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
const TABS = [
  { id: "quiz",    icon: BookOpen, labelFr: "Phase 1 · Quiz",          labelHt: "Faz 1 · Kiz" },
  { id: "pub",     icon: PenLine,  labelFr: "Phase 2 · Publication",    labelHt: "Faz 2 · Piblikasyon" },
  { id: "ref",     icon: Share2,   labelFr: "Phase 3 · Soutien",        labelHt: "Faz 3 · Sipò" },
  { id: "scores",  icon: Trophy,   labelFr: "Classement",               labelHt: "Klasman" },
];

export default function ContestDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const isFr = language !== "ht";
  const [contest, setContest] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [tab, setTab] = useState("quiz");
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [regError, setRegError] = useState("");
  const [contestNotFound, setContestNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    getContest(id)
      .then(setContest)
      .catch(() => setContestNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;
    getContestParticipant(id, user.uid).then(setParticipant).catch(() => {});
  }, [id, user]);

  useEffect(() => {
    if (!user || !contest) return;
    const start = contest.startDate?.toDate ? contest.startDate.toDate() : null;
    // If stored as UTC midnight (getUTCHours()===0) → displays as previous day in UTC-4 → patch to noon UTC
    if (!start || start.getUTCHours() >= 11) return;
    user.getIdToken().then((idToken) =>
      fetch("/api/contests/ensure", { method: "POST", headers: { authorization: `Bearer ${idToken}` } })
        .then((r) => r.ok ? getContest(id).then(setContest).catch(() => {}) : null)
        .catch(() => {})
    );
  }, [user, contest, id]);

  async function ensureSession() {
    if (!user || !contest) return;
    if (!participant?.quizStarted) {
      const p = await startContestQuizSession(contest.id, user.uid);
      setParticipant(p);
    }
  }

  async function handleRegister() {
    if (!user || registering) return;
    setRegistering(true);
    setRegError("");
    try {
      // Always call ensure to create or patch dates (timezone fix), then register
      const idToken = await user.getIdToken();
      const res = await fetch("/api/contests/ensure", {
        method: "POST",
        headers: { authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "ensure_failed");
      const targetId = data.contestId;
      if (contestNotFound) {
        const freshContest = await getContest(targetId);
        setContest(freshContest);
        setContestNotFound(false);
      }
      const num = await registerForContest(targetId, user.uid, user.displayName || user.email);
      const p = await getContestParticipant(targetId, user.uid);
      setParticipant({ ...p, participantNumber: num });
    } catch (e) {
      console.error("handleRegister:", e);
      setRegError(isFr ? "Une erreur est survenue. Réessayez." : "Gen yon erè. Eseye ankò.");
    } finally {
      setRegistering(false);
    }
  }

  function handleScoreUpdate() {
    if (!user || !contest) return;
    getContestParticipant(contest.id, user.uid).then(setParticipant).catch(() => {});
  }

  if (authLoading || loading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-200 border-t-rose-500" /></div>;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <Trophy className="h-12 w-12 text-rose-300" />
        <p className="font-bold text-rose-900">{isFr ? "Connectez-vous pour participer" : "Konekte pou patisipe"}</p>
        <button onClick={() => router.push("/login")} className="rounded-2xl bg-rose-500 px-6 py-2.5 font-bold text-white">{isFr ? "Se connecter" : "Konekte"}</button>
      </div>
    );
  }

  // ── Pre-registration / post-registration screen ───────────────────────────
  if (contestNotFound || contest?.status === "draft") {
    const contestYear = contest?.startDate?.toDate ? contest.startDate.toDate().getFullYear() : 2026;
    const participantCode = participant?.participantNumber
      ? `LM${contestYear}-${String(participant.participantNumber).padStart(3, "0")}`
      : null;

    // ── POST-REGISTRATION: focused success screen ──────────────────────────
    if (participantCode) {
      const calendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(isFr ? "Concours Manman Entelijan 2026 — Début du quiz" : "Konkou Manman Entelijan 2026 — Kòmansman kiz la")}&dates=20260520T080000Z/20260520T090000Z&details=${encodeURIComponent(isFr ? "Revenez sur Lakou Manman pour commencer le quiz !" : "Tounen sou Lakou Manman pou kòmanse kiz la !")}&location=${encodeURIComponent("https://lakou-manman.com/concours/manman-entelijan-2026")}`;

      return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white pb-16 pt-4">
          <div className="mx-auto max-w-md px-4">
            <button onClick={() => router.push("/concours")}
              className="mb-6 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
              <ArrowLeft className="h-4 w-4" /> {isFr ? "Tous les concours" : "Tout konkou yo"}
            </button>

            {/* Success banner */}
            <div className="mb-5 rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 px-6 py-6 text-center shadow-sm">
              <p className="text-4xl mb-2">🎉</p>
              <h2 className="text-xl font-extrabold text-emerald-700">
                {isFr ? "C'est fait, vous êtes inscrit(e) !" : "Sa fèt, ou enskri !"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {isFr ? "Revenez le 20 mai pour commencer le concours." : "Tounen 20 me pou kòmanse konkou a."}
              </p>
            </div>

            {/* Participant number card */}
            <div className="mb-5 overflow-hidden rounded-3xl border-4 border-rose-200 bg-white shadow-xl">
              <div className="flex items-center gap-3 bg-gradient-to-r from-rose-500 to-fuchsia-600 px-5 py-3">
                <Heart className="h-5 w-5 text-white" />
                <p className="font-extrabold text-sm text-white tracking-wide">LAKOU MANMAN</p>
                <Trophy className="ml-auto h-6 w-6 text-amber-300" />
              </div>
              <div className="p-6 text-center">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                  {isFr ? "Votre numéro de participant" : "Nimewo patisipan ou"}
                </p>
                <p className="text-5xl font-black tracking-tight text-rose-600 sm:text-6xl">{participantCode}</p>
                <div className="mx-auto mt-4 mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-fuchsia-500 text-xl font-black text-white">
                  {(user?.displayName || user?.email || "?")[0]?.toUpperCase()}
                </div>
                <p className="font-bold text-slate-800">{user?.displayName || user?.email}</p>
              </div>
            </div>

            {/* Quiz CTA + motivation */}
            <div className="mb-4 rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-50 to-fuchsia-50 p-5 text-center">
              <button disabled
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-6 py-3.5 font-extrabold text-slate-400 cursor-not-allowed mb-3">
                <BookOpen className="h-5 w-5" />
                {isFr ? "Commencer le quiz — dès le 20 mai" : "Kòmanse quiz la — 20 me"}
              </button>
              <p className="text-xs text-slate-500">
                {isFr
                  ? "🏆 Prix, points et reconnaissance pour les meilleurs participants !"
                  : "🏆 Pri, pwen ak rekonesans pou pi bon patisipan yo !"}
              </p>
            </div>

            {/* Reminder CTA */}
            <a href={calendarUrl} target="_blank" rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-fuchsia-500 px-6 py-3.5 font-extrabold text-white shadow-lg transition hover:opacity-90 mb-3">
              <CalendarDays className="h-5 w-5" />
              {isFr ? "Activer un rappel — 20 mai" : "Aktive yon rapèl — 20 me"}
            </a>
            <p className="text-center text-[11px] text-slate-400 mb-4">
              {isFr ? "Ajoute une alerte dans Google Agenda" : "Ajoute yon alèt nan Google Agenda"}
            </p>

            {/* Share section */}
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
                {isFr ? "Inviter des amies" : "Envite zanmi yo"}
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    const text = isFr
                      ? `Je participe au concours Manman Entelijan 2026 sur Lakou Manman ! Rejoins-moi ici : ${window.location.origin}/concours/manman-entelijan-2026`
                      : `Mwen patisipe nan konkou Manman Entelijan 2026 sou Lakou Manman ! Rantre avèm la : ${window.location.origin}/concours/manman-entelijan-2026`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-green-100 bg-white py-3 text-green-700 transition hover:bg-green-50">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.555 4.126 1.533 5.864L.061 23.504l5.817-1.447C7.59 23.002 9.739 23.5 12 23.5c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.5c-1.994 0-3.854-.547-5.443-1.498l-.39-.232-4.04 1.005.999-3.91-.254-.402A9.445 9.445 0 012.5 12C2.5 6.71 6.71 2.5 12 2.5S21.5 6.71 21.5 12 17.29 21.5 12 21.5z"/></svg>
                  <span className="text-[10px] font-bold">WhatsApp</span>
                </button>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/concours/manman-entelijan-2026`;
                    navigator.clipboard.writeText(url).catch(() => {});
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-200 bg-white py-3 text-slate-600 transition hover:bg-slate-100">
                  <Copy className="h-5 w-5" />
                  <span className="text-[10px] font-bold">{isFr ? "Copier le lien" : "Kopye lyen"}</span>
                </button>
                {typeof navigator !== "undefined" && navigator.share && (
                  <button
                    onClick={() => navigator.share({
                      title: isFr ? "Concours Manman Entelijan 2026" : "Konkou Manman Entelijan 2026",
                      text: isFr ? "Je participe ! Rejoins-moi." : "Mwen patisipe ! Rantre avèm.",
                      url: `${window.location.origin}/concours/manman-entelijan-2026`,
                    }).catch(() => {})}
                    className="flex flex-col items-center gap-1.5 rounded-2xl border border-rose-100 bg-white py-3 text-rose-600 transition hover:bg-rose-50">
                    <Share2 className="h-5 w-5" />
                    <span className="text-[10px] font-bold">{isFr ? "Partager" : "Pataje"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ── PRE-REGISTRATION: simplified single-column ─────────────────────────
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white pb-16 pt-4">
        <div className="mx-auto max-w-md px-4">
          <button onClick={() => router.push("/concours")}
            className="mb-4 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-4 w-4" /> {isFr ? "Tous les concours" : "Tout konkou yo"}
          </button>

          {/* Announcement header */}
          <div className="mb-5 rounded-3xl border border-rose-100 bg-gradient-to-r from-rose-50 via-white to-fuchsia-50 px-6 py-5 text-center shadow-sm">
            <div className="flex items-center justify-center gap-2 text-rose-600 mb-1">
              <CalendarDays className="h-5 w-5" />
              <p className="text-xs font-bold uppercase tracking-widest">
                {isFr ? "Le concours commence officiellement" : "Konkou a ap kòmanse ofisyèlman"}
              </p>
            </div>
            <p className="text-3xl font-black text-rose-700">
              {isFr ? "▷ 20 Mai 2026 ! ◁" : "▷ 20 Me 2026 ! ◁"}
            </p>
            <p className="mt-1 text-sm italic text-fuchsia-600">
              {isFr ? "Ensemble, élevons la prochaine génération ! ♥" : "Se ansanm n ap grandi pi bon jenerasyon ! ♥"}
            </p>
          </div>

          {/* Preview card */}
          <div className="mb-4 overflow-hidden rounded-2xl border-2 border-dashed border-rose-200 bg-rose-50/60">
            <div className="flex items-center gap-2 bg-gradient-to-r from-rose-500/80 to-fuchsia-500/80 px-4 py-2">
              <Heart className="h-4 w-4 text-white" />
              <span className="text-xs font-extrabold text-white tracking-wide">LAKOU MANMAN</span>
            </div>
            <div className="p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {isFr ? "Participant officiel" : "Patisipan ofisyèl"}
              </p>
              <p className="text-3xl font-black text-rose-300 tracking-widest mt-1">LM{contestYear}-???</p>
              <p className="mt-2 text-xs text-slate-400 italic">
                {isFr ? "Votre numéro sera attribué à l'inscription" : "Nimewo ou pral ba ou lè w enskri"}
              </p>
            </div>
          </div>

          <p className="mb-4 text-center text-sm text-slate-600 leading-relaxed">
            {isFr
              ? "Inscrivez-vous maintenant pour recevoir votre numéro unique LM2026-XXX. Il vous identifiera tout au long du concours."
              : "Enskri kounye a pou resevwa nimewo inik LM2026-XXX ou. L'ap idantifye w pandan tout konkou a."}
          </p>

          {regError && (
            <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-center text-xs text-rose-600">{regError}</p>
          )}

          <button onClick={handleRegister} disabled={registering}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-fuchsia-500 px-6 py-4 font-extrabold text-white shadow-lg transition hover:opacity-90 disabled:opacity-50 mb-5">
            {registering
              ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              : <><Hash className="h-5 w-5" />
                  {isFr ? "Confirmer mon inscription" : "Konfime patisipasyon mwen"}
                </>}
          </button>

          {/* Compact timeline */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-center">
              <CalendarDays className="mx-auto mb-1 h-4 w-4 text-rose-400" />
              <p className="text-[10px] font-extrabold text-rose-700">{isFr ? "Début du concours" : "Kòmansman konkou a"}</p>
              <p className="text-[10px] text-rose-500">{isFr ? "20 Mai 2026" : "20 Me 2026"}</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-center">
              <Trophy className="mx-auto mb-1 h-4 w-4 text-amber-400" />
              <p className="text-[10px] font-extrabold text-amber-700">{isFr ? "Résultats" : "Rezilta"}</p>
              <p className="text-[10px] text-amber-600">{isFr ? "31 Mai 2026" : "31 Me 2026"}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white pb-16 pt-6">
      <div className="mx-auto max-w-2xl px-4">
        {/* Back + header */}
        <button onClick={() => router.push("/concours")}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> {isFr ? "Tous les concours" : "Tout konkou yo"}
        </button>

        <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-rose-500 to-fuchsia-600 p-5 text-white">
          <div className="flex items-center gap-3 mb-1">
            <Trophy className="h-6 w-6 text-white/80" />
            <h1 className="font-extrabold text-xl">{name}</h1>
          </div>
          {participant && (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs sm:text-sm">
              {participant.participantNumber && (
                <span className="flex items-center gap-1 rounded-full bg-white/25 px-2.5 py-1 font-extrabold">
                  <Hash className="h-3 w-3" />{participant.participantNumber}
                </span>
              )}
              <span className="rounded-full bg-white/15 px-2.5 py-1">P1: <strong>{participant.phase1Score || 0}</strong></span>
              <span className="rounded-full bg-white/15 px-2.5 py-1">P2: <strong>{participant.phase2Score || 0}</strong></span>
              <span className="rounded-full bg-white/15 px-2.5 py-1">P3: <strong>{participant.phase3Score || 0}</strong></span>
              <span className="ml-auto rounded-full bg-white/30 px-3 py-1 font-extrabold">Total: {participant.totalScore || 0} pts</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-5 flex gap-1 overflow-x-auto rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
          {TABS.map(({ id: tid, icon: Icon, labelFr: lFr, labelHt: lHt }) => (
            <button key={tid}
              onClick={() => { setTab(tid); if (tid === "quiz") ensureSession(); }}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${tab === tid ? "bg-gradient-to-r from-rose-500 to-fuchsia-500 text-white shadow" : "text-slate-500 hover:text-rose-600"}`}>
              <Icon className="h-3.5 w-3.5" />
              {isFr ? lFr : lHt}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          {tab === "quiz" && (
            <Phase1Quiz contest={contest} participant={participant} currentUser={user} isFr={isFr} onScoreUpdate={handleScoreUpdate} />
          )}
          {tab === "pub" && (
            <Phase2Publications contest={contest} currentUser={user} isFr={isFr} />
          )}
          {tab === "ref" && (
            <Phase3Referral contest={contest} currentUser={user} isFr={isFr} />
          )}
          {tab === "scores" && (
            <Leaderboard contest={contest} currentUser={user} isFr={isFr} />
          )}
        </div>
      </div>
    </div>
  );
}
