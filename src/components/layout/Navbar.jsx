"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInitials, resolveProfilePhoto, resolveUserDisplayName } from "@/lib/utils";
import {
  MessageCircle,
  Users,
  Stethoscope,
  BookOpen,
  ShoppingBag,
  Gamepad2,
  ShieldCheck,
  LogOut,
  User,
  Heart,
  Bell,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ThemeSelector from "@/components/layout/ThemeSelector";
import LanguageSelector from "@/components/ui/LanguageSelector";

const navLinks = [
  { href: "/feed", labelKey: "feed", icon: MessageCircle },
  { href: "/groups", labelKey: "groups", icon: Users },
  { href: "/sante", labelKey: "health", icon: Stethoscope, matchPaths: ["/sante", "/pediatre", "/gynecologie", "/psychologie"] },
  { href: "/guides", labelKey: "guides", icon: BookOpen },
  { href: "/games", labelKey: "games", icon: Gamepad2 },
  { href: "/boutique", labelKey: "boutique", icon: ShoppingBag },
  { href: "/messages", labelKey: "messages", icon: MessageCircle },
];

export default function Navbar() {
  const { user, userProfile, isAdmin, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const displayName = resolveUserDisplayName(userProfile, user, t("profile"));
  const displayEmail = user && user.email ? user.email : "";
  const profilePhoto = resolveProfilePhoto(
    userProfile && userProfile.photo ? userProfile.photo : "",
    user && user.photoURL ? user.photoURL : "",
    (userProfile && (userProfile.photoUpdatedAt || userProfile.updatedAt)) || ""
  );

  useEffect(() => {
    setUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!userMenuOpen || typeof document === "undefined") {
      return;
    }

    const handlePointerDownOutside = (event) => {
      if (!userMenuRef.current || !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDownOutside);
    document.addEventListener("touchstart", handlePointerDownOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDownOutside);
      document.removeEventListener("touchstart", handlePointerDownOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [userMenuOpen]);

  function handleUserMenuNavigation(href) {
    setUserMenuOpen(false);

    if (pathname !== href) {
      router.push(href);
    }
  }

  return (
    <nav className="sticky top-0 z-50 overflow-x-clip border-b border-rose-100/70 bg-white/85 shadow-sm backdrop-blur-xl">
      <div className="app-shell-container flex items-center justify-between gap-2 py-3 sm:gap-4">
        <Link href="/" className="flex min-w-0 shrink items-center gap-2 transition-transform hover:scale-[1.02] sm:gap-2.5">
          <img src="/logo-lakou-manman.png" alt="Lakou Manman" className="h-11 w-auto sm:h-12" />
          <span className="hidden whitespace-nowrap text-lg font-bold tracking-tight lg:block xl:text-xl">
            <span className="gradient-text">Lakou</span> Manman
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 rounded-full border border-rose-100 bg-white/80 p-1 shadow-sm lg:flex">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = link.matchPaths
              ? link.matchPaths.some((path) => pathname === path || pathname.startsWith(path + "/"))
              : pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Button
                key={link.href}
                asChild
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                className={`rounded-xl transition-all ${isActive ? "bg-rose-50 text-rose-700 shadow-sm" : "hover:bg-rose-50/50"}`}
              >
                <Link href={link.href}>
                  <Icon className={`mr-1.5 h-4 w-4 ${isActive ? "text-rose-500" : ""}`} />
                  {t(link.labelKey)}
                </Link>
              </Button>
            );
          })}
          {isAdmin && (
            <Button asChild variant={pathname === "/admin" ? "secondary" : "ghost"} size="sm" className="rounded-xl">
              <Link href="/admin">
                <ShieldCheck className="mr-1.5 h-4 w-4" />
                Admin
              </Link>
            </Button>
          )}
        </div>

        {/* Auth area */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {user ? (
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex max-w-full items-center gap-2 rounded-full border border-rose-100 bg-white/85 px-2 py-1.5 shadow-sm transition-all hover:border-rose-200 hover:shadow-md"
              >
                <div className="relative">
                  <Avatar className="h-9 w-9">
                    {profilePhoto && <AvatarImage src={profilePhoto} />}
                    <AvatarFallback className="text-xs">
                      {getInitials(displayName || "U")}
                    </AvatarFallback>
                  </Avatar>
                  {unreadCount > 0 && (
                    <Badge className="absolute -right-1 -top-1 h-5 min-w-[1.25rem] rounded-full bg-[#9B2335] px-1 text-[10px]">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Badge>
                  )}
                </div>
                <div className="hidden text-left md:block">
                  <div className="max-w-[9rem] truncate text-sm font-medium text-slate-800">
                    {displayName}
                  </div>
                  <div className="text-xs text-slate-500">{t("profile")}</div>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-3 w-[min(18rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] rounded-[1.75rem] border border-rose-100 bg-white/95 p-3 shadow-2xl backdrop-blur-xl">
                    <div className="mb-3 flex items-center gap-3 rounded-2xl bg-rose-50 px-3 py-3">
                      <Avatar className="h-11 w-11">
                        {profilePhoto && <AvatarImage src={profilePhoto} />}
                        <AvatarFallback className="text-xs">
                          {getInitials(displayName || "U")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">{displayName}</div>
                        <div className="truncate text-xs text-slate-500">{displayEmail}</div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => handleUserMenuNavigation("/profile")}
                        className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-rose-50 hover:text-[#9B2335]"
                      >
                        <User className="h-4 w-4" />
                        <span>{t("profile")}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUserMenuNavigation("/notifications")}
                        className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-rose-50 hover:text-[#9B2335]"
                      >
                        <span className="flex items-center gap-3">
                          <Bell className="h-4 w-4" />
                          <span>{t("notifications")}</span>
                        </span>
                        {unreadCount > 0 && (
                          <Badge className="bg-[#9B2335] px-1.5 text-[10px]">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </Badge>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUserMenuNavigation("/favorites")}
                        className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-rose-50 hover:text-[#9B2335]"
                      >
                        <Heart className="h-4 w-4" />
                        <span>{t("favorites")}</span>
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleUserMenuNavigation("/admin")}
                          className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-rose-50 hover:text-[#9B2335]"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          <span>{t("admin") || "Admin"}</span>
                        </button>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-2 py-1.5">
                      <LanguageSelector />
                      <ThemeSelector />
                    </div>

                    <Button
                      variant="ghost"
                      className="mt-3 w-full justify-start rounded-2xl text-slate-700 hover:bg-rose-50 hover:text-[#9B2335]"
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {t("logout")}
                    </Button>
                  </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-full border border-rose-100 bg-white/80 p-1 shadow-sm">
              <LanguageSelector />
              <ThemeSelector />
            </div>
          )}

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="border-t border-rose-100/50 glass-strong max-h-[calc(100vh-4rem)] overflow-y-auto lg:hidden">
          <div className="app-shell-container flex flex-col gap-1 py-3">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = link.matchPaths
                ? link.matchPaths.some((path) => pathname === path || pathname.startsWith(path + "/"))
                : pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Button
                  key={link.href}
                  asChild
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start rounded-xl"
                >
                  <Link href={link.href} onClick={() => setMobileOpen(false)}>
                    <Icon className="mr-2 h-4 w-4" />
                    {t(link.labelKey)}
                  </Link>
                </Button>
              );
            })}
            {isAdmin && (
              <Button asChild variant="ghost" className="w-full justify-start rounded-xl">
                <Link href="/admin" onClick={() => setMobileOpen(false)}>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {t("admin") || "Admin"}
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
