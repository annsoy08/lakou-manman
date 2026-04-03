"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { markMessagesAsDelivered, subscribeToUserConversations } from "@/lib/firestore";
import { logTechnicalEvent, trackError } from "@/lib/telemetry";

export function useMessageListener() {
  const { user } = useAuth();
  const { notifyMessage } = useNotifications();
  const pathname = usePathname();
  const unsubscribeFunctions = useRef([]);
  const retryTimeoutRef = useRef(null);
  const unreadCountsRef = useRef(new Map());
  const hasLoadedInitialSnapshotRef = useRef(false);
  const pathnameRef = useRef(typeof pathname === "string" ? pathname : "");
  const [isBrowserOnline, setIsBrowserOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [listenerPaused, setListenerPaused] = useState(false);

  useEffect(() => {
    pathnameRef.current = typeof pathname === "string" ? pathname : "";
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsBrowserOnline(true);
      setListenerPaused(false);
      logTechnicalEvent("message_listener_online", {
        pathname: pathnameRef.current,
      });
    };
    const handleOffline = () => {
      setIsBrowserOnline(false);
      logTechnicalEvent("message_listener_offline", {
        pathname: pathnameRef.current,
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    unsubscribeFunctions.current.forEach((unsub) => unsub());
    unsubscribeFunctions.current = [];
    unreadCountsRef.current = new Map();
    hasLoadedInitialSnapshotRef.current = false;

    if (!user || !isBrowserOnline || listenerPaused) return;

    let effectCancelled = false;

    const pauseListeners = () => {
      unsubscribeFunctions.current.forEach((unsub) => unsub());
      unsubscribeFunctions.current = [];
      setListenerPaused(true);
      logTechnicalEvent("message_listener_paused", {
        uid: user.uid,
        pathname: pathnameRef.current,
        online: isBrowserOnline,
      });

      if (retryTimeoutRef.current && typeof window !== "undefined") {
        window.clearTimeout(retryTimeoutRef.current);
      }

      if (typeof window !== "undefined") {
        retryTimeoutRef.current = window.setTimeout(() => {
          retryTimeoutRef.current = null;
          setListenerPaused(false);
          logTechnicalEvent("message_listener_resume_attempt", {
            uid: user.uid,
            pathname: pathnameRef.current,
          });
        }, 15000);
      }
    };

    const startConversationsListener = async () => {
      try {
        if (typeof user.getIdToken === "function") {
          await user.getIdToken();
        }
      } catch (_tokenError) {
        // proceed anyway - Firestore SDK will retry when connection is ready
      }

      if (effectCancelled) return;

      // Listen for new messages in conversations
      const unsubscribeConversations = subscribeToUserConversations(
        user.uid,
        (conversations) => {
          const nextUnreadCounts = new Map();

          conversations.forEach((conversation) => {
            const unreadCount = Number(conversation?.unreadCount?.[user.uid] || 0);
            const previousUnreadCount = Number(unreadCountsRef.current.get(conversation.id) || 0);
            nextUnreadCounts.set(conversation.id, unreadCount);

            if (!hasLoadedInitialSnapshotRef.current) {
              return;
            }

            if (unreadCount <= previousUnreadCount) {
              return;
            }

            if (!conversation.lastMessage || conversation.lastMessageSenderId === user.uid) {
              return;
            }

            markMessagesAsDelivered(conversation.id, user.uid).catch(() => {});

            if (pathnameRef.current !== "/messages") {
              const senderName = [
                conversation.lastMessageSenderName,
                conversation.participantNames?.[conversation.lastMessageSenderId],
              ].find((value) => typeof value === "string" && value.trim()) || "Quelqu'un";

              notifyMessage(
                senderName,
                conversation.lastMessage || "Vous a envoyé un message",
                conversation.id
              );
            }
          });

          unreadCountsRef.current = nextUnreadCounts;
          hasLoadedInitialSnapshotRef.current = true;
        },
        (error) => {
          trackError(error, {
            scope: "message_listener_conversations_snapshot",
            uid: user.uid,
          });
          pauseListeners();
        }
      );

      unsubscribeFunctions.current.push(unsubscribeConversations);
    };

    startConversationsListener();

    return () => {
      effectCancelled = true;
      if (retryTimeoutRef.current && typeof window !== "undefined") {
        window.clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      unsubscribeFunctions.current.forEach((unsub) => unsub());
      unsubscribeFunctions.current = [];
    };
  }, [user, notifyMessage, isBrowserOnline, listenerPaused]);
}
