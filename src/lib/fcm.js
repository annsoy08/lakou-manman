import { getMessaging, getToken, deleteToken, onMessage } from "firebase/messaging";
import { getFirebaseApp } from "@/lib/firebase";

let messagingInstance = null;

export function getFirebaseMessaging() {
  if (typeof window === "undefined") return null;
  if (messagingInstance) return messagingInstance;
  try {
    const app = getFirebaseApp();
    if (!app) return null;
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch {
    return null;
  }
}

export async function requestFcmToken() {
  const messaging = getFirebaseMessaging();
  if (!messaging) return null;
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.warn("NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set — push notifications disabled.");
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    return token || null;
  } catch (err) {
    console.error("Error getting FCM token:", err);
    return null;
  }
}

export function onForegroundMessage(callback) {
  const messaging = getFirebaseMessaging();
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
}
