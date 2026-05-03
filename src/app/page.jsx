import dynamic from "next/dynamic";

const MarketingHomepage = dynamic(
  () => import("@/components/marketing/MarketingHomepage"),
  { ssr: false }
);

export default function LandingPage() {
  return <MarketingHomepage />;
}
