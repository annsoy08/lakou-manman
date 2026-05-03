"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import AppErrorBoundary from "@/components/app/AppErrorBoundary";
import {
  getAppShellRedirectTarget,
  isAuthRoutePath,
  isMarketingRoutePath,
  isProtectedRoutePath,
} from "@/lib/app-shell-routing.mjs";
import Navbar from "@/components/layout/Navbar";
import PromoBanner from "@/components/layout/PromoBanner";
import NotificationsWrapper from "@/components/layout/NotificationsWrapper";
import GlobalCallBanner from "@/components/layout/GlobalCallBanner";
import WelcomeBanner from "@/components/layout/WelcomeBanner";
import Footer from "@/components/layout/Footer";
import MarketingHeader from "@/components/layout/MarketingHeader";
import LanguageSelector from "@/components/ui/LanguageSelector";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { updateUserPresence } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import PushNotificationSetup from "@/components/layout/PushNotificationSetup";

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const normalizedPathname = typeof pathname === "string" ? pathname : "";
  const isAuthRoute = isAuthRoutePath(pathname);
  const isMarketingRoute = isMarketingRoutePath(pathname);
  const isProtectedRoute = isProtectedRoutePath(pathname);
  const isOnboardingRoute = pathname === "/onboarding";
  const showBackToMain = isProtectedRoute && pathname !== "/feed" && !isOnboardingRoute;
  const fallbackBackPath = normalizedPathname.startsWith("/groups/") ? "/groups" : "/feed";
  const redirectTarget = getAppShellRedirectTarget({
    pathname,
    user,
    userProfile,
    authLoading,
  });
  const authRouteHeaderClassName = "border-b border-rose-100 bg-white/95 backdrop-blur";

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackBackPath);
  };

  useEffect(() => {
    if (redirectTarget && redirectTarget !== pathname) {
      router.replace(redirectTarget);
    }
  }, [pathname, redirectTarget, router]);

  useEffect(() => {
    if (!user?.uid) return;
    updateUserPresence(user.uid, { isOnline: true }).catch(() => {});
    const intervalId = setInterval(() => {
      updateUserPresence(user.uid, { isOnline: true }).catch(() => {});
    }, 45000);
    return () => {
      clearInterval(intervalId);
      updateUserPresence(user.uid, { isOnline: false }).catch(() => {});
    };
  }, [user?.uid]);

  if (isAuthRoute) {
    return (
      <>
        <div className={authRouteHeaderClassName}>
          <div className="app-shell-container flex justify-end py-3">
            <AppErrorBoundary fallback={null}>
              <LanguageSelector />
            </AppErrorBoundary>
          </div>
        </div>
        <main>{children}</main>
      </>
    );
  }

  if (isMarketingRoute && !user) {
    return (
      <>
        <AppErrorBoundary fallback={null}>
          <MarketingHeader />
        </AppErrorBoundary>
        <main>{children}</main>
        <AppErrorBoundary fallback={null}>
          <Footer />
        </AppErrorBoundary>
      </>
    );
  }

  if (authLoading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center text-sm text-slate-500">
        {t("loading")}
      </main>
    );
  }

  if (!user) {
    if (redirectTarget) {
      return (
        <main className="flex min-h-[70vh] items-center justify-center text-sm text-slate-500">
          {t("loading")}
        </main>
      );
    }

    return null;
  }

  return (
    <>
      <AppErrorBoundary fallback={null}>
        <PushNotificationSetup />
      </AppErrorBoundary>
      <AppErrorBoundary fallback={null}>
        <WelcomeBanner />
      </AppErrorBoundary>
      <AppErrorBoundary fallback={null}>
        <Navbar />
      </AppErrorBoundary>
      <AppErrorBoundary fallback={null}>
        <PromoBanner />
      </AppErrorBoundary>
      <main className="app-page-shell">
        {showBackToMain && (
          <div className="mb-6">
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              onClick={handleBack}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("back")}
            </Button>
          </div>
        )}
        {children}
      </main>
      <AppErrorBoundary fallback={null}>
        <GlobalCallBanner />
      </AppErrorBoundary>
      <AppErrorBoundary fallback={null}>
        <NotificationsWrapper />
      </AppErrorBoundary>
      <AppErrorBoundary fallback={null}>
        <Footer />
      </AppErrorBoundary>
    </>
  );
}
