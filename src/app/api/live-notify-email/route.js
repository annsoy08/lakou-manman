import { NextResponse } from "next/server";
import { getPublicSiteUrl } from "@/lib/public-site";
import {
  authenticateFirebaseUserFromRequest,
  getFirebaseAuthConfigIssues,
  hasFirebaseAuthServerConfig,
  unauthorizedJson,
} from "@/lib/server/firebase-auth";
import {
  getDocumentAsAdmin,
  getFirestoreAdminConfigIssues,
  hasFirestoreAdminConfig,
  runStructuredQueryAsAdmin,
} from "@/lib/server/firestore-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonNoStore(payload, init = {}) {
  return NextResponse.json(payload, {
    ...init,
    headers: { "Cache-Control": "no-store", ...(init.headers || {}) },
  });
}

function normalizeEnvValue(value = "") {
  return String(value ?? "").trim().replace(/^['"]|['"]$/g, "");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getEmailConfig() {
  return {
    resendApiKey: normalizeEnvValue(process.env.RESEND_API_KEY),
    fromEmail: normalizeEnvValue(
      process.env.GROUP_NOTIFICATION_FROM_EMAIL || process.env.CONTACT_FROM_EMAIL
    ),
    replyToEmail: normalizeEnvValue(
      process.env.GROUP_NOTIFICATION_REPLY_TO_EMAIL || process.env.CONTACT_TO_EMAIL
    ),
  };
}

function getMissingEmailConfigKeys() {
  const { resendApiKey, fromEmail } = getEmailConfig();
  const missing = [];
  if (!resendApiKey) missing.push("RESEND_API_KEY");
  if (!fromEmail) missing.push("GROUP_NOTIFICATION_FROM_EMAIL or CONTACT_FROM_EMAIL");
  return missing;
}

function getLang(userProfile = {}) {
  const lang = String(userProfile?.preferredLanguage || userProfile?.language || "fr")
    .trim()
    .toLowerCase();
  return lang.startsWith("ht") ? "ht" : "fr";
}

function buildLiveEmailTemplate({ recipientName, hostName, streamTitle, liveUrl, language }) {
  const isHt = language === "ht";
  const safe = (v, fallback = "") => escapeHtml(String(v || fallback));

  const rName = safe(recipientName, isHt ? "manm kominote a" : "membre de la communauté");
  const hName = safe(hostName, "Lakou Manman");
  const title = safe(streamTitle, isHt ? "Live Lakou Manman" : "Live Lakou Manman");

  const subject = isHt
    ? `🔴 ${hName} kòmanse yon live: ${title}`
    : `🔴 ${hName} est en live : ${title}`;

  const intro = isHt ? `Bonjou ${rName},` : `Bonjour ${rName},`;
  const lead = isHt
    ? `${hName} fèk kòmanse yon live sou Lakou Manman.`
    : `${hName} vient de démarrer un live sur Lakou Manman.`;
  const streamLabel = isHt ? `Tit : ${title}` : `Titre : ${title}`;
  const cta = isHt ? "Rejwenn live a kounye a" : "Rejoindre le live maintenant";
  const footer = isHt
    ? "Ou resevwa imèl sa a paske ou se yon manm Lakou Manman. Ou ka chanje preferans notifikasyon ou yo nan pwofil ou."
    : "Vous recevez cet e-mail parce que vous êtes membre de Lakou Manman. Vous pouvez modifier vos préférences de notification depuis votre profil.";

  const html = `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6;max-width:640px;margin:0 auto;padding:24px;">
      <div style="margin-bottom:20px;">
        <span style="display:inline-block;background:#ef4444;color:#fff;font-weight:700;font-size:12px;padding:4px 12px;border-radius:999px;letter-spacing:.05em;">LIVE</span>
      </div>
      <h1 style="font-size:20px;margin:0 0 6px;color:#9B2335;">${safe(streamTitle, "Live")}</h1>
      <p style="margin:0 0 20px;color:#475569;">${intro}</p>
      <div style="background:#fff7f8;border:1px solid #ffe4e6;border-radius:18px;padding:20px;">
        <p style="margin:0 0 10px;">${lead}</p>
        <p style="margin:0 0 18px;font-weight:600;">${streamLabel}</p>
        <a href="${escapeHtml(liveUrl)}" style="display:inline-block;background:#9B2335;color:#fff;text-decoration:none;padding:13px 22px;border-radius:999px;font-weight:700;font-size:15px;">${cta}</a>
      </div>
      <p style="margin:18px 0 0;color:#64748b;font-size:12px;">${footer}</p>
    </div>
  `;

  const text = [intro, "", lead, streamLabel, "", `${cta} : ${liveUrl}`, "", footer].join("\n");

  return { subject, html, text };
}

async function sendEmail({ toEmail, subject, text, html }) {
  const { resendApiKey, fromEmail, replyToEmail } = getEmailConfig();
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      ...(replyToEmail ? { reply_to: replyToEmail } : {}),
      subject,
      text,
      html,
    }),
    cache: "no-store",
  });
  return { ok: res.ok, status: res.status };
}

