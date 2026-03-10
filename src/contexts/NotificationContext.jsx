"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  function addNotification(notification) {
    const newNotification = {
      id: Date.now(),
      timestamp: new Date(),
      read: false,
      ...notification,
    };

    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Auto-remove after 5 seconds for toast notifications
    if (notification.autoRemove !== false) {
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, 5000);
    }
  }

  function removeNotification(id) {
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }

  function markAsRead(id) {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }

  function markAllAsRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  function clearAll() {
    setNotifications([]);
    setUnreadCount(0);
  }

  // Notification helpers
  function notifyMessage(senderName, message, conversationId) {
    addNotification({
      type: "message",
      title: `Nouvo mesaj de ${senderName}`,
      message: message.length > 50 ? message.substring(0, 50) + "..." : message,
      link: "/messages",
      autoRemove: true,
    });
  }

  function notifyFavorite(itemTitle, userName) {
    addNotification({
      type: "favorite",
      title: `${userName} amelye atik ou`,
      message: `"${itemTitle}" te ajoute nan favoris`,
      link: "/favorites",
      autoRemove: true,
    });
  }

  function notifyItem(itemTitle, userName) {
    addNotification({
      type: "item",
      title: `Nouvo atik: ${itemTitle}`,
      message: `Pibliye pa ${userName}`,
      link: "/boutique",
      autoRemove: true,
    });
  }

  function notifySystem(title, message, link = null) {
    addNotification({
      type: "system",
      title,
      message,
      link,
      autoRemove: true,
    });
  }

  // Load unread count from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window !== "undefined" && user) {
      try {
        const saved = localStorage.getItem(`notifications_${user.uid}`);
        if (saved) {
          const data = JSON.parse(saved);
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (e) {
        console.error("Error loading notifications from localStorage:", e);
      }
    }
  }, [user]);

  // Save to localStorage whenever notifications change (client-side only)
  useEffect(() => {
    if (typeof window !== "undefined" && user) {
      try {
        localStorage.setItem(`notifications_${user.uid}`, JSON.stringify({
          notifications: notifications.slice(0, 50), // Keep only last 50
          unreadCount,
        }));
      } catch (e) {
        console.error("Error saving notifications to localStorage:", e);
      }
    }
  }, [notifications, unreadCount, user]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        removeNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
        notifyMessage,
        notifyFavorite,
        notifyItem,
        notifySystem,
      }}
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
