import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { getFirebaseApp } from "./firebase";
import { trackError } from "./telemetry";

// Demander la permission pour les notifications
export async function requestNotificationPermission() {
  try {
    if (typeof Notification === "undefined") {
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission === "denied") {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    trackError(error, { scope: "messaging_request_notification_permission" });
    return false;
  }
}

// Obtenir le token FCM
export async function getFCMToken() {
  try {
    const firebaseApp = getFirebaseApp();
    const supported = await isSupported();
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

    if (!firebaseApp || !supported || !vapidKey) {
      return null;
    }

    const messaging = getMessaging(firebaseApp);
    const token = await getToken(messaging, {
      vapidKey
    });
    if (token) {
      // Sauvegarder le token dans localStorage
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("fcmToken", token);
        } catch (error) {
          trackError(error, { scope: "messaging_persist_fcm_token" });
        }
      }
      return token;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    trackError(error, { scope: "messaging_get_fcm_token" });
    return null;
  }
}

// Écouter les messages en premier plan
export async function onMessageListener(onPayload, onError) {
  try {
    const firebaseApp = getFirebaseApp();
    const supported = await isSupported();

    if (!firebaseApp || !supported) {
      throw new Error("Firebase messaging not available");
    }

    const messaging = getMessaging(firebaseApp);

    return onMessage(messaging, (payload) => {
      onPayload?.(payload);
    });
  } catch (error) {
    trackError(error, { scope: "messaging_on_message_listener" });
    onError?.(error);
    return () => {};
  }
}

// Afficher une notification
export function showNotification(title, body, icon = '/logo-lakou-manman.svg') {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return;
  }

  try {
    new Notification(title, {
      body,
      icon,
      badge: '/logo-lakou-manman.svg',
      tag: 'lakou-manman'
    });
  } catch (error) {
    trackError(error, { scope: "messaging_show_notification" });
  }
}
