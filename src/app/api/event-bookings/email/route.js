import { NextResponse } from "next/server";
import { getPublicSiteUrl } from "@/lib/public-site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonNoStore(payload, init = {}) {
  return NextResponse.json(payload, {
    ...init,
    headers: { "Cache-Control": "no-store", ...(init.headers || {}) },
  });
}

function normalizeEnv(v = "") {
  return String(v ?? "").trim().replace(/^['"]|['"]$/g, "");
}

function escapeHtml(v) {
  return String(v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function isValidEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || "").trim());
}

function getEmailConfig() {
  return {
    resendApiKey: normalizeEnv(process.env.RESEND_API_KEY),
    fromEmail: normalizeEnv(
      process.env.GROUP_NOTIFICATION_FROM_EMAIL || process.env.CONTACT_FROM_EMAIL
    ),
  };
}

async function sendEmail({ toEmail, subject, text, html }) {
  const { resendApiKey, fromEmail } = getEmailConfig();
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: fromEmail, to: [toEmail], subject, text, html }),
    cache: "no-store",
  });
  return { ok: res.ok, status: res.status, payload: await res.text() };
}

function baseHtml(content) {
  return `
<div style="font-family:Arial,sans-serif;color:#0f172a;max-width:620px;margin:0 auto;padding:24px;">
  <div style="margin-bottom:20px;">
    <img src="${getPublicSiteUrl()}/logo-lakou-manman.png" alt="Lakou Manman" height="36" style="display:block;" />
  </div>
  ${content}
  <p style="margin-top:24px;font-size:12px;color:#94a3b8;">
    Lakou Manman — Jouin nou sou <a href="${getPublicSiteUrl()}" style="color:#be185d;">${getPublicSiteUrl()}</a>
  </p>
</div>`;
}

function buildBookingCreatedEmail({ userName, service, partnerName, eventDate, bookingId, language }) {
  const isFr = language !== "ht";
  const dateStr = eventDate ? new Date(eventDate).toLocaleDateString(isFr ? "fr-FR" : "fr-FR", { dateStyle: "long" }) : "";

  const subject = isFr
    ? `✅ Votre demande a bien été reçue — ${service}`
    : `✅ Demann ou a resevwa — ${service}`;
  const heading = isFr ? `Bonjour ${userName} !` : `Bonjou ${userName} !`;
  const body1 = isFr
    ? `Nous avons bien reçu votre demande de devis pour :`
    : `Nou resevwa demann devis ou a pou :`;
  const body2 = isFr
    ? `Notre équipe vous répondra dans les plus brefs délais avec un devis personnalisé. Vous pouvez suivre l'état de votre demande en temps réel dans l'application.`
    : `Ekip nou an ap reponn ou pi vit posib ak yon devis pèsonalize. Ou ka swiv eta demann ou a nan aplikasyon an.`;
  const ctaLabel = isFr ? "Voir ma demande" : "Wè demann mwen";
  const ctaLink = `${getPublicSiteUrl()}/evenements/mes-demandes`;

  const html = baseHtml(`
    <div style="background:#fff7f8;border:1px solid #fce7f3;border-radius:18px;padding:24px;margin-bottom:16px;">
      <h2 style="margin:0 0 12px;font-size:18px;color:#9b2335;">${escapeHtml(heading)}</h2>
      <p style="margin:0 0 12px;">${escapeHtml(body1)}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
        <tr><td style="padding:6px 0;color:#64748b;">🎉 Service</td><td style="padding:6px 0;font-weight:700;">${escapeHtml(service)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">🏢 Partenaire</td><td style="padding:6px 0;font-weight:700;">${escapeHtml(partnerName)}</td></tr>
        ${dateStr ? `<tr><td style="padding:6px 0;color:#64748b;">📅 Date</td><td style="padding:6px 0;font-weight:700;">${escapeHtml(dateStr)}</td></tr>` : ""}
        <tr><td style="padding:6px 0;color:#64748b;">🔖 Référence</td><td style="padding:6px 0;font-family:monospace;font-size:12px;color:#94a3b8;">${escapeHtml(bookingId)}</td></tr>
      </table>
      <p style="margin:0 0 20px;color:#475569;">${escapeHtml(body2)}</p>
      <a href="${ctaLink}" style="display:inline-block;background:#be185d;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:700;">${escapeHtml(ctaLabel)}</a>
    </div>`);

  const text = [heading, "", body1, `- ${service} (${partnerName})`, dateStr ? `- Date : ${dateStr}` : "", "", body2, "", `${ctaLabel} : ${ctaLink}`].filter(l => l !== undefined).join("\n");
  return { subject, html, text };
}

