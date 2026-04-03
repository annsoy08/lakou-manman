import { NextResponse } from "next/server";
import { getPublicSiteUrl } from "@/lib/public-site";
import { authenticateFirebaseUserFromRequest, getFirebaseAuthConfigIssues, hasFirebaseAuthServerConfig, unauthorizedJson } from "@/lib/server/firebase-auth";
import { getDocumentAsAdmin, getFirestoreAdminConfigIssues, hasFirestoreAdminConfig } from "@/lib/server/firestore-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonNoStore(payload, init = {}) {
  return NextResponse.json(payload, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...(init.headers || {}),
    },
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
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isValidEmail(emailValue) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(emailValue || "").trim());
}

function getEmailConfig() {
  return {
    resendApiKey: normalizeEnvValue(process.env.RESEND_API_KEY),
    fromEmail: normalizeEnvValue(process.env.GROUP_NOTIFICATION_FROM_EMAIL || process.env.CONTACT_FROM_EMAIL),
    replyToEmail: normalizeEnvValue(process.env.GROUP_NOTIFICATION_REPLY_TO_EMAIL || process.env.CONTACT_TO_EMAIL),
  };
}

function getMissingEmailConfigKeys() {
  const { resendApiKey, fromEmail } = getEmailConfig();
  const missingKeys = [];

  if (!resendApiKey) {
    missingKeys.push("RESEND_API_KEY");
  }

  if (!fromEmail) {
    missingKeys.push("GROUP_NOTIFICATION_FROM_EMAIL or CONTACT_FROM_EMAIL");
  }

  return missingKeys;
}

function getRecipientLanguage(userProfile = {}) {
  const preferredLanguage = String(
    userProfile?.preferredLanguage || userProfile?.language || userProfile?.locale || "fr"
  ).trim().toLowerCase();

  return preferredLanguage.startsWith("ht") ? "ht" : "fr";
}

function getProviderErrorMessage(errorPayload = "", statusCode = 500) {
  const normalizedPayload = String(errorPayload || "").trim();
  const lowerPayload = normalizedPayload.toLowerCase();

  if (lowerPayload.includes("verify a domain") || lowerPayload.includes("domain is not verified") || lowerPayload.includes("sender") && lowerPayload.includes("verified")) {
    return "L'adresse d'envoi doit être vérifiée dans Resend avant de pouvoir envoyer des emails.";
  }

  if (lowerPayload.includes("api key") || lowerPayload.includes("unauthorized") || statusCode === 401 || statusCode === 403) {
    return "La clé Resend ou les autorisations d'envoi sont invalides.";
  }

  return "Le fournisseur email a refusé l'envoi du message.";
}

