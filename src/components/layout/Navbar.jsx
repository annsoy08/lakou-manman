"use client";

import Link from "next/link";
import Image from "next/image";
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
  Radio,
  ShieldCheck,
  LogOut,
  User,
  Heart,
  Bell,
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  CalendarHeart,
  Trophy,
  ClipboardList,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ThemeSelector from "@/components/layout/ThemeSelector";
import LanguageSelector from "@/components/ui/LanguageSelector";

const navLinks = [
  { href: "/feed", labelKey: "feed", icon: MessageCircle },
  { href: "/groups", labelKey: "groups", icon: Users },
  { href: "/sante", labelKey: "health", icon: Stethoscope, matchPaths: ["/sante", "/pediatre", "/gynecologie", "/psychologie"] },
  { href: "/guides", labelKey: "guides", icon: BookOpen },
  { href: "/boutique", labelKey: "boutique", icon: ShoppingBag },
  { href: "/messages", labelKey: "messages", icon: MessageCircle },
  { href: "/live", labelKey: "live", icon: Radio },
];

const activitiesLinks = [
  { href: "/evenements", labelKey: "evenements", icon: CalendarHeart },
  { href: "/concours", labelKey: "concours", icon: Trophy },
  { href: "/games", labelKey: "games", icon: Gamepad2 },
];

