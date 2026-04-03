import { getPublicSiteUrl } from "@/lib/public-site";

const staticRoutes = [
  "",
  "/about",
  "/boutique",
  "/contact",
  "/doctor",
  "/faq",
  "/features",
  "/feed",
  "/groups",
  "/guidelines",
  "/guides",
  "/help",
  "/how-it-works",
  "/login",
  "/outils",
  "/pediatre",
  "/privacy",
  "/register",
  "/sante",
  "/terms",
  "/testimonials",
  "/tools",
];

export default function sitemap() {
  const publicSiteUrl = getPublicSiteUrl();
  const lastModified = new Date();

  return staticRoutes.map((route) => ({
    url: `${publicSiteUrl}${route}`,
    lastModified,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/boutique" || route === "/doctor" || route === "/pediatre" ? 0.8 : 0.6,
  }));
}
