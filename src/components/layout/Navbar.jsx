"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import {
  Home,
  MessageCircle,
  Users,
  Stethoscope,
  Sparkles,
  BookOpen,
  ShoppingBag,
  ShieldCheck,
  LogOut,
  User,
  Heart,
  Bell,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import ThemeSelector from "@/components/layout/ThemeSelector";
import LanguageSelector from "@/components/ui/LanguageSelector";

const navLinks = [
  { href: "/feed", labelKey: "feed", icon: MessageCircle },
  { href: "/groups", labelKey: "groups", icon: Users },
  { href: "/doctor", labelKey: "doctor", icon: Stethoscope },
  { href: "/tools", labelKey: "tools", icon: Sparkles },
  { href: "/guides", labelKey: "guides", icon: BookOpen },
  { href: "/boutique", labelKey: "boutique", icon: ShoppingBag },
  { href: "/messages", labelKey: "messages", icon: MessageCircle },
];

export default function Navbar() {
  const { user, userProfile, isAdmin, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { t } = useLanguage();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-rose-100/50 glass-strong shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 transition-transform hover:scale-[1.02]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#9B2335] to-[#6B1525] shadow-md shadow-rose-300">
            <Home className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            <span className="gradient-text">Lakou</span> Manman
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link key={link.href} href={link.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={`rounded-xl transition-all ${isActive ? "bg-rose-50 text-rose-700 shadow-sm" : "hover:bg-rose-50/50"}`}
                >
                  <Icon className={`mr-1.5 h-4 w-4 ${isActive ? "text-rose-500" : ""}`} />
                  {t(link.labelKey)}
                </Button>
              </Link>
            );
          })}
          {isAdmin && (
            <Link href="/admin">
              <Button variant={pathname === "/admin" ? "secondary" : "ghost"} size="sm" className="rounded-xl">
                <ShieldCheck className="mr-1.5 h-4 w-4" />
                Admin
              </Button>
            </Link>
          )}
        </div>

        {/* Auth area */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <Link href="/notifications">
                <Button variant="ghost" size="icon" className="relative rounded-xl">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#9B2335] p-0 text-xs">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Badge>
                  )}
                </Button>
              </Link>
              <Link href="/favorites">
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <Heart className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/profile">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    {userProfile?.photo && <AvatarImage src={userProfile.photo} />}
                    <AvatarFallback className="text-xs">
                      {getInitials(userProfile?.name || user.displayName || "U")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium md:block">
                    {userProfile?.name || user.displayName}
                  </span>
                </div>
              </Link>
              <LanguageSelector />
              <ThemeSelector />
              <Button variant="ghost" size="icon" onClick={logout} className="rounded-xl">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <LanguageSelector />
              <ThemeSelector />
              <Link href="/login">
                <Button variant="ghost" size="sm" className="rounded-xl">{t("login")}</Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="rounded-xl bg-gradient-to-r from-[#9B2335] to-[#7B1A2C] shadow-sm shadow-rose-300 transition-all hover:shadow-md hover:brightness-110">{t("register")}</Button>
              </Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="border-t border-rose-100/50 glass-strong px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className="w-full justify-start rounded-xl"
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {link.label}
                  </Button>
                </Link>
              );
            })}
            {isAdmin && (
              <Link href="/admin" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" className="w-full justify-start rounded-xl">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Admin
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