function buildBookingRespondedEmail({ userName, service, partnerName, adminMessage, price, language }) {
  const isFr = language !== "ht";
  const subject = isFr
    ? `💬 Réponse reçue pour votre demande — ${service}`
    : `💬 Repons resevwa pou demann ou — ${service}`;
  const heading = isFr ? `Bonne nouvelle, ${userName} !` : `Bon nouvèl, ${userName} !`;
  const intro = isFr
    ? `Notre équipe a répondu à votre demande pour <strong>${escapeHtml(service)}</strong> chez <strong>${escapeHtml(partnerName)}</strong>.`
    : `Ekip nou an reponn demann ou pou <strong>${escapeHtml(service)}</strong> nan <strong>${escapeHtml(partnerName)}</strong>.`;
  const priceLabel = isFr ? "Devis proposé" : "Devis pwopoze";
  const ctaLabel = isFr ? "Voir la réponse et payer" : "Wè repons lan epi peye";
  const ctaLink = `${getPublicSiteUrl()}/evenements/mes-demandes`;

  const html = baseHtml(`
    <div style="background:#fff7f8;border:1px solid #fce7f3;border-radius:18px;padding:24px;margin-bottom:16px;">
      <h2 style="margin:0 0 12px;font-size:18px;color:#9b2335;">${escapeHtml(heading)}</h2>
      <p style="margin:0 0 16px;">${intro}</p>
      ${adminMessage ? `<div style="background:#fff;border:1px solid #fce7f3;border-radius:12px;padding:16px;margin-bottom:16px;font-style:italic;color:#475569;">"${escapeHtml(adminMessage)}"</div>` : ""}
      ${price ? `<div style="background:#fdf4ff;border:1px solid #f0abfc;border-radius:12px;padding:12px 16px;display:inline-block;margin-bottom:20px;"><span style="font-size:12px;color:#7e22ce;font-weight:600;">${escapeHtml(priceLabel)}</span><br/><span style="font-size:22px;font-weight:800;color:#6b21a8;">💰 ${escapeHtml(price)}</span></div>` : ""}
      <br/>
      <a href="${ctaLink}" style="display:inline-block;background:#be185d;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:700;">${escapeHtml(ctaLabel)}</a>
    </div>`);

  const text = [heading, "", `${service} — ${partnerName}`, adminMessage ? `"${adminMessage}"` : "", price ? `${priceLabel} : ${price}` : "", "", `${ctaLabel} : ${ctaLink}`].filter(l => l !== undefined).join("\n");
  return { subject, html, text };
}

function buildDepositConfirmedEmail({ userName, service, partnerName, amount, transactionId, language }) {
  const isFr = language !== "ht";
  const subject = isFr
    ? `💳 Acompte confirmé — ${service}`
    : `💳 Akonpte konfime — ${service}`;
  const heading = isFr ? `Paiement reçu, ${userName} !` : `Peman resevwa, ${userName} !`;
  const body = isFr
    ? `Votre acompte pour <strong>${escapeHtml(service)}</strong> chez <strong>${escapeHtml(partnerName)}</strong> a bien été enregistré. Notre équipe va finaliser les détails de votre événement.`
    : `Akonpte ou a pou <strong>${escapeHtml(service)}</strong> nan <strong>${escapeHtml(partnerName)}</strong> anrejistre. Ekip nou an ap finalize detay evènman ou a.`;
  const ctaLink = `${getPublicSiteUrl()}/evenements/mes-demandes`;
  const ctaLabel = isFr ? "Suivre ma demande" : "Swiv demann mwen";

  const html = baseHtml(`
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:18px;padding:24px;margin-bottom:16px;">
      <h2 style="margin:0 0 12px;font-size:18px;color:#15803d;">${escapeHtml(heading)}</h2>
      <p style="margin:0 0 16px;">${body}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
        ${amount ? `<tr><td style="padding:6px 0;color:#64748b;">💰 Montant</td><td style="padding:6px 0;font-weight:700;">${escapeHtml(String(amount))} HTG</td></tr>` : ""}
        ${transactionId ? `<tr><td style="padding:6px 0;color:#64748b;">🔖 Transaction</td><td style="padding:6px 0;font-family:monospace;font-size:12px;color:#94a3b8;">${escapeHtml(transactionId)}</td></tr>` : ""}
      </table>
      <a href="${ctaLink}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:700;">${escapeHtml(ctaLabel)}</a>
    </div>`);

  const text = [heading, "", `${service} — ${partnerName}`, amount ? `Montant : ${amount} HTG` : "", transactionId ? `Transaction : ${transactionId}` : "", "", `${ctaLabel} : ${ctaLink}`].filter(l => l !== undefined).join("\n");
  return { subject, html, text };
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

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    if (!idToken) return jsonNoStore({ error: "unauthorized" }, { status: 401 });

    const body = await request.json();
    const { type, toEmail, toName, language = "fr", ...data } = body;

    const { resendApiKey, fromEmail } = getEmailConfig();
    if (!resendApiKey || !fromEmail) {
      return jsonNoStore({ success: false, error: "email_service_unconfigured" }, { status: 503 });
    }

    const app = getAdminApp();
    const { getAuth } = require("firebase-admin/auth");
    const decoded = await getAuth(app).verifyIdToken(idToken);

    const ADMIN_EMAIL = "bannsoraya2@gmail.com";
    const callerEmail = String(decoded.email || "").toLowerCase();
    const callerRole = String(decoded.role || "").toLowerCase();
    const isAllowed = callerEmail === ADMIN_EMAIL || ["admin", "event_manager"].includes(callerRole);
    if (!isAllowed) return jsonNoStore({ error: "forbidden" }, { status: 403 });

    if (!isValidEmail(toEmail)) {
      return jsonNoStore({ success: false, error: "invalid_recipient_email" }, { status: 400 });
    }

    let emailTemplate;
    if (type === "booking_created") {
      emailTemplate = buildBookingCreatedEmail({ userName: toName, language, ...data });
    } else if (type === "booking_responded") {
      emailTemplate = buildBookingRespondedEmail({ userName: toName, language, ...data });
    } else if (type === "deposit_confirmed") {
      emailTemplate = buildDepositConfirmedEmail({ userName: toName, language, ...data });
    } else {
      return jsonNoStore({ error: "unknown_type" }, { status: 400 });
    }

    const result = await sendEmail({
      toEmail,
      subject: emailTemplate.subject,
      text: emailTemplate.text,
      html: emailTemplate.html,
    });

    if (!result.ok) {
      console.error("Event booking email send failed:", result.status, result.payload);
      return jsonNoStore({ success: false, error: "send_failed" }, { status: 502 });
    }

    return jsonNoStore({ success: true, type, toEmail });
  } catch (error) {
    console.error("Event booking email API error:", error);
    return jsonNoStore({ error: "server_error" }, { status: 500 });
  }
}
