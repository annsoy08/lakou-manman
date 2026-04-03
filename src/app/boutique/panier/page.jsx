"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  clearShopCart,
  getShopCartItems,
  removeItemFromShopCart,
  subscribeToShopCartUpdates,
  syncShopCartWithAccount,
} from "@/lib/shopCart";
import {
  ArrowLeft,
  ImageIcon,
  ShoppingBag,
  ShoppingCart,
  Store,
  Trash2,
} from "lucide-react";

function formatShopMoney(value) {
  return `${Number(value || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} HTG`;
}

export default function BoutiqueCartPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [cartItems, setCartItems] = useState([]);

  const cartText = language === "ht"
    ? {
        title: "Panier boutique",
        subtitle: "Retrouve atik ou mete sou kote yo anvan ou finalize achte yo.",
        backToShop: "Retounen nan boutique la",
        emptyTitle: "Panier ou vid",
        emptyDescription: "Ajoute kèk atik depi nan boutique la pou w jwenn yo pi vit apre sa.",
        continueShopping: "Kontinye gade boutique la",
        clearCart: "Vide panier la",
        remove: "Retire",
        total: "Total estime",
        itemsCount: "atik nan panier",
        productSheet: "Wè fich la",
        seller: "Vandè",
        partnerShop: "Boutik",
        availability: "Disponiblite",
        available: "Disponib",
        unavailable: "Pa disponib",
      }
    : {
        title: "Panier boutique",
        subtitle: "Retrouvez les articles mis de côté avant de finaliser vos achats.",
        backToShop: "Retour à la boutique",
        emptyTitle: "Votre panier est vide",
        emptyDescription: "Ajoutez quelques articles depuis la boutique pour les retrouver rapidement ici.",
        continueShopping: "Continuer la boutique",
        clearCart: "Vider le panier",
        remove: "Retirer",
        total: "Total estimé",
        itemsCount: "articles dans le panier",
        productSheet: "Voir la fiche",
        seller: "Vendeur",
        partnerShop: "Boutique",
        availability: "Disponibilité",
        available: "Disponible",
        unavailable: "Indisponible",
      };

  useEffect(() => {
    let isActive = true;

    function syncCart(nextItems = getShopCartItems(user?.uid)) {
      if (!isActive) {
        return;
      }

      setCartItems(nextItems);
    }

    async function hydrateCart() {
      const nextItems = user?.uid ? await syncShopCartWithAccount(user.uid) : getShopCartItems();
      syncCart(nextItems);
    }

    hydrateCart();

    const unsubscribe = subscribeToShopCartUpdates(syncCart, user?.uid);
    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [user?.uid]);

  const totalPrice = useMemo(
    () => cartItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0),
    [cartItems]
  );

  return (
    <div className="space-y-6 rounded-[2.5rem] bg-[radial-gradient(circle_at_top,_rgba(214,60,84,0.08),_transparent_28%),linear-gradient(180deg,_rgba(255,249,250,0.99)_0%,_rgba(255,245,247,0.98)_42%,_rgba(255,255,255,1)_100%)] p-4 sm:p-5 lg:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href="/boutique"
            className="inline-flex items-center gap-2 rounded-full border border-[#f0d8dc] bg-white px-4 py-2 text-sm font-medium text-[#D63C54] shadow-[0_10px_24px_-20px_rgba(214,60,84,0.1)] transition-all hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {cartText.backToShop}
          </Link>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] bg-gradient-to-br from-[#F04A64] via-[#D63C54] to-[#C81E3A] text-white shadow-[0_18px_38px_-18px_rgba(214,60,84,0.36)]">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                {cartText.title}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {cartText.subtitle}
              </p>
            </div>
          </div>
        </div>

        <Card className="w-full rounded-[1.8rem] border border-white/90 bg-white shadow-[0_18px_38px_-28px_rgba(214,60,84,0.08)] lg:max-w-sm">
          <CardContent className="p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#D63C54]">
              {cartText.total}
            </div>
            <div className="mt-3 text-3xl font-bold text-[#D63C54]">
              {formatShopMoney(totalPrice)}
            </div>
            <div className="mt-2 text-sm text-slate-500">
              {cartItems.length} {cartText.itemsCount}
            </div>
            {cartItems.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                className="mt-4 w-full rounded-[1rem] border-[#f0d8dc] bg-white text-[#D63C54] shadow-[0_10px_22px_-20px_rgba(214,60,84,0.08)] transition-all hover:bg-white"
                onClick={() => clearShopCart({ userId: user?.uid })}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {cartText.clearCart}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {cartItems.length === 0 ? (
        <Card className="rounded-[2rem] border border-white/90 bg-white shadow-[0_18px_36px_-28px_rgba(214,60,84,0.08)]">
          <CardContent className="py-16 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.8rem] bg-[#fff1f4] text-[#D63C54]">
              <ShoppingBag className="h-10 w-10" />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-slate-900">{cartText.emptyTitle}</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">{cartText.emptyDescription}</p>
            <Button asChild className="mt-6 rounded-[1rem] bg-gradient-to-r from-[#F04A64] to-[#C81E3A] shadow-[0_18px_34px_-18px_rgba(214,60,84,0.22)]">
              <Link href="/boutique">{cartText.continueShopping}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]">
          <div className="space-y-4">
            {cartItems.map((item) => {
              const isAvailable = String(item.status || "available").trim().toLowerCase() === "available";

              return (
                <Card
                  key={item.id}
                  className="overflow-hidden rounded-[1.8rem] border border-white/90 bg-[linear-gradient(180deg,_rgba(255,255,255,1)_0%,_rgba(255,248,249,0.99)_100%)] shadow-[0_18px_36px_-28px_rgba(214,60,84,0.08)]"
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row">
                      <Link
                        href={`/boutique/${item.id}`}
                        className="block overflow-hidden rounded-[1.35rem] border border-[#f1dce0] bg-white sm:w-40"
                      >
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.title} className="h-40 w-full object-cover sm:h-full" />
                        ) : (
                          <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-white via-[#fff4f6] to-[#ffe9ed]">
                            <ImageIcon className="h-10 w-10 text-slate-300" />
                          </div>
                        )}
                      </Link>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap gap-2">
                              {item.condition ? (
                                <Badge className="rounded-full bg-[#fff0f3] text-[#D63C54]">
                                  {item.condition}
                                </Badge>
                              ) : null}
                              <Badge className={`rounded-full ${isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                                {isAvailable ? cartText.available : cartText.unavailable}
                              </Badge>
                            </div>
                            <Link href={`/boutique/${item.id}`} className="mt-3 block">
                              <h2 className="line-clamp-2 text-lg font-semibold text-slate-900 transition-colors hover:text-[#D63C54]">
                                {item.title}
                              </h2>
                            </Link>
                            <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
                              {item.sellerName ? (
                                <span>
                                  {cartText.seller}: <span className="font-medium text-slate-700">{item.sellerName}</span>
                                </span>
                              ) : null}
                              {item.shopName ? (
                                <span>
                                  {cartText.partnerShop}: <span className="font-medium text-slate-700">{item.shopName}</span>
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="rounded-[1.15rem] border border-[#f3d3da] bg-[#fff6f7] px-4 py-3 text-right shadow-[0_12px_24px_-22px_rgba(214,60,84,0.1)]">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d98091]">
                              {cartText.total}
                            </div>
                            <div className="mt-1 text-lg font-bold text-[#D63C54]">
                              {formatShopMoney(item.price)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          <Button
                            asChild
                            variant="outline"
                            className="w-full rounded-[1rem] border-[#f0d8dc] bg-white text-[#D63C54] shadow-[0_10px_22px_-20px_rgba(214,60,84,0.06)] transition-all hover:bg-[#fff5f6]"
                          >
                            <Link href={`/boutique/${item.id}`}>{cartText.productSheet}</Link>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full rounded-[1rem] border-[#f0d8dc] bg-white text-slate-700 shadow-[0_10px_22px_-20px_rgba(214,60,84,0.06)] transition-all hover:bg-[#fff5f6]"
                            onClick={() => removeItemFromShopCart(item.id, { userId: user?.uid })}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {cartText.remove}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="h-fit rounded-[1.8rem] border border-white/90 bg-white shadow-[0_18px_36px_-28px_rgba(214,60,84,0.08)] lg:sticky lg:top-6">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-[#D63C54]">
                <Store className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-[0.18em]">{cartText.title}</span>
              </div>
              <div className="mt-4 text-3xl font-bold text-[#D63C54]">
                {formatShopMoney(totalPrice)}
              </div>
              <div className="mt-2 text-sm text-slate-500">
                {cartItems.length} {cartText.itemsCount}
              </div>
              <Button asChild className="mt-5 w-full rounded-[1rem] bg-gradient-to-r from-[#F04A64] to-[#C81E3A] shadow-[0_18px_34px_-18px_rgba(214,60,84,0.22)]">
                <Link href="/boutique">{cartText.continueShopping}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
