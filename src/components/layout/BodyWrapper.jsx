"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import WelcomeBanner from "@/components/layout/WelcomeBanner";
import Footer from "@/components/layout/Footer";

function ThemedBody({ children }) {
  const { currentTheme } = useTheme();

  return (
    <div
      className="min-h-screen text-slate-900 antialiased transition-colors duration-500"
      style={{ backgroundColor: currentTheme.color }}
    >
      {children}
    </div>
  );
}

export default function BodyWrapper({ children }) {
  return (
    <AuthProvider>
      <LanguageProvider>
        <WelcomeBanner />
        <ThemeProvider>
          <NotificationProvider>
            <ThemedBody>
              {children}
              <Footer />
            </ThemedBody>
          </NotificationProvider>
        </ThemeProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
