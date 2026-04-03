import { getPublicSiteUrl } from "@/lib/public-site";

export default function Head() {
  const publicSiteUrl = getPublicSiteUrl();
  const title = "Pedyatri | Lakou Manman";
  const description = "Konsèy pedyatri, videyo ak atik verifye pou ede manman yo pran swen timoun yo sou Lakou Manman.";
  const canonicalUrl = `${publicSiteUrl}/pediatre`;

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
