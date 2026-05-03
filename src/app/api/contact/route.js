import { NextResponse } from "next/server";

function normalizeEnvValue(value = "") {
  return String(value ?? "").trim().replace(/^['"]|['"]$/g, "");
}

function isValidEmail(emailValue) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(emailValue || "").trim());
}

function getContactConfig() {
  return {
    resendApiKey: normalizeEnvValue(process.env.RESEND_API_KEY),
    contactFromEmail: normalizeEnvValue(process.env.CONTACT_FROM_EMAIL),
    contactToEmail: normalizeEnvValue(process.env.CONTACT_TO_EMAIL || "contact@lakoumanman.com"),
  };
}

function getMissingConfigKeys() {
  const { resendApiKey, contactFromEmail, contactToEmail } = getContactConfig();
  const missingKeys = [];

  if (!resendApiKey) {
    missingKeys.push("RESEND_API_KEY");
  }

  if (!contactFromEmail) {
    missingKeys.push("CONTACT_FROM_EMAIL");
  }

  if (!contactToEmail) {
    missingKeys.push("CONTACT_TO_EMAIL");
  }

  return missingKeys;
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

export async function POST(request) {
  try {
    const { name = "", email = "", subject = "", message = "" } = await request.json();

    const trimmedPayload = {
      name: String(name).trim(),
      email: String(email).trim(),
      subject: String(subject).trim(),
      message: String(message).trim(),
    };

    if (!trimmedPayload.name || !trimmedPayload.email || !trimmedPayload.subject || !trimmedPayload.message) {
      return NextResponse.json(
        {
          error: "validation_error",
          message: "Missing required fields.",
        },
        { status: 400 }
      );
    }

    if (trimmedPayload.name.length > 120 || trimmedPayload.subject.length > 200 || trimmedPayload.message.length > 5000) {
      return NextResponse.json(
        { error: "validation_error", message: "One or more fields exceed the maximum allowed length." },
        { status: 400 }
      );
    }

    if (!isValidEmail(trimmedPayload.email)) {
      return NextResponse.json(
        {
          error: "validation_error",
          message: "Invalid email address.",
        },
        { status: 400 }
      );
    }

    const missingConfigKeys = getMissingConfigKeys();

    if (missingConfigKeys.length > 0) {
      return NextResponse.json(
        {
          error: "service_unconfigured",
          missingKeys: missingConfigKeys,
        },
        { status: 503 }
      );
    }

    const { resendApiKey, contactFromEmail, contactToEmail } = getContactConfig();
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: contactFromEmail,
        to: [contactToEmail],
        reply_to: trimmedPayload.email,
        subject: `[Contact] ${trimmedPayload.subject}`,
        text: `Nom: ${trimmedPayload.name}\nEmail: ${trimmedPayload.email}\n\nMessage:\n${trimmedPayload.message}`,
        html: `<div><p><strong>Nom :</strong> ${escapeHtml(trimmedPayload.name)}</p><p><strong>Email :</strong> ${escapeHtml(trimmedPayload.email)}</p><p><strong>Sujet :</strong> ${escapeHtml(trimmedPayload.subject)}</p><p><strong>Message :</strong></p><p>${escapeHtml(trimmedPayload.message).replace(/\n/g, "<br />")}</p></div>`,
      }),
    });

    if (!emailResponse.ok) {
      const errorPayload = await emailResponse.text();
      console.error("Contact email send failed:", {
        status: emailResponse.status,
        body: errorPayload,
      });
      return NextResponse.json(
        {
          error: "send_failed",
          message: getProviderErrorMessage(errorPayload, emailResponse.status),
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact API error:", error);
    return NextResponse.json(
      {
        error: "server_error",
      },
      { status: 500 }
    );
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