export async function POST(request) {
  try {
    const { streamId = "" } = await request.json();
    const normalizedStreamId = String(streamId || "").trim();

    if (!normalizedStreamId) {
      return jsonNoStore({ success: false, error: "missing_stream_id" }, { status: 400 });
    }

    if (!hasFirebaseAuthServerConfig()) {
      return jsonNoStore({ success: false, error: "firebase_auth_server_config_missing" }, { status: 503 });
    }

    if (!hasFirestoreAdminConfig()) {
      return jsonNoStore({ success: false, error: "firebase_admin_config_missing" }, { status: 503 });
    }

    const missingEmail = getMissingEmailConfigKeys();
    if (missingEmail.length > 0) {
      return jsonNoStore({ success: false, error: "email_service_unconfigured" }, { status: 503 });
    }

    const authenticatedUser = await authenticateFirebaseUserFromRequest(request);
    if (!authenticatedUser?.uid) {
      return unauthorizedJson({ error: "unauthorized_live_notify" });
    }

    const stream = await getDocumentAsAdmin(`liveStreams/${normalizedStreamId}`);
    if (!stream?.id) {
      return jsonNoStore({ success: false, error: "stream_not_found" }, { status: 404 });
    }

    if (String(stream.hostId || "").trim() !== authenticatedUser.uid) {
      return jsonNoStore({ success: false, error: "forbidden_not_host" }, { status: 403 });
    }

    const liveUrl = `${getPublicSiteUrl()}/live`;
    const hostName = String(stream.hostName || authenticatedUser.displayName || "Lakou Manman").trim();
    const streamTitle = String(stream.title || "").trim() || (stream.language === "ht" ? "Live" : "Live");

    const users = await runStructuredQueryAsAdmin("users", { limit: 500 });

    const counts = { sent: 0, skipped: 0, failed: 0 };

    for (const userDoc of users) {
      if (!userDoc?.id) { counts.skipped++; continue; }
      if (String(userDoc.id).trim() === authenticatedUser.uid) { counts.skipped++; continue; }
      if (userDoc.liveEmailNotifications === false) { counts.skipped++; continue; }

      const toEmail = String(userDoc.email || "").trim().toLowerCase();
      if (!toEmail) { counts.skipped++; continue; }

      const language = getLang(userDoc);
      const { subject, html, text } = buildLiveEmailTemplate({
        recipientName: String(userDoc.name || userDoc.displayName || "").trim(),
        hostName,
        streamTitle,
        liveUrl,
        language,
      });

      const result = await sendEmail({ toEmail, subject, html, text });
      if (result.ok) { counts.sent++; } else { counts.failed++; }
    }

    return jsonNoStore({ success: true, streamId: normalizedStreamId, ...counts });
  } catch (error) {
    console.error("Live notify email error:", error);
    return jsonNoStore({ success: false, error: "server_error" }, { status: 500 });
  }
}
