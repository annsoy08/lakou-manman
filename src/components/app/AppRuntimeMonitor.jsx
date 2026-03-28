"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/contexts/NotificationContext";
import {
  flushTelemetry,
  logTechnicalEvent,
  setTelemetryUserContext,
  trackError,
  trackMetric,
  trackPageView,
} from "@/lib/telemetry";

export default function AppRuntimeMonitor() {
  const pathname = usePathname();
  const { user, userProfile } = useAuth();
  const { language } = useLanguage();
  const { notifySystem } = useNotifications();
  const [isOnline, setIsOnline] = useState(true);
  const lastPathRef = useRef("");
  const hasInitializedRef = useRef(false);

  const markRuntimeReadyLogged = () => {
    if (typeof window === "undefined") {
      return false;
    }

    if (window.__lakouRuntimeMonitorReadyLogged) {
      return true;
    }

    window.__lakouRuntimeMonitorReadyLogged = true;
    return false;
  };

  const text = language === "ht"
    ? {
        offlineTitle: "Mòd offline",
        offlineMessage: "Kèk aksyon ka tann jiskaske koneksyon an retounen.",
        onlineTitle: "Koneksyon retounen",
        onlineMessage: "Lakou Manman rekonekte. Nou reprann senkronizasyon an.",
        offlineBanner: "Ou offline. Chanjman yo ka pran reta.",
      }
    : {
        offlineTitle: "Mode hors ligne",
        offlineMessage: "Certaines actions peuvent attendre le retour de la connexion.",
        onlineTitle: "Connexion rétablie",
        onlineMessage: "Lakou Manman est reconnecté. La synchronisation reprend.",
        offlineBanner: "Vous êtes hors ligne. Certaines actions peuvent être retardées.",
      };

  useEffect(() => {
    setTelemetryUserContext({
      userId: (user && user.uid) || "",
      role: (userProfile && userProfile.role) || "",
      isAuthenticated: Boolean(user),
    });
  }, [user, userProfile && userProfile.role]);

  useEffect(() => {
    if (!pathname || lastPathRef.current === pathname) {
      return;
    }

    trackPageView(pathname, {
      authenticated: Boolean(user),
      role: (userProfile && userProfile.role) || "",
    });

    if (typeof performance !== "undefined" && typeof performance.getEntriesByType === "function") {
      const navigationEntries = performance.getEntriesByType("navigation");
      const navigationEntry = Array.isArray(navigationEntries) ? navigationEntries[0] : null;
      if (navigationEntry && navigationEntry.duration) {
        trackMetric("navigation_duration_ms", Math.round(navigationEntry.duration), {
          pathname,
        });
      }
    }

    lastPathRef.current = pathname;
  }, [pathname, user, userProfile && userProfile.role]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      logTechnicalEvent("browser_online", { pathname: window.location.pathname });
      flushTelemetry("browser_online");
      if (hasInitializedRef.current) {
        notifySystem(text.onlineTitle, text.onlineMessage);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      logTechnicalEvent("browser_offline", { pathname: window.location.pathname });
      if (hasInitializedRef.current) {
        notifySystem(text.offlineTitle, text.offlineMessage);
      }
    };

    const handleWindowError = (event) => {
      trackError((event && event.error) || new Error((event && event.message) || "window_error"), {
        scope: "window_error",
        pathname: window.location.pathname,
        source: (event && event.filename) || "",
        lineno: (event && event.lineno) || 0,
        colno: (event && event.colno) || 0,
      });
    };

    const handleUnhandledRejection = (event) => {
      trackError(event && event.reason instanceof Error ? event.reason : new Error(String((event && event.reason) || "unhandled_rejection")), {
        scope: "unhandled_rejection",
        pathname: window.location.pathname,
      });
    };

    const handleVisibilityChange = () => {
      logTechnicalEvent("visibility_change", {
        state: document.visibilityState,
        pathname: window.location.pathname,
      });

      if (document.visibilityState === "hidden") {
        flushTelemetry("visibility_hidden");
      } else if (document.visibilityState === "visible" && navigator.onLine) {
        flushTelemetry("visibility_visible");
      }
    };

    const handlePageHide = () => {
      flushTelemetry("pagehide");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const telemetryInterval = window.setInterval(() => {
      if (navigator.onLine && document.visibilityState === "visible") {
        flushTelemetry("periodic_interval");
      }
    }, 30000);

    hasInitializedRef.current = true;
    if (!markRuntimeReadyLogged()) {
      logTechnicalEvent("runtime_monitor_ready", {
        pathname: window.location.pathname,
        online: navigator.onLine,
      });
    }
    if (navigator.onLine) {
      flushTelemetry("runtime_monitor_ready");
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(telemetryInterval);
    };
  }, [notifySystem, text.offlineMessage, text.offlineTitle, text.onlineMessage, text.onlineTitle]);

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-0 z-[70] border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-800">
      {text.offlineBanner}
    </div>
  );
}
