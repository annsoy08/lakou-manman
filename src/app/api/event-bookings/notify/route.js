import { NextResponse } from "next/server";

const ADMIN_EMAIL = "bannsoraya2@gmail.com";

function normalizeEnv(v = "") {
  return String(v ?? "").trim().replace(/^['"]|['"]$/g, "");
}

function escapeHtml(v) {
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function getPublicUrl() {
  return normalizeEnv(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "https://lakoumanman.com");
}

function buildAgentNotifEmail({ type, service, partnerName, userName, eventDate, bookingId }) {
  const dateStr = eventDate ? new Date(eventDate).toLocaleDateString("fr-FR", { dateStyle: "long" }) : "";
  const isPayment = type === "deposit_paid";
  const subject = isPayment
    ? `💳 Acompte reçu — ${service} (${userName})`
    : `📋 Nouvelle demande de devis — ${service}`;
  const heading = isPayment
    ? `Acompte reçu de ${userName}`
    : `Nouvelle demande de ${userName}`;
  const detail = isPayment
    ? `<strong>${escapeHtml(userName)}</strong> a réglé l'acompte pour <strong>${escapeHtml(service)}</strong> chez <strong>${escapeHtml(partnerName)}</strong>.`
    : `<strong>${escapeHtml(userName)}</strong> a soumis une demande de devis pour <strong>${escapeHtml(service)}</strong> chez <strong>${escapeHtml(partnerName)}</strong>${dateStr ? ` pour le <strong>${escapeHtml(dateStr)}</strong>` : ""}.`;
  const ctaLink = `${getPublicUrl()}/admin/evenements-bookings`;

  const html = `<div style="font-family:Arial,sans-serif;color:#0f172a;max-width:620px;margin:0 auto;padding:24px;">
  <div style="background:#fff7f8;border:1px solid #fce7f3;border-radius:18px;padding:24px;margin-bottom:16px;">
    <h2 style="margin:0 0 12px;font-size:18px;color:#9b2335;">${isPayment ? "💳" : "📋"} ${escapeHtml(heading)}</h2>
    <p style="margin:0 0 16px;">${detail}</p>
    ${bookingId ? `<p style="font-size:12px;color:#94a3b8;margin:0 0 20px;">Référence : <code>${escapeHtml(bookingId)}</code></p>` : ""}
    <a href="${ctaLink}" style="display:inline-block;background:#be185d;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:700;">Voir la demande</a>
  </div>
  <p style="margin-top:16px;font-size:12px;color:#94a3b8;">Lakou Manman — <a href="${getPublicUrl()}" style="color:#be185d;">${getPublicUrl()}</a></p>
</div>`;

  const text = `${heading}\n\n${service} — ${partnerName}${dateStr ? `\nDate : ${dateStr}` : ""}${bookingId ? `\nRéférence : ${bookingId}` : ""}\n\nVoir la demande : ${ctaLink}`;
  return { subject, html, text };
}

async function sendEmailTo({ toEmail, subject, html, text }) {
  const apiKey = normalizeEnv(process.env.RESEND_API_KEY);
  const fromEmail = normalizeEnv(process.env.GROUP_NOTIFICATION_FROM_EMAIL || process.env.CONTACT_FROM_EMAIL);
  if (!apiKey || !fromEmail) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: fromEmail, to: [toEmail], subject, html, text }),
    cache: "no-store",
  }).catch(() => {});
}

let adminApp = null;
function getAdminApp() {
  if (adminApp) return adminApp;
  const { initializeApp, getApps, cert } = require("firebase-admin/app");
  if (getApps().length > 0) { adminApp = getApps()[0]; return adminApp; }
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || "";
  privateKey = privateKey.replace(/^["']|["']$/g, "").replace(/\\\\n/g, "\n").replace(/\\n/g, "\n");
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!privateKey || !clientEmail || !projectId) throw new Error("Firebase Admin env vars missing");
  adminApp = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return adminApp;
}

async function getTokensForUid(db, uid) {
  const snap = await db.collection("fcmTokens").doc(uid).get().catch(() => null);
  if (!snap || !snap.exists) return [];
  return Object.keys(snap.data()?.tokens || {}).filter(Boolean);
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { bookingId, partnerName, service, eventDate, userName, type } = await request.json();

    const app = getAdminApp();
    const { getAuth } = require("firebase-admin/auth");
    const { getFirestore } = require("firebase-admin/firestore");
    const { getMessaging } = require("firebase-admin/messaging");

    await getAuth(app).verifyIdToken(idToken);
    const db = getFirestore(app);
    const messaging = getMessaging(app);

    const isPayment = type === "deposit_paid";
    const dateStr = eventDate ? new Date(eventDate).toLocaleDateString("fr-FR") : "?";

    const notifTitle = isPayment
      ? `💳 Acompte reçu — ${service}`
      : `📋 Nouvelle demande — ${partnerName}`;
    const notifBody = isPayment
      ? `${userName} a payé l'acompte pour « ${service} »`
      : `${userName} demande un devis pour « ${service} » le ${dateStr}`;
    const notifLink = isPayment ? `/admin/evenements-bookings` : `/admin/evenements-bookings`;

    const recipientUids = new Set();
    const recipientEmails = new Set();

    const adminUser = await getAuth(app).getUserByEmail(ADMIN_EMAIL).catch(() => null);
    if (adminUser) {
      recipientUids.add(adminUser.uid);
      if (adminUser.email) recipientEmails.add(adminUser.email);
    }

    if (partnerName) {
      const agentsSnap = await db.collection("users")
        .where("role", "==", "event_manager")
        .where("partnerName", "==", partnerName)
        .get()
        .catch(() => null);
      if (agentsSnap && !agentsSnap.empty) {
        for (const d of agentsSnap.docs) {
          recipientUids.add(d.id);
          const agentEmail = d.data()?.email;
          if (agentEmail) recipientEmails.add(agentEmail);
          else {
            const authUser = await getAuth(app).getUser(d.id).catch(() => null);
            if (authUser?.email) recipientEmails.add(authUser.email);
          }
        }
      }
    }

    const allTokens = (
      await Promise.all([...recipientUids].map((uid) => getTokensForUid(db, uid)))
    ).flat();

    const results = allTokens.length
      ? await Promise.allSettled(
          allTokens.map((token) =>
            messaging.send({
              token,
              notification: { title: notifTitle, body: notifBody },
              webpush: {
                notification: { icon: "/logo-lakou-manman.png" },
                fcmOptions: { link: notifLink },
              },
            })
          )
        )
      : [];

    const sent = results.filter((r) => r.status === "fulfilled").length;

    if (recipientEmails.size > 0) {
      const emailTemplate = buildAgentNotifEmail({ type, service, partnerName, userName, eventDate, bookingId });
      await Promise.allSettled(
        [...recipientEmails].map((email) =>
          sendEmailTo({ toEmail: email, ...emailTemplate })
        )
      );
    }

    return NextResponse.json({ sent, emailsSent: recipientEmails.size });
  } catch (error) {
    console.error("Event booking notify error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
