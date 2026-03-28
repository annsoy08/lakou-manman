import "./globals.css";
import BodyWrapper from "@/components/layout/BodyWrapper";
import AppShell from "@/components/layout/AppShell";

export const metadata = {
  title: "Lakou Manman - Kominote manman ayisyen",
  description: "Yon platfom enteraktif pou manman ayisyen jwenn konsey, sipor, epi pataje eksperyans yo ak kominote, resous pratik, kontni valide, ak yon vizyon pou tounen yon vre rezo sosyal pou manman.",
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
