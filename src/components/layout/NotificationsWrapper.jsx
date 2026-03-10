"use client";

import { useNotifications } from "@/contexts/NotificationContext";
import { NotificationContainer } from "@/components/ui/NotificationToast";

export default function NotificationsWrapper() {
  const { notifications } = useNotifications();
  
  return (
    <NotificationContainer notifications={notifications.filter(n => n.autoRemove !== false)} />
  );
}
