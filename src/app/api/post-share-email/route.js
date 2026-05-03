import { NextResponse } from "next/server";
import { getPublicSiteUrl } from "@/lib/public-site";
import { authenticateFirebaseUserFromRequest, getFirebaseAuthConfigIssues, hasFirebaseAuthServerConfig, unauthorizedJson } from "@/lib/server/firebase-auth";
import { getDocumentAsAdmin, getFirestoreAdminConfigIssues, hasFirestoreAdminConfig } from "@/lib/server/firestore-admin";

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

function trimPreview(value = "", maxLength = 180) {
  const s = String(value || "").trim().replace(/\s+/g, " ");
  return s.length <= maxLength ? s : `${s.slice(0, maxLength - 1).trim()}…`;
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
  const missing = [];
  if (!resendApiKey) missing.push("RESEND_API_KEY");
  if (!fromEmail) missing.push("GROUP_NOTIFICATION_FROM_EMAIL or CONTACT_FROM_EMAIL");
  return missing;
}

function getLang(userProfile = {}) {
  const lang = String(userProfile?.preferredLanguage || userProfile?.language || "fr").trim().toLowerCase();
  return lang.startsWith("ht") ? "ht" : "fr";
}

function buildShareEmailTemplate({ authorName = "", sharerName = "", postTitle = "", postBody = "", postLink = "", language = "fr" }) {
  const isHt = language === "ht";
  const safe = (v, fallback = "") => escapeHtml(String(v || fallback));

  const safeAuthor = safe(authorName, isHt ? "manm kominote a" : "membre");
  const safeSharer = safe(sharerName, isHt ? "Yon manm" : "Un membre");
  const safeTitle = trimPreview(postTitle || postBody, 160) || (isHt ? "Piblikasyon ou a" : "Votre publication");
  const safeBody = trimPreview(postBody, 240);

  const subject = isHt
    ? `${safeSharer} pataje piblikasyon ou a sou Lakou Manman`
    : `${safeSharer} a partagé votre publication sur Lakou Manman`;

  const intro = isHt ? `Bonjou ${safeAuthor},` : `Bonjour ${safeAuthor},`;
  const lead = isHt
    ? `${safeSharer} fèk pataje youn nan piblikasyon ou yo ak kominote a.`
    : `${safeSharer} vient de partager l'une de vos publications avec la communauté.`;
  const ctaLabel = isHt ? "Wè piblikasyon an" : "Voir la publication";
  const footer = isHt
    ? "Ou resevwa imèl sa a paske ou se yon manm Lakou Manman. Ou ka chanje preferans notifikasyon ou yo nan pwofil ou."
    : "Vous recevez cet e-mail parce que vous êtes membre de Lakou Manman. Vous pouvez modifier vos préférences de notification depuis votre profil.";

  const html = `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6;max-width:640px;margin:0 auto;padding:24px;">
      <div style="margin-bottom:24px;">
        <h1 style="font-size:20px;margin:0 0 8px;color:#9B2335;">${escapeHtml(subject)}</h1>
        <p style="margin:0;color:#475569;">${intro}</p>
      </div>
      <div style="background:#fff7f8;border:1px solid #ffe4e6;border-radius:18px;padding:20px;">
        <p style="margin:0 0 12px;">${lead}</p>
        <p style="margin:0 0 8px;"><strong>${escapeHtml(isHt ? "Tit" : "Titre")}</strong><br />${escapeHtml(safeTitle)}</p>
        ${safeBody ? `<p style="margin:0 0 8px;"><strong>${escapeHtml("Aperçu")}</strong><br />${escapeHtml(safeBody)}</p>` : ""}
        <div style="margin-top:20px;">
          <a href="${escapeHtml(postLink)}" style="display:inline-block;background:#9B2335;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:600;">${ctaLabel}</a>
        </div>
      </div>
      <p style="margin:18px 0 0;color:#64748b;font-size:13px;">${footer}</p>
    </div>
  `;

  const text = [intro, "", lead, `${isHt ? "Tit" : "Titre"} : ${safeTitle}`, safeBody ? `Aperçu : ${safeBody}` : "", "", `${ctaLabel} : ${postLink}`, "", footer].filter(Boolean).join("\n");

  return { subject, html, text };
}

async function sendEmail({ toEmail, subject, text, html }) {
  const { resendApiKey, fromEmail, replyToEmail } = getEmailConfig();
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
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
  const payload = await res.text();
  return { ok: res.ok, status: res.status, payload };
}

export async function POST(request) {
  try {
    const { postId = "" } = await request.json();
    const normalizedPostId = String(postId || "").trim();

    if (!normalizedPostId) {
      return jsonNoStore({ success: false, error: "missing_post_id" }, { status: 400 });
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
      return unauthorizedJson({ error: "unauthorized_post_share_email" });
    }

    const post = await getDocumentAsAdmin(`posts/${normalizedPostId}`);
    if (!post?.id || !post.authorId) {
      return jsonNoStore({ success: false, error: "post_not_found" }, { status: 404 });
    }

    const authorId = String(post.authorId || "").trim();

    if (authorId === authenticatedUser.uid) {
      return jsonNoStore({ success: true, skipped: "self_share" });
    }

    const [authorProfile, sharerProfile] = await Promise.all([
      getDocumentAsAdmin(`users/${authorId}`),
      getDocumentAsAdmin(`users/${authenticatedUser.uid}`),
    ]);

    if (!authorProfile?.id) {
      return jsonNoStore({ success: false, error: "author_not_found" }, { status: 404 });
    }

    if (authorProfile.postShareEmailNotifications === false) {
      return jsonNoStore({ success: true, skipped: "notifications_disabled" });
    }

    const authorEmail = String(authorProfile.email || "").trim().toLowerCase();
    if (!isValidEmail(authorEmail)) {
      return jsonNoStore({ success: false, error: "author_email_missing" }, { status: 400 });
    }

    const postLink = post.groupId
      ? `${getPublicSiteUrl()}/groups/${post.groupId}?postId=${encodeURIComponent(normalizedPostId)}`
      : `${getPublicSiteUrl()}/feed?postId=${encodeURIComponent(normalizedPostId)}`;

    const sharerName = String(
      sharerProfile?.name || sharerProfile?.displayName || authenticatedUser.displayName || ""
    ).trim();

    const emailTemplate = buildShareEmailTemplate({
      authorName: String(authorProfile.name || authorProfile.displayName || "").trim(),
      sharerName,
      postTitle: String(post.title || "").trim(),
      postBody: String(post.body || post.text || "").trim(),
      postLink,
      language: getLang(authorProfile),
    });

    const emailResult = await sendEmail({
      toEmail: authorEmail,
      subject: emailTemplate.subject,
      text: emailTemplate.text,
      html: emailTemplate.html,
    });

    if (!emailResult.ok) {
      console.error("Post share email send failed:", { status: emailResult.status, body: emailResult.payload });
      return jsonNoStore({ success: false, error: "send_failed" }, { status: 502 });
    }

    return jsonNoStore({ success: true, postId: normalizedPostId, authorId });
  } catch (error) {
    console.error("Post share email API error:", error);
    return jsonNoStore({ success: false, error: "server_error" }, { status: 500 });
  }
}
