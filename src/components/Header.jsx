"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  Users, 
  Stethoscope, 
  Wrench, 
  ShoppingBag, 
  MessageCircle, 
  Heart, 
  Bell, 
  User, 
  Menu,
  X,
  Globe
} from "lucide-react";

export default function Header() {
  const { user } = useAuth();
  const { language, changeLanguage, t } = useLanguage();
  const { notifications } = useNotifications();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: t("home") || "Accueil", href: "/", icon: Home },
    { name: t("feed") || "Communauté", href: "/feed", icon: Users },
    { name: t("pediatre") || "Pédiatrie", href: "/pediatre", icon: Stethoscope },
    { name: t("tools") || "Outils", href: "/outils", icon: Wrench },
    { name: t("boutique") || "Boutique", href: "/boutique", icon: ShoppingBag },
    { name: t("messages") || "Messages", href: "/messages", icon: MessageCircle },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  const toggleLanguage = () => {
    const newLang = language === "fr" ? "ht" : "fr";
    changeLanguage(newLang);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <img 
              src="/logo-lakou-manman.png" 
              alt="Lakou Manman" 
              className="h-14 w-auto"
            />
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-slate-800">Lakou Manman</h1>
              <p className="text-xs text-slate-600">{t("platformSubtitle") || "Plateforme Communautaire Haïtienne"}</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-pink-100 text-pink-700"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Language Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="hidden sm:flex items-center gap-2"
            >
              <Globe className="h-4 w-4" />
              <span className="text-xs font-medium">
                {language === "fr" ? "FR" : "HT"}
              </span>
            </Button>

            {/* Notifications */}
            {user && (
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </Button>
            )}

            {/* Favorites */}
            <Button variant="ghost" size="sm">
              <Heart className="h-5 w-5" />
            </Button>

            {/* User Menu */}
            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:block text-right">
                  <div className="text-sm font-medium text-slate-900">
                    {user.displayName || "Utilisateur"}
                  </div>
                  <div className="text-xs text-slate-600">
                    {user.email}
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="relative">
                  <User className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => router.push("/login")}>
                  {t("login") || "Connexion"}
                </Button>
                <Button 
                  size="sm" 
                  className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                  onClick={() => router.push("/register")}
                >
                  {t("register") || "S'inscrire"}
                </Button>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 py-4">
            <nav className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-pink-100 text-pink-700"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile User Section */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              {!user ? (
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => router.push("/login")}
                  >
                    {t("login") || "Connexion"}
                  </Button>
                  <Button 
                    size="sm" 
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                    onClick={() => router.push("/register")}
                  >
                    {t("register") || "S'inscrire"}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold">
                    {user.displayName?.charAt(0) || "U"}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {user.displayName || "Utilisateur"}
                    </div>
                    <div className="text-xs text-slate-600">
                      {user.email}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
