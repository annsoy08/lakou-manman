"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  MessageCircle,
  Heart,
  ShoppingBag,
  UserPlus,
  Users,
  Trophy,
  Settings,
  Trash2,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";

export default function NotificationsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearAll,
    removeNotification 
  } = useNotifications();

  function getIcon(type) {
    switch (type) {
      case "message":
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case "chess":
        return <Trophy className="h-4 w-4 text-amber-500" />;
      case "request":
        return <UserPlus className="h-4 w-4 text-violet-500" />;
      case "group":
        return <Users className="h-4 w-4 text-amber-500" />;
      case "favorite":
        return <Heart className="h-4 w-4 text-red-500" />;
      case "item":
        return <ShoppingBag className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-slate-500" />;
    }
  }

  function formatTime(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t("justNow");
    if (minutes < 60) return `${minutes} ${t("minutesAgo")}`;
    if (hours < 24) return `${hours} ${t("hoursAgo")}`;
    if (days < 7) return `${days} ${t("daysAgo")}`;
    return new Date(date).toLocaleDateString("fr-HT");
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md rounded-3xl border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <Bell className="mx-auto h-12 w-12 text-slate-300" />
            <h1 className="mt-4 text-xl font-bold">{t("loginToSeeNotifications")}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {t("loginToSeeNotificationsDesc")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">{t("notifications")}</h1>
          <p className="mt-1 text-slate-600">
            {unreadCount} {t("unread")}{unreadCount > 1 ? "s" : ""}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="rounded-xl"
            >
              <Check className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t("markAllAsRead")}</span>
            </Button>
          )}
          
          {notifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              className="rounded-xl text-slate-500"
            >
              <Trash2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t("clearAll")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Notifications list */}
      {notifications.length === 0 ? (
        <Card className="rounded-3xl border-0 bg-gradient-to-br from-slate-50 to-slate-100 p-12 text-center">
          <Bell className="mx-auto h-16 w-16 text-slate-300" />
          <h2 className="mt-4 text-xl font-semibold text-slate-700">{t("noNotifications")}</h2>
          <p className="mt-2 text-slate-500">
            {t("noNotificationsDesc")}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-all hover:shadow-md ${
                !notification.read 
                  ? "border-l-4 border-l-[#9B2335] bg-rose-50/30" 
                  : "border-l-4 border-l-transparent"
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
                    {getIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className={`font-medium ${!notification.read ? "text-slate-900" : "text-slate-700"}`}>
                          {notification.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatTime(notification.timestamp)}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full"
                          onClick={() => removeNotification(notification.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {notification.link && (
                      <Link href={notification.link}>
                        <Button
                          variant="link"
                          size="sm"
                          className="mt-2 h-auto p-0 text-xs text-[#9B2335]"
                        >
                          {t("view")} →
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
