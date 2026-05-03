export const ONLINE_PRESENCE_TTL_MS = 75 * 1000;
export const TYPING_STATUS_TTL_MS = 4000;
export const MESSAGES_BOOTSTRAP_TIMEOUT_MS = 12000;
export const MESSAGES_LISTENER_RETRY_LIMIT = 5;
export const DIRECTORY_PAGE_SIZE = 36;

export const EMOJI_OPTIONS = [
  "😊","😂","😍","🥰","😘","🙏","❤️","💕","🌸","✨",
  "🎉","🤱","👶","🍼","😴","😅","🤗","💪","🙌","👍",
  "🔥","🥹","🤍","🤎","💙","💜","😁","😉","😇","🤔",
  "😌","👏","🎈","🌺","🌞","🌈","💐","🫶","🌟",
];

export async function sendPushNotification(payload, idToken = null) {
  const headers = { "Content-Type": "application/json" };
  if (idToken) headers["Authorization"] = `Bearer ${idToken}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (res.ok) return;
    } catch {}
    if (attempt === 0) await new Promise((r) => setTimeout(r, 2000));
  }
}

export function normalizeSearchTerm(value) {
  return String(value || "").trim().toLowerCase();
}

export function matchesSearchTerm(searchTerm, values = []) {
  if (!searchTerm) return true;
  return values
    .filter((v) => typeof v === "string" && v.trim())
    .map((v) => v.trim().toLowerCase())
    .some((v) => v.includes(searchTerm));
}

export function isRetryableMessageListenerError(error) {
  const code = String(error?.code || "").trim().toLowerCase();
  const message = String(error?.message || "").trim().toLowerCase();
  return (
    code === "permission-denied" ||
    code === "firestore/permission-denied" ||
    code === "unavailable" ||
    code === "firestore/unavailable" ||
    code === "failed-precondition" ||
    code === "firestore/failed-precondition" ||
    message.includes("insufficient permissions") ||
    message.includes("client is offline") ||
    message.includes("network")
  );
}

export function getTimestampMillis(timestamp) {
  if (!timestamp) return 0;
  if (typeof timestamp.toMillis === "function") return timestamp.toMillis();
  if (typeof timestamp.seconds === "number") return timestamp.seconds * 1000;
  if (typeof timestamp === "number") return timestamp;
  return 0;
}

export function formatAudioDuration(durationInSeconds) {
  const totalSeconds = Math.max(0, Math.round(Number(durationInSeconds) || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
