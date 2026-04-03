function normalizeSiteUrlValue(value = "") {
  return String(value ?? "").trim().replace(/^['"]|['"]$/g, "").replace(/\/+$/, "");
}

const DEFAULT_PUBLIC_SITE_URL = "https://lakoumanman.com";

export function getPublicSiteUrl() {
  const explicitUrl = normalizeSiteUrlValue(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_URL);
  if (explicitUrl && /^https?:\/\//i.test(explicitUrl)) {
    return explicitUrl;
  }

  const productionUrl = normalizeSiteUrlValue(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (productionUrl) {
    return `https://${productionUrl.replace(/^https?:\/\//i, "")}`;
  }

  const previewUrl = normalizeSiteUrlValue(process.env.VERCEL_URL);
  if (previewUrl) {
    return `https://${previewUrl.replace(/^https?:\/\//i, "")}`;
  }

  return DEFAULT_PUBLIC_SITE_URL;
}
