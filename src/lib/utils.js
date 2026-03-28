import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

function resolveActiveLanguage(preferredLanguage = "") {
  if (typeof preferredLanguage === "string" && preferredLanguage.trim()) {
    return preferredLanguage.trim().toLowerCase();
  }

  if (typeof window !== "undefined") {
    const storedLanguage = window.localStorage?.getItem("language");
    if (storedLanguage) {
      return storedLanguage.trim().toLowerCase();
    }

    const htmlLanguage = document?.documentElement?.lang;
    if (htmlLanguage) {
      return String(htmlLanguage).trim().toLowerCase();
    }
  }

  return "fr";
}

export function formatDate(date, preferredLanguage = "") {
  if (!date) return "";

  const d = date instanceof Date ? date : date.toDate?.() || new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const language = resolveActiveLanguage(preferredLanguage);
  const isHaitianCreole = language.startsWith("ht");
  const locale = isHaitianCreole ? "ht-HT" : "fr-FR";

  if (diffMins < 1) return isHaitianCreole ? "kounye a" : "à l'instant";
  if (diffMins < 60) return `${diffMins} min`;
  if (diffHours < 24) return `${diffHours} h`;
  if (diffDays < 7) return `${diffDays} j`;
  return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

export function getInitials(name) {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function resolveUserDisplayName(profile = null, authUser = null, fallback = "") {
  const emailPrefix = typeof authUser?.email === "string" && authUser.email.includes("@")
    ? authUser.email.split("@")[0]
    : "";

  const resolvedName = [
    profile?.name,
    profile?.displayName,
    profile?.fullName,
    authUser?.displayName,
    emailPrefix,
    fallback,
  ].find((value) => typeof value === "string" && value.trim());

  return resolvedName || fallback;
}

function normalizeAssetVersion(version) {
  if (!version) return "";
  if (typeof version === "number" || typeof version === "string") {
    return String(version);
  }
  if (version instanceof Date) {
    return String(version.getTime());
  }
  if (typeof version?.toMillis === "function") {
    return String(version.toMillis());
  }
  return "";
}

export function appendCacheBuster(url, version) {
  const normalizedUrl = String(url || "").trim();
  const normalizedVersion = normalizeAssetVersion(version);

  if (!normalizedUrl) {
    return "";
  }

  if (!normalizedVersion) {
    return normalizedUrl;
  }

  const separator = normalizedUrl.includes("?") ? "&" : "?";
  return `${normalizedUrl}${separator}v=${encodeURIComponent(normalizedVersion)}`;
}

export function resolveProfilePhoto(primaryPhoto, fallbackPhoto = "", version = "") {
  return appendCacheBuster(primaryPhoto || fallbackPhoto || "", version);
}
