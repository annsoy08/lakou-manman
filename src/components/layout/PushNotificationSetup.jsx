"use client";

import { useEffect } from "react";
import { getDoc, doc } from "firebase/firestore";
import { deleteToken, getToken } from "firebase/messaging";
import { useAuth } from "@/contexts/AuthContext";
import { onForegroundMessage } from "@/lib/fcm";
import { saveFcmToken } from "@/lib/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { getFirebaseMessaging } from "@/lib/fcm";

export default function PushNotificationSetup() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.uid) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission === "denied") return;

    let unsub = () => {};

    async function setup() {
      try {
        console.log("[FCM] Starting push setup for", user.uid);
        await navigator.serviceWorker.register("/api/fcm-sw", { scope: "/" });
        await navigator.serviceWorker.ready;
        console.log("[FCM] Service worker ready");

        if (Notification.permission !== "granted") {
          const perm = await Notification.requestPermission();
          console.log("[FCM] Permission:", perm);
          if (perm !== "granted") return;
        } else {
          console.log("[FCM] Permission already granted");
        }

        console.log("[FCM] VAPID key present:", !!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY);
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        const registration = await navigator.serviceWorker.ready;
        const messaging = getFirebaseMessaging();

        const getOrRefreshToken = async (forceRefresh = false) => {
          if (forceRefresh) {
            await deleteToken(messaging).catch(() => {});
            const sub = await registration.pushManager.getSubscription().catch(() => null);
            if (sub) await sub.unsubscribe().catch(() => {});
          }
          return getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
        };

        let token = await getOrRefreshToken(false);

        if (token) {
          const db = getFirebaseDb();
          const snap = await getDoc(doc(db, "fcmTokens", user.uid)).catch(() => null);
          const storedTokens = snap?.exists() ? (snap.data()?.tokens || {}) : {};
          if (!storedTokens[token]) {
            console.log("[FCM] Token not in Firestore, forcing refresh");
            token = await getOrRefreshToken(true);
          }
        }

        console.log("[FCM] Token:", token ? token.slice(0, 20) + "..." : "null");
        if (token) await saveFcmToken(user.uid, token);
        console.log("[FCM] Token saved to Firestore");

        unsub = onForegroundMessage((payload) => {
          const title = payload.notification?.title || "Lakou Manman";
          const body = payload.notification?.body || "";
          if (Notification.permission !== "granted") return;
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(title, {
              body,
              icon: "/logo-lakou-manman.png",
              badge: "/logo-lakou-manman.png",
              data: payload.data || {},
            });
          });
        });
      } catch (e) {
        console.warn("Push notification setup failed:", e?.message);
      }
    }

    setup();
    return () => unsub();
  }, [user?.uid]);

  return null;
}
