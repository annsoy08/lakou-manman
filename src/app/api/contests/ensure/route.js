import { NextResponse } from "next/server";

const CONTEST_ID = "manman-entelijan-2026";

let adminApp = null;
function getAdminApp() {
  if (adminApp) return adminApp;
  const { initializeApp, getApps, cert, applicationDefault } = require("firebase-admin/app");
  if (getApps().length > 0) { adminApp = getApps()[0]; return adminApp; }

  let credential;

  // Option 1 — Service account JSON file via GOOGLE_APPLICATION_CREDENTIALS env var
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    credential = applicationDefault();

  // Option 2 — Full service account JSON stored inline in env var
  } else if (process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON) {
    const sa = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON);
    credential = cert(sa);

  // Option 3 — Individual env vars (fallback, private key must be properly escaped)
  } else {
    let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || "";
    privateKey = privateKey.replace(/^["']|["']$/g, "");
    privateKey = privateKey.replace(/\\\\n/g, "\n").replace(/\\n/g, "\n");
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const projectId   = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!privateKey || !clientEmail || !projectId)
      throw new Error("Firebase Admin env vars missing (FIREBASE_ADMIN_PRIVATE_KEY, FIREBASE_ADMIN_CLIENT_EMAIL)");
    credential = cert({ projectId, clientEmail, privateKey });
  }

  adminApp = initializeApp({ credential });
  return adminApp;
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    if (!idToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const app = getAdminApp();
    const { getAuth } = require("firebase-admin/auth");
    const { getFirestore, FieldValue } = require("firebase-admin/firestore");

    await getAuth(app).verifyIdToken(idToken);

    const db = getFirestore(app);
    const ref = db.collection("contests").doc(CONTEST_ID);
    const snap = await ref.get();

    // noon UTC ensures correct date in every timezone (UTC-12 to UTC+12)
    const START_DATE = new Date(Date.UTC(2026, 4, 20, 12, 0, 0));
    const END_DATE   = new Date(Date.UTC(2026, 4, 26, 12, 0, 0));

    if (!snap.exists) {
      await ref.set({
        name:            "Manman Entelijan 2026",
        nameFr:          "Manman Entelijan 2026",
        nameHt:          "Manman Entelijan 2026",
        descFr:          "Concours de la Fête des Mères — Lakou Manman",
        descHt:          "Konkou Fèt Manman — Lakou Manman",
        status:          "draft",
        startDate:       START_DATE,
        endDate:         END_DATE,
        phase1Days:      7,
        pointsPerAnswer: 10,
        phase2MaxPoints: 500,
        phase3Tiers:     [{ count: 5, points: 50 }, { count: 10, points: 120 }, { count: 20, points: 300 }],
        createdAt:       FieldValue.serverTimestamp(),
      });
    } else {
      // Patch dates on any previously created document (fixes UTC midnight → wrong local date bug)
      await ref.set({ startDate: START_DATE, endDate: END_DATE, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }

    return NextResponse.json({ contestId: CONTEST_ID });
  } catch (err) {
    console.error("ensure-contest error:", err);
    return NextResponse.json({ error: "server_error", message: err.message }, { status: 500 });
  }
}
