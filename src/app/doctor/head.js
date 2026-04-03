import { getPublicSiteUrl } from "@/lib/public-site";

export default function Head() {
  const publicSiteUrl = getPublicSiteUrl();
  const title = "Sant Doktè | Lakou Manman";
  const description = "Jwenn kontni sante valide, kestyon pou espesyalis ak resous serye pou manman sou Lakou Manman.";
  const canonicalUrl = `${publicSiteUrl}/doctor`;

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
