import "./globals.css";
import BodyWrapper from "@/components/layout/BodyWrapper";
import Navbar from "@/components/layout/Navbar";
import PromoBanner from "@/components/layout/PromoBanner";
import WelcomeBanner from "@/components/layout/WelcomeBanner";
import NotificationsWrapper from "@/components/layout/NotificationsWrapper";

export const metadata = {
  title: "Lakou Manman — Kominote manman ayisyèn",
  description: "Yon platfòm entèaktif pou manman ayisyèn jwenn konsèy, sipò, epi pataje eksperyans yo — ak kominote, resous pratik, kontni validé, ak yon vizyon pou tounen yon vrè rezo sosyal pou manman.",
};

function LayoutContent({ children }) {
  return (
    <>
      <Navbar />
      <PromoBanner />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
      <NotificationsWrapper />
    </>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="ht">
      <body>
        <BodyWrapper>
          <LayoutContent>{children}</LayoutContent>
        </BodyWrapper>
      </body>
    </html>
  );
}
