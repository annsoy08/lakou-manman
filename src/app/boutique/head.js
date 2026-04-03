import { getPublicSiteUrl } from "@/lib/public-site";

export default function Head() {
  const publicSiteUrl = getPublicSiteUrl();
  const title = "Boutique | Lakou Manman";
  const description = "Dekouvri atik pou manman ak timoun, vann an sekirite, epi swiv acha ou sou boutique Lakou Manman.";
  const canonicalUrl = `${publicSiteUrl}/boutique`;

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