function buildChessInviteEmailTemplate({ recipientName = "", senderName = "", gameLink = "", language = "fr" }) {
  const isHt = language === "ht";
  const safeRecipientName = recipientName || (isHt ? "zanmi a" : "ami·e");
  const safeSenderName = senderName || (isHt ? "Yon manm" : "Un membre");
  const subject = isHt
    ? `${safeSenderName} envite w jwe echèk sou Lakou Manman`
    : `${safeSenderName} vous invite à jouer aux échecs sur Lakou Manman`;
  const intro = isHt
    ? `Bonjou ${safeRecipientName},`
    : `Bonjour ${safeRecipientName},`;
  const lead = isHt
    ? `${safeSenderName} voye yon envitasyon ba ou pou jwe yon pati echèk anliy sou Lakou Manman.`
    : `${safeSenderName} vous a envoyé une invitation pour jouer une partie d'échecs en ligne sur Lakou Manman.`;
  const ctaLabel = isHt ? "Louvri pati a" : "Ouvrir la partie";
  const footer = isHt
    ? "Klike sou bouton an pou ouvri jwèt la epi rantre nan pati a depi kont ou."
    : "Cliquez sur le bouton pour ouvrir le jeu et rejoindre la partie depuis votre compte.";

  const text = [
    intro,
    "",
    lead,
    "",
    `${ctaLabel} : ${gameLink}`,
    "",
    footer,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6;max-width:640px;margin:0 auto;padding:24px;">
      <div style="margin-bottom:24px;">
        <h1 style="font-size:20px;margin:0 0 8px;color:#9B2335;">${escapeHtml(subject)}</h1>
        <p style="margin:0;color:#475569;">${escapeHtml(intro)}</p>
      </div>
      <div style="background:#fff7f8;border:1px solid #ffe4e6;border-radius:18px;padding:20px;">
        <p style="margin:0 0 12px;">${escapeHtml(lead)}</p>
        <div style="margin-top:20px;">
          <a href="${escapeHtml(gameLink)}" style="display:inline-block;background:#9B2335;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:600;">${escapeHtml(ctaLabel)}</a>
        </div>
      </div>
      <p style="margin:18px 0 0;color:#64748b;font-size:13px;">${escapeHtml(footer)}</p>
    </div>
  `;

  return {
    subject,
    text,
    html,
  };
}

async function sendEmail({ toEmail, subject, text, html }) {
  const { resendApiKey, fromEmail, replyToEmail } = getEmailConfig();
  const response = await fetch("https://api.resend.com/emails", {
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

  const rawPayload = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    payload: rawPayload,
  };
}

export async function POST(request) {
  try {
    const { gameId = "", recipientId = "" } = await request.json();
    const normalizedGameId = String(gameId || "").trim();
    const normalizedRecipientId = String(recipientId || "").trim();

    if (!normalizedGameId || !normalizedRecipientId) {
      return jsonNoStore({ success: false, error: "missing_chess_email_payload" }, { status: 400 });
    }

    if (!hasFirebaseAuthServerConfig()) {
      return jsonNoStore({
        success: false,
        error: "firebase_auth_server_config_missing",
        ...(process.env.NODE_ENV !== "production" ? { missing: getFirebaseAuthConfigIssues() } : {}),
      }, { status: 503 });
    }

    if (!hasFirestoreAdminConfig()) {
      return jsonNoStore({
        success: false,
        error: "firebase_admin_config_missing",
        ...(process.env.NODE_ENV !== "production" ? { missing: getFirestoreAdminConfigIssues() } : {}),
      }, { status: 503 });
    }

    const missingEmailConfigKeys = getMissingEmailConfigKeys();
    if (missingEmailConfigKeys.length > 0) {
      return jsonNoStore({
        success: false,
        error: "email_service_unconfigured",
        ...(process.env.NODE_ENV !== "production" ? { missing: missingEmailConfigKeys } : {}),
      }, { status: 503 });
    }

    const authenticatedUser = await authenticateFirebaseUserFromRequest(request);
    if (!authenticatedUser?.uid) {
      return unauthorizedJson({ error: "unauthorized_chess_invite_email" });
    }

    const chessGame = await getDocumentAsAdmin(`chessGames/${normalizedGameId}`);
    if (!chessGame?.id) {
      return jsonNoStore({ success: false, error: "chess_game_not_found" }, { status: 404 });
    }

    const participants = Array.isArray(chessGame.participants)
      ? chessGame.participants.map((participantId) => String(participantId || "").trim()).filter(Boolean)
      : [];

    if (!participants.includes(authenticatedUser.uid) || !participants.includes(normalizedRecipientId)) {
      return jsonNoStore({ success: false, error: "forbidden_chess_email_participants" }, { status: 403 });
    }

    const [recipientProfile, senderProfile] = await Promise.all([
      getDocumentAsAdmin(`users/${normalizedRecipientId}`),
      getDocumentAsAdmin(`users/${authenticatedUser.uid}`),
    ]);

    if (!recipientProfile?.id) {
      return jsonNoStore({ success: false, error: "chess_email_recipient_not_found" }, { status: 404 });
    }

    const recipientEmail = String(recipientProfile.email || "").trim().toLowerCase();
    if (!isValidEmail(recipientEmail)) {
      return jsonNoStore({ success: false, error: "chess_email_recipient_missing_email" }, { status: 400 });
    }

    const senderName = String(
      chessGame?.participantNames?.[authenticatedUser.uid]
      || senderProfile?.name
      || senderProfile?.displayName
      || authenticatedUser.displayName
      || "Joueur"
    ).trim();
    const recipientName = String(recipientProfile.name || recipientProfile.displayName || "").trim();
    const gameLink = `${getPublicSiteUrl()}/games#chess-game`;
    const emailTemplate = buildChessInviteEmailTemplate({
      recipientName,
      senderName,
      gameLink,
      language: getRecipientLanguage(recipientProfile),
    });

    const emailResult = await sendEmail({
      toEmail: recipientEmail,
      subject: emailTemplate.subject,
      text: emailTemplate.text,
      html: emailTemplate.html,
    });

    if (!emailResult.ok) {
      return jsonNoStore({
        success: false,
        error: "send_failed",
        message: getProviderErrorMessage(emailResult.payload, emailResult.status),
      }, { status: 502 });
    }

    return jsonNoStore({
      success: true,
      gameId: normalizedGameId,
      recipientId: normalizedRecipientId,
      recipientEmail,
    });
  } catch (error) {
    console.error("Chess invite email API error:", error);
    return jsonNoStore({ success: false, error: "server_error" }, { status: 500 });
  }
}
