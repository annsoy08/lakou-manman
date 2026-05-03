import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  arrayUnion,
  onSnapshot,
  runTransaction,
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";

function resolveDb() {
  return getFirebaseDb();
}

function requireDb() {
  const firestore = resolveDb();
  if (!firestore) throw new Error("Firestore not available");
  return firestore;
}

// ─── Ensure Manman Entelijan 2026 contest exists (idempotent) ─────────────────

export const MANMAN_ENTELIJAN_ID = "manman-entelijan-2026";

export async function ensureManmanEntelijan2026() {
  const firestore = requireDb();
  const ref = doc(firestore, "contests", MANMAN_ENTELIJAN_ID);
  const snap = await getDoc(ref);
  // noon UTC ensures correct date in every timezone
  const START_DATE = new Date(Date.UTC(2026, 4, 20, 12, 0, 0));
  const END_DATE   = new Date(Date.UTC(2026, 4, 26, 12, 0, 0));
  if (!snap.exists()) {
    await setDoc(ref, {
      name:       "Manman Entelijan 2026",
      nameFr:     "Manman Entelijan 2026",
      nameHt:     "Manman Entelijan 2026",
      descFr:     "Concours de la F\u00eate des M\u00e8res \u2014 Lakou Manman",
      descHt:     "Konkou F\u00e8t Manman \u2014 Lakou Manman",
      status:     "draft",
      startDate:  START_DATE,
      endDate:    END_DATE,
      phase1Days: 7,
      pointsPerAnswer:  10,
      phase2MaxPoints:  500,
      phase3Tiers: [{ count: 5, points: 50 }, { count: 10, points: 120 }, { count: 20, points: 300 }],
      createdAt:  serverTimestamp(),
    });
  } else {
    await setDoc(ref, { startDate: START_DATE, endDate: END_DATE, updatedAt: serverTimestamp() }, { merge: true });
  }
  return MANMAN_ENTELIJAN_ID;
}

// ─── Contests ─────────────────────────────────────────────────────────────────

