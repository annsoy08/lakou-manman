import { NextResponse } from "next/server";

let adminApp = null;

function getAdminApp() {
  if (adminApp) return adminApp;
  const { initializeApp, getApps, cert } = require("firebase-admin/app");
  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || "";
  privateKey = privateKey.replace(/^["']|["']$/g, "");
  privateKey = privateKey.replace(/\\\\n/g, "\n").replace(/\\n/g, "\n");
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!privateKey || !clientEmail || !projectId) {
    throw new Error("Firebase Admin env vars missing (FIREBASE_ADMIN_PRIVATE_KEY, FIREBASE_ADMIN_CLIENT_EMAIL)");
  }
  adminApp = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return adminApp;
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { recipientUid, title, body, url } = await request.json();
    if (!recipientUid || !title) {
      return NextResponse.json({ error: "recipientUid and title are required" }, { status: 400 });
    }

    const app = getAdminApp();

    try {
      const { getAuth } = require("firebase-admin/auth");
      await getAuth(app).verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { getFirestore } = require("firebase-admin/firestore");
    const { getMessaging } = require("firebase-admin/messaging");

    const db = getFirestore(app);
    const snap = await db.collection("fcmTokens").doc(recipientUid).get();
    if (!snap.exists) return NextResponse.json({ sent: 0 });

    const tokens = Object.keys(snap.data()?.tokens || {}).filter(Boolean);
    if (!tokens.length) return NextResponse.json({ sent: 0 });

    const messaging = getMessaging(app);
    const results = await Promise.allSettled(
      tokens.map((token) =>
        messaging.send({
          token,
          notification: { title, body: body || "" },
          webpush: {
            notification: { icon: "/logo-lakou-manman.png", badge: "/logo-lakou-manman.png" },
            fcmOptions: { link: url || "/" },
          },
        })
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results
      .filter((r) => r.status === "rejected")
      .map((r) => r.reason?.errorInfo?.code);

    const staleTokens = tokens.filter((_, i) => {
      const code = results[i]?.reason?.errorInfo?.code;
      return code === "messaging/registration-token-not-registered"
        || code === "messaging/invalid-registration-token";
    });
    if (staleTokens.length > 0) {
      const { FieldValue } = require("firebase-admin/firestore");
      const updates = {};
      staleTokens.forEach((t) => { updates[`tokens.${t}`] = FieldValue.delete(); });
      await db.collection("fcmTokens").doc(recipientUid).update(updates).catch(() => {});
    }

    return NextResponse.json({ sent, failed });
  } catch (error) {
    console.error("Notify route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
