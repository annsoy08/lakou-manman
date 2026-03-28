"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { NotificationContainer } from "@/components/ui/NotificationToast";
import { useMessageListener } from "@/hooks/useMessageListener";
import { subscribeToGroupPosts, subscribeToGroupPostsForGroupIds, subscribeToUserConversationRequests, subscribeToUserGroups } from "@/lib/firestore";
import { trackError } from "@/lib/telemetry";

function buildGroupIdsSignature(groups = []) {
  return (Array.isArray(groups) ? groups : [])
    .map((group) => String(group?.id || "").trim())
    .filter(Boolean)
    .sort()
    .join("|");
}

export default function NotificationsWrapper() {
  const { user } = useAuth();
  const { notifications, dismissToast, notifyConversationRequest, notifyGroupPost } = useNotifications();
  const knownRequestIdsRef = useRef(new Set());
  const knownGroupPostIdsRef = useRef(new Map());
  const hasLoadedRequestsRef = useRef(false);
  const groupPostUnsubscribersRef = useRef([]);
  const groupsByIdRef = useRef(new Map());
  const activeGroupIdsSignatureRef = useRef("");
  const currentUserId = user && user.uid ? user.uid : "";
  useMessageListener();

  useEffect(() => {
    const cleanupGroupPostSubscriptions = () => {
      groupPostUnsubscribersRef.current.forEach((unsubscribe) => {
        if (typeof unsubscribe === "function") {
          unsubscribe();
        }
      });
      groupPostUnsubscribersRef.current = [];
    };

    if (!currentUserId) {
      cleanupGroupPostSubscriptions();
      knownGroupPostIdsRef.current = new Map();
      groupsByIdRef.current = new Map();
      activeGroupIdsSignatureRef.current = "";
      return;
    }

    const unsubscribeGroups = subscribeToUserGroups(
      currentUserId,
      (nextGroups) => {
        const groupsById = new Map(nextGroups.map((group) => [group.id, group]));
        const activeGroupIds = new Set(groupsById.keys());
        const nextGroupIdsSignature = buildGroupIdsSignature(nextGroups);

        groupsByIdRef.current = groupsById;

        Array.from(knownGroupPostIdsRef.current.keys()).forEach((groupId) => {
          if (!activeGroupIds.has(groupId)) {
            knownGroupPostIdsRef.current.delete(groupId);
          }
        });

        if (nextGroupIdsSignature === activeGroupIdsSignatureRef.current) {
          return;
        }

        activeGroupIdsSignatureRef.current = nextGroupIdsSignature;
        cleanupGroupPostSubscriptions();

        const handleGroupPosts = (postsByGroupId) => {
          Object.entries(postsByGroupId || {}).forEach(([groupId, groupPosts]) => {
            const group = groupsByIdRef.current.get(groupId);
            if (!group) {
              return;
            }

            const nextPosts = Array.isArray(groupPosts) ? groupPosts : [];
            const previousIds = knownGroupPostIdsRef.current.get(groupId);
            const nextIds = new Set(nextPosts.map((post) => post.id));

            if (!previousIds) {
              knownGroupPostIdsRef.current.set(groupId, nextIds);
              return;
            }

            nextPosts.forEach((post) => {
              if (!previousIds.has(post.id) && post.authorId !== currentUserId) {
                notifyGroupPost(
                  post.authorName || "Utilisateur",
                  group.name || group.title || "",
                  group.id,
                  post.title || post.body || "",
                  post.id
                );
              }
            });

            knownGroupPostIdsRef.current.set(groupId, nextIds);
          });
        };

        const subscribeIndividually = () => {
          cleanupGroupPostSubscriptions();
          groupPostUnsubscribersRef.current = Array.from(groupsByIdRef.current.values()).map((group) => subscribeToGroupPosts(
            group.id,
            (nextPosts) => {
              handleGroupPosts({ [group.id]: nextPosts });
            },
            (error) => {
              trackError(error, {
                scope: "notifications_group_post_listener",
                uid: currentUserId,
                groupId: group.id,
              });
            }
          ));
        };

        if (groupsById.size === 0) {
          groupPostUnsubscribersRef.current = [];
          return;
        }

        let hasFallenBackToPerGroup = false;
        groupPostUnsubscribersRef.current = [subscribeToGroupPostsForGroupIds(
          Array.from(groupsByIdRef.current.keys()),
          handleGroupPosts,
          (error) => {
            trackError(error, {
              scope: "notifications_group_post_listener_batch",
              uid: currentUserId,
              groupIds: Array.from(groupsByIdRef.current.keys()),
            });

            if (hasFallenBackToPerGroup) {
              return;
            }

            hasFallenBackToPerGroup = true;
            subscribeIndividually();
          }
        )];
      },
      (error) => {
        trackError(error, {
          scope: "notifications_user_groups_listener",
          uid: currentUserId,
        });
      }
    );

    return () => {
      if (typeof unsubscribeGroups === "function") {
        unsubscribeGroups();
      }
      cleanupGroupPostSubscriptions();
    };
  }, [currentUserId, notifyGroupPost]);

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
