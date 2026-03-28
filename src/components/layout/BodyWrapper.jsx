"use client";

import AppErrorBoundary from "@/components/app/AppErrorBoundary";
import AppRuntimeMonitor from "@/components/app/AppRuntimeMonitor";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { NotificationProvider } from "@/contexts/NotificationContext";

function PlainBody({ children }) {
  const { currentTheme } = useTheme();

  return (
    <div
      className="relative min-h-screen text-slate-900 antialiased transition-colors duration-300"
      style={{
        backgroundColor: currentTheme.color,
        backgroundImage: `radial-gradient(circle at top right, ${currentTheme.surface} 0%, transparent 42%), radial-gradient(circle at bottom left, ${currentTheme.surface} 0%, transparent 36%)`,
      }}
    >
      {children}
    </div>
  );
}

export default function BodyWrapper({ children }) {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
          <ThemeProvider>
            <NotificationProvider>
              <AppErrorBoundary fallback={null}>
                <AppRuntimeMonitor />
              </AppErrorBoundary>
              <PlainBody>{children}</PlainBody>
            </NotificationProvider>
          </ThemeProvider>
        </LanguageProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}
