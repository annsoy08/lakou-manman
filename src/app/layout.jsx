import "./globals.css";
import BodyWrapper from "@/components/layout/BodyWrapper";
import AppShell from "@/components/layout/AppShell";
import { getPublicSiteUrl } from "@/lib/public-site";

const publicSiteUrl = getPublicSiteUrl();
const siteTitle = "Lakou Manman - Kominote manman ayisyen";
const siteDescription = "Yon platfom enteraktif pou manman ayisyen jwenn konsey, sipor, epi pataje eksperyans yo ak kominote, resous pratik, kontni valide, ak yon vizyon pou tounen yon vre rezo sosyal pou manman.";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#9b2335",
};

export const metadata = {
  metadataBase: new URL(publicSiteUrl),
  title: {
    default: siteTitle,
    template: "%s | Lakou Manman",
  },
  description: siteDescription,
  applicationName: "Lakou Manman",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: publicSiteUrl,
    siteName: "Lakou Manman",
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: "/logo-lakou-manman.png",
        width: 512,
        height: 512,
        alt: "Lakou Manman",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: "Yon platfom enteraktif pou manman ayisyen jwenn konsey, sipor, epi pataje eksperyans yo ak kominote.",
    images: ["/logo-lakou-manman.png"],
  },
  icons: {
    icon: "/logo-lakou-manman.svg",
    shortcut: "/logo-lakou-manman.svg",
    apple: "/logo-lakou-manman.png",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ht">
      <body>
        <BodyWrapper>
          <AppShell>{children}</AppShell>
        </BodyWrapper>
      </body>
    </html>
  );
}
