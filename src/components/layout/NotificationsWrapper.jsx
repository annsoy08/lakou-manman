"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { NotificationContainer } from "@/components/ui/NotificationToast";
import { useMessageListener } from "@/hooks/useMessageListener";
import { subscribeToUserConversationRequests } from "@/lib/firestore";
import { trackError } from "@/lib/telemetry";

export default function NotificationsWrapper() {
  const { user } = useAuth();
  const { notifications, dismissToast, notifyConversationRequest } = useNotifications();
  const knownRequestIdsRef = useRef(new Set());
  const hasLoadedRequestsRef = useRef(false);
  const currentUserId = user && user.uid ? user.uid : "";
  useMessageListener();

  useEffect(() => {
    if (!currentUserId) {
      knownRequestIdsRef.current = new Set();
      hasLoadedRequestsRef.current = false;
      return;
    }

    return subscribeToUserConversationRequests(
      currentUserId,
      (nextRequests) => {
        const incomingRequests = nextRequests.filter((requestItem) => requestItem.recipientId === currentUserId);
        const nextIds = new Set(incomingRequests.map((requestItem) => requestItem.id));

        if (!hasLoadedRequestsRef.current) {
          hasLoadedRequestsRef.current = true;
          knownRequestIdsRef.current = nextIds;
          return;
        }

        incomingRequests.forEach((requestItem) => {
          if (!knownRequestIdsRef.current.has(requestItem.id)) {
            notifyConversationRequest(requestItem.requesterName || "Quelqu'un", requestItem.message || "", requestItem.id);
          }
        });

        knownRequestIdsRef.current = nextIds;
      },
      (error) => {
        trackError(error, {
          scope: "notifications_conversation_request_listener",
          uid: currentUserId,
        });
      }
    );
  }, [currentUserId, notifyConversationRequest]);
  
  return (
    <NotificationContainer
      notifications={notifications.filter((notification) => notification.autoRemove !== false && notification.toastVisible)}
      onClose={dismissToast}
    />
  );
}
