"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "./AuthContext";
import { useLanguage } from "./LanguageContext";
import { requestNotificationPermission, getFCMToken, onMessageListener, showNotification } from "../lib/messaging";
import { saveUserFcmToken } from "../lib/firestore";
import { logTechnicalEvent, trackError } from "@/lib/telemetry";

const NotificationContext = createContext();

function getNotificationData(notification = {}) {
  return notification?.data && typeof notification.data === "object"
    ? notification.data
    : {};
}

function getGroupIdFromLink(link = "") {
  const normalizedLink = String(link || "").trim();
  if (!normalizedLink.startsWith("/groups/")) {
    return "";
  }

  return normalizedLink.slice("/groups/".length).split(/[/?#]/)[0] || "";
}

function extractGroupNotificationData(notification = {}) {
  const rawData = getNotificationData(notification);
  const title = String(notification?.title || "").trim();
  const message = String(notification?.message || "").trim();
  let groupName = String(rawData.groupName || "").trim();
  let authorName = String(rawData.authorName || "").trim();
  let postTitle = String(rawData.postTitle || "").trim();

  if (!groupName) {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.startsWith("nouveau post dans ")) {
      groupName = title.slice("Nouveau post dans ".length).trim();
    } else if (lowerTitle.startsWith("nouvo pòs nan ")) {
      groupName = title.slice("Nouvo pòs nan ".length).trim();
    }
  }

  if (!authorName || !postTitle) {
    const variants = [
      " vient de publier dans le groupe : ",
      " fèk pibliye nan gwoup la : ",
      " vient de publier dans le groupe",
      " fèk pibliye nan gwoup la",
    ];
    const lowerMessage = message.toLowerCase();

    for (const variant of variants) {
      const markerIndex = lowerMessage.indexOf(variant.trim().toLowerCase());
      if (markerIndex === -1) {
        continue;
      }

      if (!authorName) {
        authorName = message.slice(0, markerIndex).trim();
      }

      const titleMarkerIndex = lowerMessage.indexOf(":", markerIndex);
      if (!postTitle && titleMarkerIndex !== -1) {
        postTitle = message.slice(titleMarkerIndex + 1).trim();
      }
      break;
    }
  }

  return {
    authorName,
    groupId: String(rawData.groupId || getGroupIdFromLink(notification?.link) || "").trim(),
    groupName,
    postId: String(rawData.postId || "").trim(),
    postTitle,
  };
}

function relocalizeNotification(notification, notificationText) {
  if (!notification || typeof notification !== "object") {
    return notification;
  }

  const rawData = getNotificationData(notification);

  if (notification.type === "message") {
    const senderName = String(rawData.senderName || "").trim();
    const preview = String(rawData.preview || notification.message || "").trim();
    if (!senderName) {
      return notification;
    }

    return {
      ...notification,
      title: `${notificationText.newMessageFrom} ${senderName}`,
      message: preview,
      data: {
        ...rawData,
        preview,
        senderName,
      },
    };
  }

  if (notification.type === "request") {
    const senderName = String(rawData.senderName || "").trim();
    const requestMessage = String(rawData.requestMessage || notification.message || "").trim() || notificationText.conversationRequestMessage;
    if (!senderName) {
      return notification;
    }

    return {
      ...notification,
      title: `${notificationText.newConversationRequestFrom} ${senderName}`,
      message: requestMessage,
      data: {
        ...rawData,
        requestMessage,
        senderName,
      },
    };
  }

  if (notification.type === "favorite") {
    const itemTitle = String(rawData.itemTitle || "").trim();
    const userName = String(rawData.userName || "").trim();
    if (!itemTitle || !userName) {
      return notification;
    }

    return {
      ...notification,
      title: `${userName} ${notificationText.itemFavoritedTitle}`,
      message: `"${itemTitle}" ${notificationText.itemFavoritedMessage}`,
      data: {
        ...rawData,
        itemTitle,
        userName,
      },
    };
  }

  if (notification.type === "item") {
    const itemTitle = String(rawData.itemTitle || "").trim();
    const userName = String(rawData.userName || "").trim();
    if (!itemTitle || !userName) {
      return notification;
    }

    return {
      ...notification,
      title: `${notificationText.newItem}: ${itemTitle}`,
      message: `${notificationText.publishedBy} ${userName}`,
      data: {
        ...rawData,
        itemTitle,
        userName,
      },
    };
  }

  if (notification.type === "group") {
    const groupData = extractGroupNotificationData(notification);
    const authorName = String(groupData.authorName || "").trim() || "Utilisateur";
    const groupName = String(groupData.groupName || "").trim();
    const groupId = String(groupData.groupId || "").trim();
    const postTitle = String(groupData.postTitle || "").trim();

    return {
      ...notification,
      title: groupName
        ? `${notificationText.newGroupPostIn} ${groupName}`
        : notificationText.groupPostFallbackTitle,
      message: postTitle
        ? `${authorName} ${notificationText.publishedInGroup} : ${postTitle}`
        : `${authorName} ${notificationText.publishedInGroup}`,
      link: groupId ? `/groups/${groupId}` : (notification.link || "/groups"),
      data: {
        ...rawData,
        ...groupData,
        authorName,
        groupId,
        groupName,
        postTitle,
      },
    };
  }

  return notification;
}

function localizeNotificationForCurrentLanguage(notification, notificationText) {
  const localizedNotification = relocalizeNotification(notification, notificationText);
  return localizedNotification && typeof localizedNotification === "object"
    ? localizedNotification
    : notification;
}

function buildForegroundNotificationDedupeKey(payload = {}, notificationType = "", notificationTitle = "", notificationBody = "") {
  const data = payload?.data && typeof payload.data === "object" ? payload.data : {};
  const explicitDedupeKey = String(
    data.dedupeKey || payload?.messageId || data.messageId || data.notificationId || ""
  ).trim();

  if (explicitDedupeKey) {
    return explicitDedupeKey;
  }

  if (notificationType === "group") {
    const groupId = String(data.groupId || "").trim() || "global";
    const postId = String(data.postId || "").trim();
    if (postId) {
      return `group:${groupId}:${postId}`;
    }
  }

  if (notificationType === "request") {
    const requestId = String(data.requestId || data.conversationRequestId || "").trim();
    if (requestId) {
      return `request:${requestId}`;
    }
  }

  if (notificationType === "message") {
    const conversationId = String(data.conversationId || "").trim();
    const preview = String(data.preview || notificationBody || "").trim();
    if (conversationId && preview) {
      return `message:${conversationId}:${preview}`;
    }
  }

  const compactTitle = String(notificationTitle || "").trim();
  const compactBody = String(notificationBody || "").trim();
  if (!compactTitle && !compactBody) {
    return "";
  }

  return `${notificationType || "general"}:${compactTitle}:${compactBody}`;
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [notifications, setNotifications] = useState([]);
  const notificationsRef = useRef([]);
  const notificationText = useMemo(() => (language === "ht"
    ? {
        newMessageFrom: "Nouvo mesaj de",
        newConversationRequestFrom: "Nouvo demann mesaj de",
        itemFavoritedTitle: "te mete atik ou nan favori",
        itemFavoritedMessage: "te ajoute nan favori",
        newItem: "Nouvo atik",
        publishedBy: "Pibliye pa",
        conversationRequestMessage: "vle voye mesaj pou ou",
        newGroupPostIn: "Nouvo pòs nan",
        publishedInGroup: "fèk pibliye nan gwoup la",
        groupPostFallbackTitle: "Nouvo piblikasyon pou gwoup ou a",
        genericTitle: "Nouvo notifikasyon",
        genericMessage: "Ou gen yon nouvo notifikasyon",
      }
    : {
        newMessageFrom: "Nouveau message de",
        newConversationRequestFrom: "Nouvelle demande de message de",
        itemFavoritedTitle: "a ajouté votre article aux favoris",
        itemFavoritedMessage: "a été ajouté aux favoris",
        newItem: "Nouvel article",
        publishedBy: "Publié par",
        conversationRequestMessage: "souhaite vous envoyer un message",
        newGroupPostIn: "Nouveau post dans",
        publishedInGroup: "vient de publier dans le groupe",
        groupPostFallbackTitle: "Nouvelle publication dans votre groupe",
        genericTitle: "Nouvelle notification",
        genericMessage: "Vous avez une nouvelle notification",
      }), [language]);
  const notificationTextRef = useRef(notificationText);
  const currentUserId = String(user?.uid || "").trim();

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    notificationTextRef.current = notificationText;
  }, [notificationText]);

  function normalizeStoredNotifications(value) {
    const notificationsArray = Array.isArray(value)
      ? value
      : ((value && value.notifications) || []);

    const seenDedupeKeys = new Set();

    return notificationsArray
      .filter((notification) => {
        const dedupeKey = String(notification?.dedupeKey || "").trim();

        if (!dedupeKey) {
          return true;
        }

        if (seenDedupeKeys.has(dedupeKey)) {
          return false;
        }

        seenDedupeKeys.add(dedupeKey);
        return true;
      })
      .map((notification) => {
        const localizedNotification = relocalizeNotification(notification, notificationText);
        return {
          ...localizedNotification,
          toastVisible: false,
        };
      });
  }

  const addNotification = useCallback((notification) => {
    const localizedNotification = localizeNotificationForCurrentLanguage(notification, notificationTextRef.current);
    const dedupeKey = String(localizedNotification?.dedupeKey || "").trim();

    if (dedupeKey && notificationsRef.current.some((existingNotification) => existingNotification.dedupeKey === dedupeKey)) {
      return false;
    }

    const newNotification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
      read: false,
      toastVisible: localizedNotification.autoRemove !== false,
      ...localizedNotification,
    };

    setNotifications((prev) => {
      if (dedupeKey && prev.some((existingNotification) => existingNotification.dedupeKey === dedupeKey)) {
        return prev;
      }

      return [newNotification, ...prev];
    });

    return true;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const dismissToast = useCallback((id) => {
    setNotifications(prev =>
      prev.map((notification) =>
        notification.id === id
          ? { ...notification, toastVisible: false }
          : notification
      )
    );
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  useEffect(() => {
    setNotifications((prev) => {
      let hasChanged = false;
      const nextNotifications = prev.map((notification) => {
        const nextNotification = relocalizeNotification(notification, notificationText);
        if (nextNotification !== notification) {
          hasChanged = true;
        }
        return nextNotification;
      });

      return hasChanged ? nextNotifications : prev;
    });
  }, [notificationText]);

  // Notification helpers
  const notifyMessage = useCallback((senderName, message, conversationId) => {
    const currentNotificationText = notificationTextRef.current;
    const preview = message.length > 50 ? message.substring(0, 50) + "..." : message;
    const title = `${currentNotificationText.newMessageFrom} ${senderName}`;

    const didAddNotification = addNotification({
      type: "message",
      title,
      message: preview,
      link: "/messages",
      autoRemove: true,
      data: {
        conversationId,
        preview,
        senderName,
      },
      dedupeKey: conversationId ? `message:${conversationId}:${preview}` : `message:${senderName}:${preview}`,
    });

    if (didAddNotification && typeof document !== "undefined" && document.visibilityState !== "visible") {
      showNotification(title, preview);
    }

  }, [addNotification]);

  const notifyFavorite = useCallback((itemTitle, userName) => {
    const currentNotificationText = notificationTextRef.current;
    addNotification({
      type: "favorite",
      title: `${userName} ${currentNotificationText.itemFavoritedTitle}`,
      message: `"${itemTitle}" ${currentNotificationText.itemFavoritedMessage}`,
      link: "/favorites",
      autoRemove: true,
      data: {
        itemTitle,
        userName,
      },
    });
  }, [addNotification]);

  const notifyItem = useCallback((itemTitle, userName) => {
    const currentNotificationText = notificationTextRef.current;
    addNotification({
      type: "item",
      title: `${currentNotificationText.newItem}: ${itemTitle}`,
      message: `${currentNotificationText.publishedBy} ${userName}`,
      link: "/boutique",
      autoRemove: true,
      data: {
        itemTitle,
        userName,
      },
    });
  }, [addNotification]);

  const notifyConversationRequest = useCallback((senderName, requestMessage = "", requestId = "") => {
    const currentNotificationText = notificationTextRef.current;
    const trimmedSenderName = String(senderName || "").trim() || "Utilisateur";
    const preview = String(requestMessage || "").trim() || currentNotificationText.conversationRequestMessage;
    const trimmedRequestId = String(requestId || "").trim();
    const title = `${currentNotificationText.newConversationRequestFrom} ${trimmedSenderName}`;

    const didAddNotification = addNotification({
      type: "request",
      title,
      message: preview,
      link: "/messages",
      autoRemove: true,
      data: {
        requestId: trimmedRequestId,
        requestMessage: preview,
        senderName: trimmedSenderName,
      },
      dedupeKey: trimmedRequestId ? `request:${trimmedRequestId}` : `request:${trimmedSenderName}:${preview}`,
    });

    if (didAddNotification && typeof document !== "undefined" && document.visibilityState !== "visible") {
      showNotification(title, preview);
    }

  }, [addNotification]);

  const notifyGroupPost = useCallback((authorName, groupName, groupId, postTitle = "", postId = "") => {
    const currentNotificationText = notificationTextRef.current;
    const trimmedGroupName = String(groupName || "").trim();
    const trimmedAuthorName = String(authorName || "").trim() || "Utilisateur";
    const trimmedPostTitle = String(postTitle || "").trim();
    const trimmedPostId = String(postId || "").trim();
    const title = trimmedGroupName
      ? `${currentNotificationText.newGroupPostIn} ${trimmedGroupName}`
      : currentNotificationText.groupPostFallbackTitle;
    const message = trimmedPostTitle
      ? `${trimmedAuthorName} ${currentNotificationText.publishedInGroup} : ${trimmedPostTitle}`
      : `${trimmedAuthorName} ${currentNotificationText.publishedInGroup}`;
    const link = groupId ? `/groups/${groupId}` : "/groups";
    const dedupeKey = trimmedPostId
      ? `group:${groupId || "global"}:${trimmedPostId}`
      : `group:${groupId || "global"}:${trimmedAuthorName}:${trimmedPostTitle}`;

    const didAddNotification = addNotification({
      type: "group",
      title,
      message,
      link,
      autoRemove: true,
      data: {
        authorName: trimmedAuthorName,
        groupId,
        groupName: trimmedGroupName,
        postId: trimmedPostId,
        postTitle: trimmedPostTitle,
      },
      dedupeKey,
    });

    if (didAddNotification && typeof document !== "undefined" && document.visibilityState !== "visible") {
      showNotification(title, message);
    }

  }, [addNotification]);

  const notifySystem = useCallback((title, message, link = null) => {
    addNotification({
      type: "system",
      title,
      message,
      link,
      autoRemove: true,
    });
  }, [addNotification]);

  // Initialiser les notifications en temps réel
  useEffect(() => {
    if (!currentUserId) {
      setNotifications([]);
      return;
    }

    let isActive = true;
    let unsubscribeForegroundMessages = () => {};

    const initNotifications = async () => {
      try {
        const hasPermission = await requestNotificationPermission();
        logTechnicalEvent("notifications_permission_checked", {
          uid: currentUserId,
          granted: hasPermission,
        });

        if (!hasPermission || !isActive) {
          return;
        }

        const token = await getFCMToken();

        if (token && isActive) {
          saveUserFcmToken(currentUserId, token).catch((error) => {
            console.error("Error saving FCM token:", error);
            trackError(error, {
              scope: "notifications_save_fcm_token",
              uid: currentUserId,
            });
          });
        }

        unsubscribeForegroundMessages = await onMessageListener(
          (payload) => {
            if (!isActive) {
              return;
            }

            const { notification, data } = payload;
            const normalizedData = data && typeof data === "object" ? data : {};
            const currentNotificationText = notificationTextRef.current;
            const notificationTitle = notification && notification.title ? notification.title : currentNotificationText.genericTitle;
            const notificationBody = notification && notification.body ? notification.body : currentNotificationText.genericMessage;
            const notificationType = normalizedData.type ? normalizedData.type : "general";
            const notificationLink = String(normalizedData.link || normalizedData.href || "").trim();
            const didAddNotification = addNotification({
              type: notificationType,
              title: notificationTitle,
              message: notificationBody,
              link: notificationLink || null,
              autoRemove: true,
              data: normalizedData,
              dedupeKey: buildForegroundNotificationDedupeKey(payload, notificationType, notificationTitle, notificationBody),
            });

            if (didAddNotification && typeof document !== "undefined" && document.visibilityState !== "visible") {
              showNotification(
                notificationTitle,
                notificationBody
              );
            }

            logTechnicalEvent("notifications_foreground_message", {
              uid: currentUserId,
              type: notificationType,
            });
          },
          (error) => {
            console.error("Error listening to foreground messages:", error);
            trackError(error, {
              scope: "notifications_foreground_listener",
              uid: currentUserId,
            });
          }
        );
      } catch (error) {
        trackError(error, {
          scope: "notifications_init",
          uid: currentUserId,
        });
      }
    };

    initNotifications();

    if (typeof window !== "undefined") {
      try {
        const savedNotifications = window.localStorage.getItem(`notifications_${currentUserId}`);
        if (savedNotifications) {
          const parsed = JSON.parse(savedNotifications);
          setNotifications(normalizeStoredNotifications(parsed));
        } else {
          setNotifications([]);
        }
      } catch (error) {
        console.error("Error parsing notifications:", error);
        trackError(error, {
          scope: "notifications_parse_local_storage",
          uid: currentUserId,
        });
        setNotifications([]);
      }
    }

    return () => {
      isActive = false;
      unsubscribeForegroundMessages();
    };
  }, [addNotification, currentUserId]);

  // Save to localStorage whenever notifications change (client-side only)
  useEffect(() => {
    if (typeof window !== "undefined" && currentUserId) {
      try {
        window.localStorage.setItem(`notifications_${currentUserId}`, JSON.stringify({
          notifications: notifications.slice(0, 50), // Keep only last 50
          unreadCount,
        }));
      } catch (e) {
        console.error("Error saving notifications to localStorage:", e);
        trackError(e, {
          scope: "notifications_persist_local_storage",
          uid: currentUserId,
        });
      }
    }
  }, [currentUserId, notifications, unreadCount]);

  const contextValue = useMemo(() => ({
    notifications,
    unreadCount,
    addNotification,
    removeNotification,
    dismissToast,
    markAsRead,
    markAllAsRead,
    clearAll,
    notifyMessage,
    notifyFavorite,
    notifyItem,
    notifyConversationRequest,
    notifyGroupPost,
    notifySystem,
  }), [
    notifications,
    unreadCount,
    addNotification,
    removeNotification,
    dismissToast,
    markAsRead,
    markAllAsRead,
    clearAll,
    notifyMessage,
    notifyFavorite,
    notifyItem,
    notifyConversationRequest,
    notifyGroupPost,
    notifySystem,
  ]);

  return (
    <NotificationContext.Provider
      value={contextValue}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}
