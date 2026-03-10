"use client";

import { useState, useEffect } from "react";
import { Bell, X, MessageCircle, Heart, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

export default function NotificationToast({ notification, onClose }) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  function getIcon(type) {
    switch (type) {
      case "message":
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case "favorite":
        return <Heart className="h-4 w-4 text-red-500" />;
      case "item":
        return <ShoppingBag className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-slate-500" />;
    }
  }

  function handleClick() {
    if (notification.link) {
      router.push(notification.link);
    }
    onClose();
  }

  if (!visible) return null;

  return (
    <div
      className={`fixed top-20 right-4 z-50 w-80 rounded-2xl border bg-white shadow-lg transition-all duration-300 ${
        visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
          {getIcon(notification.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{notification.title}</h4>
          <p className="mt-1 text-xs text-slate-600 line-clamp-2">
            {notification.message}
          </p>
          {notification.link && (
            <Button
              variant="link"
              size="sm"
              className="mt-2 h-auto p-0 text-xs text-[#9B2335]"
              onClick={handleClick}
            >
              Wè →
            </Button>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-full"
          onClick={onClose}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export function NotificationContainer({ notifications }) {
  return (
    <div className="fixed top-20 right-4 z-50 space-y-2">
      {notifications.map((notification, index) => (
        <NotificationToast
          key={`${notification.id}-${index}`}
          notification={notification}
          onClose={() => {
            // Remove notification logic would go here
          }}
        />
      ))}
    </div>
  );
}
