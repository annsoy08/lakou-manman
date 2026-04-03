import { getPublicSiteUrl } from "@/lib/public-site";

export default function Head() {
  const publicSiteUrl = getPublicSiteUrl();
  const title = "Contact | Lakou Manman";
  const description = "Kontakte ekip Lakou Manman pou sipò, kestyon, kolaborasyon ak enfòmasyon sou sèvis yo.";
  const canonicalUrl = `${publicSiteUrl}/contact`;

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
    </>
  );
}
