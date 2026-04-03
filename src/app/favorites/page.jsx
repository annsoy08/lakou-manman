"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { getShopItems, getUserFavorites, isItemFavorite } from "@/lib/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag,
  Heart,
  MapPin,
  Phone,
  ImageIcon,
  MessageCircle,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

const getCategories = (t) => [
  { id: "vetements", label: t("vetements") },
  { id: "jouets", label: t("jouets") },
  { id: "mobilier", label: t("mobilier") },
  { id: "livres", label: t("livres") },
  { id: "poussettes", label: t("poussettes") },
  { id: "transport", label: t("transport") },
  { id: "autres", label: t("autres") },
];

const getConditionLabels = (t) => ({
  new: t("new"),
  "like-new": t("likeNew"),
  good: t("good"),
  used: t("used"),
});

const conditionColors = {
  new: "bg-emerald-100 text-emerald-700",
  "like-new": "bg-[#f4ecef] text-[#7E243A]",
  good: "bg-amber-100 text-amber-700",
  used: "bg-slate-100 text-slate-600",
};

export default function FavoritesPage() {
  const { user, userProfile } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const categories = getCategories(t);
  const conditionLabels = getConditionLabels(t);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    loadFavorites();
  }, [user, router]);

  async function loadFavorites() {
    if (!user) return;
    setLoading(true);
    try {
      // Get user's favorite item IDs
      const favoriteIds = await getUserFavorites(user.uid);
      
      // Get all items and filter by favorites
      const allItems = await getShopItems();
      const favoriteItems = allItems.filter(item => 
        favoriteIds.includes(item.id) && item.status === "available"
      );
      
      setFavorites(favoriteItems);
    } catch (e) {
      console.error("Error loading favorites:", e);
    }
    setLoading(false);
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md rounded-3xl border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <Heart className="mx-auto h-12 w-12 text-slate-300" />
            <h1 className="mt-4 text-xl font-bold">{t("loginToSeeFavorites")}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {t("loginToSeeFavoritesDesc")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">{t("myFavorites")}</h1>
          <p className="mt-1 text-slate-600">
            {favorites.length} {t("item")}{favorites.length > 1 ? "s" : ""} {t("liked")}{favorites.length > 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/boutique">
          <Button variant="outline" className="rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("returnToShop")}
          </Button>
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#7E243A] border-t-transparent"></div>
        </div>
      )}

      {/* Empty state */}
      {!loading && favorites.length === 0 && (
        <Card className="rounded-3xl border-0 bg-gradient-to-br from-[#fcf8f9] to-white p-12 text-center shadow-[0_24px_70px_-44px_rgba(108,31,50,0.12)]">
          <Heart className="mx-auto h-16 w-16 text-[#c993a3]" />
          <h2 className="mt-4 text-xl font-semibold text-[#6C1F32]">{t("noFavorites")}</h2>
          <p className="mt-2 text-[#7E243A]">
            {t("noFavoritesDesc")}
          </p>
          <Link href="/boutique" className="mt-4 inline-block">
            <Button className="rounded-xl bg-gradient-to-r from-[#6C1F32] to-[#4B1021] shadow-[0_16px_34px_-18px_rgba(108,31,50,0.38)]">
              <ShoppingBag className="mr-2 h-4 w-4" />
              {t("discoverShop")}
            </Button>
          </Link>
        </Card>
      )}

      {/* Favorites grid */}
      {!loading && favorites.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((item) => (
            <Card
              key={item.id}
              className="group card-hover overflow-hidden rounded-[1.5rem] border-0 shadow-sm"
            >
              {/* Images */}
              {item.images && item.images.length > 0 ? (
                <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                  <img
                    src={item.images[0].url}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                  {item.images.length > 1 && (
                    <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-xs text-white">
                      +{item.images.length - 1}
                    </div>
                  )}
                  <div className="hidden h-full w-full items-center justify-center bg-gradient-to-br from-white to-[#f6eef1]">
                    <ImageIcon className="h-10 w-10 text-slate-300" />
                  </div>
                </div>
              ) : (
                <div className="flex h-48 w-full items-center justify-center bg-gradient-to-br from-white via-[#fbf6f7] to-[#f3e7eb]">
                  <ShoppingBag className="h-10 w-10 text-[#d7b3be]" />
                </div>
              )}

              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-tight line-clamp-2">{item.title}</h3>
                  <span className="shrink-0 text-lg font-bold text-[#7E243A]">
                    {item.price?.toLocaleString()} HTG
                  </span>
                </div>

                {item.description && (
                  <p className="mt-2 text-sm text-slate-500 line-clamp-2">{item.description}</p>
                )}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge className={`rounded-full text-xs ${conditionColors[item.condition] || "bg-slate-100 text-slate-600"}`}>
                    {conditionLabels[item.condition] || item.condition}
                  </Badge>
                  {item.category && (
                    <Badge variant="secondary" className="rounded-full text-xs">
                      {categories.find((c) => c.id === item.category)?.label || item.category}
                    </Badge>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                  <span>{item.authorName}</span>
                  {item.location && (
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" />
                      {item.location}
                    </span>
                  )}
                </div>

                {item.contact && (
                  <a
                    href={`tel:${item.contact}`}
                    className="mt-3 flex items-center gap-1.5 text-sm font-medium text-[#7E243A] hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {item.contact}
                  </a>
                )}

                {/* View item button */}
                <Button
                  asChild
                  size="sm"
                  className="mt-3 w-full rounded-xl bg-gradient-to-r from-[#6C1F32] to-[#4B1021] text-xs shadow-[0_16px_34px_-18px_rgba(108,31,50,0.38)]"
                >
                  <Link href={`/boutique/${item.id}`}>
                    {t("viewDetails")}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