export function subscribeToContests(onData, onError) {
  const firestore = resolveDb();
  if (!firestore) { onData?.([]); return () => {}; }
  return onSnapshot(
    query(collection(firestore, "contests"), orderBy("createdAt", "desc")),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}

export async function getContest(contestId) {
  const firestore = requireDb();
  const snap = await getDoc(doc(firestore, "contests", contestId));
  if (!snap.exists()) throw new Error("Contest not found");
  return { id: snap.id, ...snap.data() };
}

export async function createContest({
  name, nameFr, nameHt, descFr, descHt,
  startDate, endDate,
  phase1Days = 7,
  pointsPerAnswer = 10,
  phase2MaxPoints = 500,
  phase3Tiers = [{ count: 5, points: 50 }, { count: 10, points: 120 }, { count: 20, points: 300 }],
}) {
  const firestore = requireDb();
  const ref = await addDoc(collection(firestore, "contests"), {
    name: String(name || nameFr || "").trim(),
    nameFr: String(nameFr || name || "").trim(),
    nameHt: String(nameHt || "").trim(),
    descFr: String(descFr || "").trim(),
    descHt: String(descHt || "").trim(),
    startDate: startDate || null,
    endDate: endDate || null,
    phase1Days,
    pointsPerAnswer,
    phase2MaxPoints,
    phase3Tiers,
    status: "draft",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateContestStatus(contestId, status) {
  const firestore = requireDb();
  await updateDoc(doc(firestore, "contests", contestId), { status, updatedAt: serverTimestamp() });
}

// ─── Phase 1 – Questions ──────────────────────────────────────────────────────

export async function addContestQuestion(contestId, {
  textFr, textHt, options, optionsFr, optionsHt,
  correctIndex, theme, dayIndex, timeLimit = 30,
}) {
  const firestore = requireDb();
  const ref = await addDoc(collection(firestore, "contests", contestId, "questions"), {
    textFr: String(textFr || "").trim(),
    textHt: String(textHt || "").trim(),
    optionsFr: Array.isArray(optionsFr) ? optionsFr : (Array.isArray(options) ? options : []),
    optionsHt: Array.isArray(optionsHt) ? optionsHt : [],
    correctIndex: Number(correctIndex),
    theme: String(theme || "").trim(),
    dayIndex: Number(dayIndex),
    timeLimit: Number(timeLimit),
    expertValidated: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function validateContestQuestion(contestId, questionId, correctIndex) {
  const firestore = requireDb();
  await updateDoc(doc(firestore, "contests", contestId, "questions", questionId), {
    correctIndex: Number(correctIndex),
    expertValidated: true,
    updatedAt: serverTimestamp(),
  });
}

export async function getContestQuestionsForDay(contestId, dayIndex) {
  const firestore = requireDb();
  const snap = await getDocs(
    query(
      collection(firestore, "contests", contestId, "questions"),
      where("dayIndex", "==", Number(dayIndex)),
      where("expertValidated", "==", true),
      orderBy("createdAt", "asc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getAllContestQuestions(contestId) {
  const firestore = requireDb();
  const snap = await getDocs(
    query(collection(firestore, "contests", contestId, "questions"), orderBy("dayIndex", "asc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Phase 1 – Participant session ────────────────────────────────────────────

export async function startContestQuizSession(contestId, userId) {
  const firestore = requireDb();
  const ref = doc(firestore, "contests", contestId, "participants", userId);
  const snap = await getDoc(ref);
  if (snap.exists() && snap.data()?.quizStarted) return snap.data();
  await setDoc(ref, {
    userId,
    quizStarted: true,
    quizStartedAt: serverTimestamp(),
    phase1Score: 0,
    phase2Score: 0,
    phase3Score: 0,
    totalScore: 0,
    answeredQuestions: {},
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return (await getDoc(ref)).data();
}

export async function submitContestAnswer(contestId, userId, questionId, selectedIndex, correctIndex, pointsPerAnswer) {
  const firestore = requireDb();
  const isCorrect = Number(selectedIndex) === Number(correctIndex);
  const points = isCorrect ? Number(pointsPerAnswer) : 0;
  const participantRef = doc(firestore, "contests", contestId, "participants", userId);
  await runTransaction(firestore, async (tx) => {
    const snap = await tx.get(participantRef);
    const data = snap.data() || {};
    if (data.answeredQuestions?.[questionId] !== undefined) return;
    tx.set(participantRef, {
      [`answeredQuestions.${questionId}`]: { selectedIndex, isCorrect, points },
      phase1Score: increment(points),
      totalScore: increment(points),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });
  return { isCorrect, points };
}

export async function getContestParticipant(contestId, userId) {
  const firestore = resolveDb();
  if (!firestore) return null;
  const snap = await getDoc(doc(firestore, "contests", contestId, "participants", userId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getContestParticipants(contestId) {
  const firestore = requireDb();
  const snap = await getDocs(query(collection(firestore, "contests", contestId, "participants")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Phase 2 – Publications ───────────────────────────────────────────────────

export async function addContestPublication(contestId, { userId, userName, userAvatar, textFr, textHt, category }) {
  const firestore = requireDb();
  const existing = await getDocs(
    query(collection(firestore, "contests", contestId, "publications"), where("userId", "==", userId))
  );
  if (!existing.empty) throw new Error("already_published");
  const ref = await addDoc(collection(firestore, "contests", contestId, "publications"), {
    userId,
    userName: String(userName || "").trim(),
    userAvatar: userAvatar || null,
    textFr: String(textFr || "").trim(),
    textHt: String(textHt || "").trim(),
    category: String(category || "").trim(),
    votes: 0,
    voteCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export function subscribeToContestPublications(contestId, onData, onError) {
  const firestore = resolveDb();
  if (!firestore) { onData?.([]); return () => {}; }
  return onSnapshot(
    query(collection(firestore, "contests", contestId, "publications"), orderBy("votes", "desc")),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}

export async function voteContestPublication(contestId, publicationId, voterId) {
  const firestore = requireDb();
  const voteRef = doc(firestore, "contests", contestId, "votes", `${voterId}_${publicationId}`);
  const pubRef = doc(firestore, "contests", contestId, "publications", publicationId);
  await runTransaction(firestore, async (tx) => {
    const voteSnap = await tx.get(voteRef);
    if (voteSnap.exists()) throw new Error("already_voted");
    tx.set(voteRef, { voterId, publicationId, createdAt: serverTimestamp() });
    tx.update(pubRef, { votes: increment(1), updatedAt: serverTimestamp() });
  });
}

export async function getUserVotesForContest(contestId, userId) {
  const firestore = resolveDb();
  if (!firestore) return new Set();
  const snap = await getDocs(
    query(collection(firestore, "contests", contestId, "votes"), where("voterId", "==", userId))
  );
  return new Set(snap.docs.map((d) => d.data().publicationId));
}

// ─── Phase 3 – Referrals ──────────────────────────────────────────────────────

export async function recordContestReferral(contestId, referrerId, newUserId) {
  const firestore = requireDb();
  const refDoc = doc(firestore, "contests", contestId, "referrals", referrerId);
  await runTransaction(firestore, async (tx) => {
    const snap = await tx.get(refDoc);
    const referred = snap.exists() ? (snap.data()?.referred || []) : [];
    if (referred.includes(newUserId)) return;
    tx.set(refDoc, {
      referrerId,
      referred: arrayUnion(newUserId),
      count: increment(1),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });
}

export async function computeAndSavePhase3Score(contestId, userId, tiers) {
  const firestore = requireDb();
  const refSnap = await getDoc(doc(firestore, "contests", contestId, "referrals", userId));
  const count = refSnap.exists() ? (refSnap.data()?.count || 0) : 0;
  const sortedTiers = [...tiers].sort((a, b) => b.count - a.count);
  const tier = sortedTiers.find((t) => count >= t.count);
  const phase3Score = tier ? tier.points : 0;
  await setDoc(doc(firestore, "contests", contestId, "participants", userId), {
    phase3Score,
    totalScore: increment(0),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return { count, phase3Score };
}

// ─── Pre-registration ─────────────────────────────────────────────────────────

export async function registerForContest(contestId, userId, displayName) {
  const firestore = requireDb();
  const participantRef = doc(firestore, "contests", contestId, "participants", userId);

  return await runTransaction(firestore, async (tx) => {
    const snap = await tx.get(participantRef);
    if (snap.exists() && snap.data()?.participantNumber) {
      return snap.data().participantNumber;
    }
    const counterRef = doc(firestore, "contests", contestId, "meta", "counter");
    const counterSnap = await tx.get(counterRef);
    const currentCount = counterSnap.exists() ? (counterSnap.data()?.participantCount || 0) : 0;
    const participantNumber = currentCount + 1;
    tx.set(counterRef, { participantCount: participantNumber, updatedAt: serverTimestamp() }, { merge: true });
    tx.set(participantRef, {
      userId,
      displayName: String(displayName || "").trim(),
      participantNumber,
      registeredAt: serverTimestamp(),
      quizStarted: false,
      phase1Score: 0,
      phase2Score: 0,
      phase3Score: 0,
      totalScore: 0,
      answeredQuestions: {},
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return participantNumber;
  });
}

// ─── Participants (admin) ───────────────────────────────────────────────────────────────────────────

export function subscribeToContestParticipants(contestId, onData, onError) {
  const firestore = resolveDb();
  if (!firestore) { onData?.([]); return () => {}; }
  return onSnapshot(
    query(
      collection(firestore, "contests", contestId, "participants"),
      orderBy("registeredAt", "asc")
    ),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────────────────────────

export function subscribeToContestLeaderboard(contestId, onData, onError) {
  const firestore = resolveDb();
  if (!firestore) { onData?.([]); return () => {}; }
  return onSnapshot(
    query(
      collection(firestore, "contests", contestId, "participants"),
      orderBy("totalScore", "desc"),
      limit(50)
    ),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}
