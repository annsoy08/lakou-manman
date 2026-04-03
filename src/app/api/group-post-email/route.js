import { NextResponse } from "next/server";
import { getPublicSiteUrl } from "@/lib/public-site";
import { authenticateFirebaseUserFromRequest, getFirebaseAuthConfigIssues, hasFirebaseAuthServerConfig, unauthorizedJson } from "@/lib/server/firebase-auth";
import { getDocumentAsAdmin, getFirestoreAdminConfigIssues, hasFirestoreAdminConfig, patchDocumentAsAdmin } from "@/lib/server/firestore-admin";

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

function trimPreview(value = "", maxLength = 180) {
  const normalizedValue = String(value || "").trim().replace(/\s+/g, " ");
  if (normalizedValue.length <= maxLength) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
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

function buildEmailTemplate({ recipientName = "", authorName = "", groupName = "", postTitle = "", postBody = "", postLink = "", language = "fr" }) {
  const isHt = language === "ht";
  const safeRecipientName = recipientName || (isHt ? "manm kominote a" : "membre de la communauté");
  const safeAuthorName = authorName || (isHt ? "Yon manm" : "Un membre");
  const safeGroupName = groupName || (isHt ? "gwoup ou a" : "votre groupe");
  const safePostTitle = trimPreview(postTitle || postBody, 160) || (isHt ? "Nouvo piblikasyon" : "Nouvelle publication");
  const safePostBody = trimPreview(postBody, 280);

  const subject = isHt
    ? `Nouvo pòs nan ${safeGroupName}`
    : `Nouveau post dans ${safeGroupName}`;

  const intro = isHt
    ? `Bonjou ${safeRecipientName},`
    : `Bonjour ${safeRecipientName},`;

  const lead = isHt
    ? `${safeAuthorName} fèk pibliye yon nouvo mesaj nan ${safeGroupName}.`
    : `${safeAuthorName} vient de publier un nouveau message dans ${safeGroupName}.`;

  const ctaLabel = isHt ? "Wè piblikasyon an" : "Voir la publication";
  const footer = isHt
    ? "Ou resevwa imèl sa a paske ou fè pati gwoup sa a sou Lakou Manman. Ou ka chanje preferans ou yo nan pwofil ou."
    : "Vous recevez cet e-mail parce que vous faites partie de ce groupe sur Lakou Manman. Vous pouvez modifier cette préférence depuis votre profil.";

  const textParts = [
    intro,
    "",
    lead,
    safePostTitle ? `${isHt ? "Tit" : "Titre"} : ${safePostTitle}` : "",
    safePostBody ? `${isHt ? "Aperçu" : "Aperçu"} : ${safePostBody}` : "",
    "",
    `${ctaLabel} : ${postLink}`,
    "",
    footer,
  ].filter(Boolean);

  const html = `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6;max-width:640px;margin:0 auto;padding:24px;">
      <div style="margin-bottom:24px;">
        <h1 style="font-size:20px;margin:0 0 8px;color:#9B2335;">${escapeHtml(subject)}</h1>
        <p style="margin:0;color:#475569;">${escapeHtml(intro)}</p>
      </div>
      <div style="background:#fff7f8;border:1px solid #ffe4e6;border-radius:18px;padding:20px;">
        <p style="margin:0 0 12px;">${escapeHtml(lead)}</p>
        <p style="margin:0 0 8px;"><strong>${escapeHtml(isHt ? "Tit" : "Titre")}</strong><br />${escapeHtml(safePostTitle)}</p>
        ${safePostBody ? `<p style="margin:0 0 8px;"><strong>${escapeHtml(isHt ? "Aperçu" : "Aperçu")}</strong><br />${escapeHtml(safePostBody)}</p>` : ""}
        <div style="margin-top:20px;">
          <a href="${escapeHtml(postLink)}" style="display:inline-block;background:#9B2335;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:600;">${escapeHtml(ctaLabel)}</a>
        </div>
      </div>
      <p style="margin:18px 0 0;color:#64748b;font-size:13px;">${escapeHtml(footer)}</p>
    </div>
  `;

  return {
    subject,
    text: textParts.join("\n"),
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
    const { postId = "" } = await request.json();
    const normalizedPostId = String(postId || "").trim();

    if (!normalizedPostId) {
      return jsonNoStore({ success: false, error: "missing_post_id" }, { status: 400 });
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
      return unauthorizedJson({ error: "unauthorized_group_post_email" });
    }

    const post = await getDocumentAsAdmin(`posts/${normalizedPostId}`);
    if (!post?.id || !post.groupId) {
      return jsonNoStore({ success: false, error: "post_not_found_or_not_group_post" }, { status: 404 });
    }

    if (String(post.authorId || "").trim() !== authenticatedUser.uid) {
      return jsonNoStore({ success: false, error: "forbidden_post_author_mismatch" }, { status: 403 });
    }

    const group = await getDocumentAsAdmin(`groups/${post.groupId}`);
    if (!group?.id) {
      return jsonNoStore({ success: false, error: "group_not_found" }, { status: 404 });
    }

    const recipientIds = Array.from(new Set(Array.isArray(group.members) ? group.members : []))
      .map((recipientId) => String(recipientId || "").trim())
      .filter(Boolean)
      .filter((recipientId) => recipientId !== authenticatedUser.uid);

    const postLink = `${getPublicSiteUrl()}/groups/${group.id}?postId=${encodeURIComponent(normalizedPostId)}`;
    const counts = {
      sent: 0,
      skipped: 0,
      failed: 0,
      alreadySent: 0,
    };

    for (const recipientId of recipientIds) {
      const [recipientProfile, notificationRecord] = await Promise.all([
        getDocumentAsAdmin(`users/${recipientId}`),
        getDocumentAsAdmin(`users/${recipientId}/notifications/group_${normalizedPostId}`),
      ]);

      if (!recipientProfile?.id) {
        counts.skipped += 1;
        continue;
      }

      if (recipientProfile.groupPostEmailNotifications === false) {
        counts.skipped += 1;
        continue;
      }

      const recipientEmail = String(recipientProfile.email || "").trim().toLowerCase();
      if (!recipientEmail) {
        counts.skipped += 1;
        continue;
      }

      if (!notificationRecord?.id) {
        counts.skipped += 1;
        continue;
      }

      if (notificationRecord.emailSentAt || notificationRecord.emailDelivery === "sent") {
        counts.alreadySent += 1;
        continue;
      }

      const emailTemplate = buildEmailTemplate({
        recipientName: String(recipientProfile.name || recipientProfile.displayName || "").trim(),
        authorName: String(post.authorName || authenticatedUser.displayName || "").trim(),
        groupName: String(group.name || group.title || "").trim(),
        postTitle: String(post.title || "").trim(),
        postBody: String(post.body || post.text || "").trim(),
        postLink,
        language: getRecipientLanguage(recipientProfile),
      });

      const emailResult = await sendEmail({
        toEmail: recipientEmail,
        subject: emailTemplate.subject,
        text: emailTemplate.text,
        html: emailTemplate.html,
      });

      if (emailResult.ok) {
        counts.sent += 1;
        await patchDocumentAsAdmin(`users/${recipientId}/notifications/group_${normalizedPostId}`, {
          emailSentAt: new Date(),
          emailDelivery: "sent",
          emailDeliveryUpdatedAt: new Date(),
        });
        continue;
      }

      counts.failed += 1;
      await patchDocumentAsAdmin(`users/${recipientId}/notifications/group_${normalizedPostId}`, {
        emailDelivery: "failed",
        emailDeliveryUpdatedAt: new Date(),
        emailDeliveryError: trimPreview(emailResult.payload || `resend_status_${emailResult.status}`, 280),
      });
    }

    return jsonNoStore({
      success: true,
      postId: normalizedPostId,
      groupId: group.id,
      recipients: recipientIds.length,
      ...counts,
    });
  } catch (error) {
    console.error("Group post email API error:", error);
    return jsonNoStore({ success: false, error: "server_error" }, { status: 500 });
  }
}