export default function Navbar() {
  const { user, userProfile, isAdmin, canManageDoctorContent, canManageEvents, isEventManager, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activitiesOpen, setActivitiesOpen] = useState(false);
  const userMenuRef = useRef(null);
  const activitiesRef = useRef(null);
  const displayName = resolveUserDisplayName(userProfile, user, t("profile"));
  const displayEmail = user && user.email ? user.email : "";
  const profilePhoto = resolveProfilePhoto(
    userProfile && userProfile.photo ? userProfile.photo : "",
    user && user.photoURL ? user.photoURL : "",
    (userProfile && (userProfile.photoUpdatedAt || userProfile.updatedAt)) || ""
  );

  useEffect(() => {
    setUserMenuOpen(false);
    setActivitiesOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!activitiesOpen || typeof document === "undefined") return;
    const handle = (e) => {
      if (!activitiesRef.current || !activitiesRef.current.contains(e.target)) setActivitiesOpen(false);
    };
    document.addEventListener("mousedown", handle);
    document.addEventListener("touchstart", handle);
    return () => { document.removeEventListener("mousedown", handle); document.removeEventListener("touchstart", handle); };
  }, [activitiesOpen]);

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
      <div className="app-shell-container flex items-center gap-2 py-2 sm:gap-3 sm:py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 transition-transform hover:scale-[1.02] sm:gap-2.5">
          <Image src="/logo-lakou-manman.png" alt="Lakou Manman" width={48} height={48} className="h-9 w-auto sm:h-12" priority />
          <span className="hidden whitespace-nowrap text-sm font-bold tracking-tight xl:block xl:text-base 2xl:text-lg">
            <span className="gradient-text">Lakou</span> Manman
          </span>
        </Link>

        {/* Desktop nav — flex-1 so it fills available space without overflowing */}
        <div className="hidden flex-1 min-w-0 items-center justify-center gap-0.5 rounded-full border border-rose-100 bg-white/80 p-1 shadow-sm lg:flex">
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
                title={t(link.labelKey)}
              >
                <Link href={link.href}>
                  <Icon className={`h-4 w-4 xl:mr-1.5 ${isActive ? "text-rose-500" : ""}`} />
                  <span className="hidden xl:inline">{t(link.labelKey)}</span>
                </Link>
              </Button>
            );
          })}

          {/* Activités dropdown */}
          {(() => {
            const isActivityActive = activitiesLinks.some((l) => pathname === l.href || pathname.startsWith(l.href + "/"));
            return (
              <div ref={activitiesRef} className="relative">
                <Button
                  variant={isActivityActive ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setActivitiesOpen((v) => !v)}
                  className={`relative rounded-xl transition-all ${isActivityActive ? "bg-rose-50 text-rose-700 shadow-sm" : "hover:bg-rose-50/50"}`}
                  title="Activités"
                >
                  <Trophy className={`h-4 w-4 xl:mr-1.5 ${isActivityActive ? "text-rose-500" : ""}`} />
                  <span className="hidden xl:inline">{t("activities")}</span>
                  <ChevronDown className={`ml-1 h-3.5 w-3.5 transition-transform ${activitiesOpen ? "rotate-180" : ""}`} />
                  {!isActivityActive && (
                    <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                    </span>
                  )}
                </Button>
                {activitiesOpen && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-48 rounded-2xl border border-rose-100 bg-white/95 p-2 shadow-xl backdrop-blur-xl">
                    {activitiesLinks.map((link) => {
                      const Icon = link.icon;
                      const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
                      return (
                        <Link key={link.href} href={link.href}
                          className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? "bg-rose-50 text-rose-700" : "text-slate-700 hover:bg-rose-50 hover:text-rose-700"}`}>
                          <Icon className={`h-4 w-4 ${isActive ? "text-rose-500" : "text-slate-400"}`} />
                          {t(link.labelKey)}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {isAdmin && (
            <Button asChild variant={pathname === "/admin" ? "secondary" : "ghost"} size="sm" className="rounded-xl px-2.5" title="Admin">
              <Link href="/admin">
                <ShieldCheck className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>

        {/* Auth area — shrink-0 so it never gets compressed */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
          {user ? (
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex max-w-full items-center gap-1.5 rounded-full border border-rose-100 bg-white/85 px-1.5 py-1.5 shadow-sm transition-all hover:border-rose-200 hover:shadow-md sm:gap-2 sm:px-2"
              >
                <div className="relative">
                  <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
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
                  <div className="max-w-[7rem] truncate text-sm font-medium text-slate-800">
                    {displayName.split(" ")[0]}
                  </div>
                  <div className="text-xs text-slate-500">{t("profile")}</div>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform sm:h-4 sm:w-4 ${userMenuOpen ? "rotate-180" : ""}`} />
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
                      <button
                        type="button"
                        onClick={() => handleUserMenuNavigation("/evenements/mes-demandes")}
                        className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-rose-50 hover:text-[#9B2335]"
                      >
                        <ClipboardList className="h-4 w-4 text-fuchsia-500" />
                        <span className="font-medium">{t("myEventRequests") || "Mes demandes événements"}</span>
                      </button>
                      {isEventManager && (
                        <button
                          type="button"
                          onClick={() => handleUserMenuNavigation("/agent/evenements")}
                          className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-rose-50 to-fuchsia-50 px-3 py-2.5 text-sm font-bold text-rose-700 transition-colors hover:from-rose-100 hover:to-fuchsia-100"
                        >
                          <CalendarHeart className="h-4 w-4 text-fuchsia-500" />
                          <span>{t("espaceEvenements")}</span>
                        </button>
                      )}
                      {(canManageDoctorContent || ["doctor_editor"].includes(String(userProfile?.role || "").trim().toLowerCase())) && (
                        <button
                          type="button"
                          onClick={() => handleUserMenuNavigation("/doctor-dashboard")}
                          className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-rose-50 hover:text-[#9B2335]"
                        >
                          <LayoutDashboard className="h-4 w-4" />
                          <span>{t("doctorDashboard") || "Dashboard médecin"}</span>
                        </button>
                      )}
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
            <div className="flex items-center gap-1.5 rounded-full border border-rose-100 bg-white/80 p-1 shadow-sm sm:gap-2">
              <LanguageSelector />
              <ThemeSelector />
            </div>
          )}

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl lg:hidden sm:h-10 sm:w-10"
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
            <div className="my-1 flex items-center gap-2 px-1">
              <div className="h-px flex-1 bg-rose-100" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-rose-300">Activités</span>
              <div className="h-px flex-1 bg-rose-100" />
            </div>
            {activitiesLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Button key={link.href} asChild variant={isActive ? "secondary" : "ghost"} className="w-full justify-start rounded-xl">
                  <Link href={link.href} onClick={() => setMobileOpen(false)}>
                    <Icon className="mr-2 h-4 w-4" />
                    {t(link.labelKey)}
                  </Link>
                </Button>
              );
            })}
            <Button asChild variant="ghost" className="w-full justify-start rounded-xl">
              <Link href="/evenements/mes-demandes" onClick={() => setMobileOpen(false)}>
                <ClipboardList className="mr-2 h-4 w-4 text-fuchsia-500" />
                {t("myEventRequests") || "Mes demandes événements"}
              </Link>
            </Button>
            {isEventManager && (
              <Button asChild className="w-full justify-start rounded-xl bg-gradient-to-r from-rose-500 to-fuchsia-500 font-bold text-white">
                <Link href="/agent/evenements" onClick={() => setMobileOpen(false)}>
                  <CalendarHeart className="mr-2 h-4 w-4" />
                  {t("espaceEvenements")}
                </Link>
              </Button>
            )}
            {canManageDoctorContent && (
              <Button asChild variant="ghost" className="w-full justify-start rounded-xl">
                <Link href="/doctor-dashboard" onClick={() => setMobileOpen(false)}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  {t("doctorDashboard") || "Dashboard médecin"}
                </Link>
              </Button>
            )}
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
