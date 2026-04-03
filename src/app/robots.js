import { getPublicSiteUrl } from "@/lib/public-site";

export default function robots() {
  const publicSiteUrl = getPublicSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${publicSiteUrl}/sitemap.xml`,
    host: publicSiteUrl,
  };
}
