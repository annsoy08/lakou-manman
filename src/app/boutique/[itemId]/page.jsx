"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/contexts/NotificationContext";
import {
  createConversation,
  getShopItemById,
  isItemFavorite,
  toggleFavorite,
} from "@/lib/firestore";
import { addItemToShopCart, getShopCartItems, subscribeToShopCartUpdates, syncShopCartWithAccount } from "@/lib/shopCart";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PaymentForm from "@/components/PaymentForm";
import { RatingDisplay } from "@/components/ui/StarRating";
import {
  ArrowLeft,
  CheckCircle2,
  Heart,
  ImageIcon,
  MapPin,
  MessageCircle,
  Phone,
  ShoppingBag,
  ShoppingCart,
  Store,
} from "lucide-react";

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
  "like-new": "bg-[#fff0f3] text-[#D63C54]",
  good: "bg-amber-100 text-amber-700",
  used: "bg-slate-100 text-slate-600",
};

function formatShopMoney(value) {
  return `${Number(value || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} HTG`;
}

function getTimestampDate(value) {
  if (typeof value?.toDate === "function") {
    return value.toDate();
  }

  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export default function BoutiqueItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { t, language } = useLanguage();
  const { notifyFavorite, notifySystem } = useNotifications();
  const itemIdParam = Array.isArray(params?.itemId) ? params.itemId[0] : params?.itemId;
  const itemId = String(itemIdParam || "").trim();
  const categories = useMemo(() => getCategories(t), [t]);
  const conditionLabels = useMemo(() => getConditionLabels(t), [t]);
  const detailText = language === "ht"
    ? {
        backToShop: "Retounen nan boutique la",
        notFoundTitle: "Atik sa a pa disponib ankò",
        notFoundDescription: "Nou pa jwenn fich pwodwi sa a oswa li pa disponib ankò.",
        sellerCardTitle: "Vandè a",
        overviewTitle: "Apèsi sou atik la",
        detailsTitle: "Detay pwodwi a",
        secureTitle: "Achte ak plis konfyans",
        securePoints: [
          "Peman an rete sekirize nan ekosistèm Lakou Manman.",
          "Ou ka kontakte vandè a anvan oswa apre acha a.",
          "Fich sa a rasanble tout enfòmasyon enpòtan yo nan yon sèl kote.",
        ],
        availability: "Disponiblite",
        available: "Disponib",
        unavailable: "Pa disponib",
        partnerShop: "Boutik patnè",
        communitySeller: "Vandè kominote",
        seller: "Vandè",
        category: "Kategori",
        publishedAt: "Pibliye",
        productSheet: "Fich pwodwi",
        ownItem: "Se atik pa ou",
        openMessages: "Voye mesaj",
        reference: "Referans",
        buySection: "Achte atik sa a",
        cart: "Panier",
        addToCart: "Mete nan panier",
        alreadyInCart: "Deja nan panier",
        cartUpdatedTitle: "Panier mete ajou",
        cartAddedMessage: "Atik la ajoute nan panier ou.",
        cartAlreadyMessage: "Atik sa a deja nan panier ou.",
        paymentHint: "Peman an pral louvri ak detay pwodwi sa a deja pare.",
        purchaseSuccessTitle: "Peman an anrejistre",
        purchaseSuccessMessage: "Acha ou a anrejistre. Ou ka retounen nan boutique la oswa kontinye sou paj sa a.",
        unavailableHint: "Atik sa a pa disponib pou achte kounye a.",
      }
    : {
        backToShop: "Retour à la boutique",
        notFoundTitle: "Cet article n'est plus disponible",
        notFoundDescription: "Nous ne trouvons pas cette fiche produit ou elle n'est plus accessible.",
        sellerCardTitle: "Le vendeur",
        overviewTitle: "Aperçu du produit",
        detailsTitle: "Détails du produit",
        secureTitle: "Achetez avec plus de confiance",
        securePoints: [
          "Le paiement reste sécurisé dans l'écosystème Lakou Manman.",
          "Vous pouvez contacter le vendeur avant ou après l'achat.",
          "Cette fiche rassemble les informations importantes au même endroit.",
        ],
        availability: "Disponibilité",
        available: "Disponible",
        unavailable: "Indisponible",
        partnerShop: "Boutique partenaire",
        communitySeller: "Vendeur communauté",
        seller: "Vendeur",
        category: "Catégorie",
        publishedAt: "Publication",
        productSheet: "Fiche produit",
        ownItem: "Votre article",
        openMessages: "Envoyer un message",
        reference: "Référence",
        buySection: "Acheter cet article",
        cart: "Panier",
        addToCart: "Ajouter au panier",
        alreadyInCart: "Déjà au panier",
        cartUpdatedTitle: "Panier mis à jour",
        cartAddedMessage: "L'article a été ajouté à votre panier.",
        cartAlreadyMessage: "Cet article est déjà dans votre panier.",
        paymentHint: "Le paiement s'ouvrira avec les détails de cet article déjà prêts.",
        purchaseSuccessTitle: "Paiement enregistré",
        purchaseSuccessMessage: "Votre achat a bien été enregistré. Vous pouvez revenir à la boutique ou continuer sur cette page.",
        unavailableHint: "Cet article n'est pas disponible à l'achat pour le moment.",
      };

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [purchaseFeedback, setPurchaseFeedback] = useState(null);
  const [cartItemIds, setCartItemIds] = useState([]);

  useEffect(() => {
    async function loadItem() {
      if (!itemId) {
        setItem(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const nextItem = await getShopItemById(itemId);
        setItem(nextItem);
      } catch (error) {
        console.error("Error loading shop item detail:", error);
        setItem(null);
      } finally {
        setLoading(false);
      }
    }

    loadItem();
  }, [itemId]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [item?.id]);

  useEffect(() => {
    async function loadFavoriteStatus() {
      if (!user?.uid || !item?.id) {
        setFavorite(false);
        return;
      }

      try {
        setFavorite(await isItemFavorite(user.uid, item.id));
      } catch (error) {
        console.error("Error checking favorite status:", error);
        setFavorite(false);
      }
    }

    loadFavoriteStatus();
  }, [user?.uid, item?.id]);

  useEffect(() => {
    let isActive = true;

    function syncCart(nextItems = getShopCartItems(user?.uid)) {
      if (!isActive) {
        return;
      }

      setCartItemIds(nextItems.map((cartItem) => cartItem.id).filter(Boolean));
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

  const imageUrls = useMemo(
    () => (Array.isArray(item?.images) ? item.images.map((image) => image?.url).filter(Boolean) : []),
    [item?.images]
  );
  const selectedImageUrl = imageUrls[selectedImageIndex] || imageUrls[0] || "";
  const isAvailable = String(item?.status || "available").trim().toLowerCase() === "available";
  const publishedDate = getTimestampDate(item?.createdAt)?.toLocaleDateString(language === "ht" ? "ht-HT" : "fr-HT", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const detailRows = [
    { label: detailText.category, value: categories.find((category) => category.id === item?.category)?.label || item?.category || "-" },
    { label: t("condition"), value: conditionLabels[item?.condition] || item?.condition || "-" },
    { label: detailText.seller, value: item?.authorName || "-" },
    { label: detailText.partnerShop, value: item?.shopName || "-" },
    { label: t("location"), value: item?.location || (item?.sellerCoordinates ? "GPS" : "-") },
    { label: detailText.publishedAt, value: publishedDate || "-" },
  ];

  async function handleToggleFavorite() {
    if (!item?.id) {
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    try {
      const nextFavoriteState = await toggleFavorite(user.uid, item.id);
      setFavorite(nextFavoriteState);
      if (nextFavoriteState && item.authorId !== user.uid) {
        notifyFavorite(item.title, userProfile?.name || user.displayName || "Anonim");
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  }

  async function handleContact() {
    if (!item?.authorId) {
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    try {
      const conversationId = await createConversation(
        [user.uid, item.authorId],
        {
          type: "boutique",
          itemId: item.id,
          title: item.title || item.name,
          price: item.price,
          imageUrl: imageUrls[0] || "",
        }
      );

      router.push(`/messages?conversationId=${conversationId}`);
    } catch (error) {
      console.error("Error opening conversation:", error);
      notifySystem(detailText.openMessages, t("conversationError"));
    }
  }

  function handlePurchase() {
    if (!item || !isAvailable || item.authorId === user?.uid) {
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    setShowPayment(true);
  }

  function handlePaymentSuccess(paymentData) {
    setShowPayment(false);
    setPurchaseFeedback({
      status: String(paymentData?.status || "pending").trim().toLowerCase(),
      reference: paymentData?.referenceNumber || paymentData?.transactionId || "-",
    });
    notifySystem(detailText.purchaseSuccessTitle, detailText.purchaseSuccessMessage);
  }

  async function handleAddToCart() {
    if (!item?.id || !isAvailable || item.authorId === user?.uid) {
      return;
    }

    const result = await addItemToShopCart({
      id: item.id,
      title: item.title || item.name,
      price: item.price,
      imageUrl: selectedImageUrl || imageUrls[0] || "",
      condition: item.condition,
      sellerName: item.authorName,
      shopName: item.shopName,
      status: item.status,
    }, {
      userId: user?.uid,
    });

    notifySystem(
      detailText.cartUpdatedTitle,
      result.alreadyExists ? detailText.cartAlreadyMessage : detailText.cartAddedMessage
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 rounded-[2.5rem] bg-[radial-gradient(circle_at_top,_rgba(214,60,84,0.08),_transparent_28%),linear-gradient(180deg,_rgba(255,249,250,0.99)_0%,_rgba(255,245,247,0.98)_42%,_rgba(255,255,255,1)_100%)] p-4 sm:p-5 lg:p-6">
        <div className="rounded-[2rem] border border-white/90 bg-white px-5 py-16 text-center text-slate-500 shadow-[0_20px_44px_-34px_rgba(214,60,84,0.08)]">
          {t("loadingItems")}
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="space-y-6 rounded-[2.5rem] bg-[radial-gradient(circle_at_top,_rgba(214,60,84,0.08),_transparent_28%),linear-gradient(180deg,_rgba(255,249,250,0.99)_0%,_rgba(255,245,247,0.98)_42%,_rgba(255,255,255,1)_100%)] p-4 sm:p-5 lg:p-6">
        <Link
          href="/boutique"
          className="inline-flex items-center gap-2 rounded-full border border-[#f0d8dc] bg-white px-4 py-2 text-sm font-medium text-[#D63C54] shadow-[0_10px_24px_-20px_rgba(214,60,84,0.1)] transition-all hover:bg-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {detailText.backToShop}
        </Link>
        <Card className="rounded-[2rem] border border-white/90 bg-white shadow-[0_20px_44px_-34px_rgba(214,60,84,0.08)]">
          <CardContent className="py-16 text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-slate-300" />
            <h1 className="mt-4 text-xl font-semibold text-slate-900">{detailText.notFoundTitle}</h1>
            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">{detailText.notFoundDescription}</p>
            <Button asChild className="mt-5 rounded-2xl bg-gradient-to-r from-[#F04A64] to-[#C81E3A] shadow-[0_16px_32px_-20px_rgba(214,60,84,0.22)]">
              <Link href="/boutique">
                {detailText.backToShop}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-[2.5rem] bg-[radial-gradient(circle_at_top,_rgba(214,60,84,0.08),_transparent_28%),linear-gradient(180deg,_rgba(255,249,250,0.99)_0%,_rgba(255,245,247,0.98)_42%,_rgba(255,255,255,1)_100%)] p-4 sm:p-5 lg:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/boutique"
          className="inline-flex items-center gap-2 rounded-full border border-[#f0d8dc] bg-white px-4 py-2 text-sm font-medium text-[#D63C54] shadow-[0_10px_24px_-20px_rgba(214,60,84,0.1)] transition-all hover:bg-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {detailText.backToShop}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/boutique/panier"
            className="inline-flex items-center gap-2 rounded-full border border-[#f0d8dc] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#D63C54] shadow-[0_10px_24px_-20px_rgba(214,60,84,0.08)] transition-all hover:bg-white"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            {detailText.cart}
            <span className="rounded-full bg-[#D63C54]/10 px-2 py-0.5 text-[10px] text-[#D63C54]">
              {cartItemIds.length}
            </span>
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/90 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#D63C54] shadow-[0_10px_24px_-20px_rgba(214,60,84,0.08)]">
            <Store className="h-3.5 w-3.5" />
            {detailText.productSheet}
          </div>
        </div>
      </div>

      {purchaseFeedback && (
        <Card className="overflow-hidden rounded-[2rem] border border-emerald-100/80 bg-[linear-gradient(135deg,_rgba(236,253,245,0.98)_0%,_rgba(255,255,255,0.98)_48%,_rgba(240,253,250,0.98)_100%)] shadow-[0_24px_70px_-44px_rgba(16,185,129,0.24)]">
          <CardContent className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-slate-900">{detailText.purchaseSuccessTitle}</div>
                  <div className="mt-1 text-sm text-slate-600">{detailText.purchaseSuccessMessage}</div>
                  <div className="mt-2 text-xs text-slate-500">{detailText.reference}: {purchaseFeedback.reference}</div>
                </div>
              </div>
              <Button asChild variant="outline" className="rounded-2xl border-[#e6d5db] bg-white/90 shadow-sm transition-all hover:bg-white">
                <Link href="/boutique">
                  {detailText.backToShop}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card className="overflow-hidden rounded-[2rem] border border-white/90 bg-[linear-gradient(135deg,_rgba(255,255,255,0.99)_0%,_rgba(255,246,248,0.98)_55%,_rgba(255,241,244,0.97)_100%)] shadow-[0_22px_52px_-36px_rgba(214,60,84,0.1)]">
            <CardContent className="p-4 sm:p-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-[1.75rem] border border-[#f1dce0] bg-white shadow-[0_14px_30px_-24px_rgba(214,60,84,0.08)]">
                    {selectedImageUrl ? (
                      <img
                        src={selectedImageUrl}
                        alt={item.title || t("item")}
                        className="aspect-square w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-white via-[#fff5f7] to-[#ffedf1]">
                        <ImageIcon className="h-16 w-16 text-slate-300" />
                      </div>
                    )}
                  </div>
                  {imageUrls.length > 1 && (
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                      {imageUrls.map((imageUrl, index) => (
                        <button
                          key={`${imageUrl}-${index}`}
                          type="button"
                          onClick={() => setSelectedImageIndex(index)}
                          className={`overflow-hidden rounded-[1rem] border bg-white transition-all ${
                            selectedImageIndex === index
                              ? "border-[#D63C54] shadow-[0_14px_28px_-22px_rgba(214,60,84,0.18)]"
                              : "border-[#f0d8dc] hover:border-[#e2a0ad]"
                          }`}
                        >
                          <img src={imageUrl} alt={`${item.title || t("item")} ${index + 1}`} className="aspect-square w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-5">
                  <div className="flex flex-wrap gap-2">
                    <Badge className={`rounded-full ${conditionColors[item.condition] || "bg-slate-100 text-slate-600"}`}>
                      {conditionLabels[item.condition] || item.condition || "-"}
                    </Badge>
                    {item.category && (
                      <Badge variant="secondary" className="rounded-full bg-white/90 text-slate-700">
                        {categories.find((category) => category.id === item.category)?.label || item.category}
                      </Badge>
                    )}
                    <Badge className="rounded-full bg-[#fff0f3] text-[#D63C54]">
                      {item.shopName ? detailText.partnerShop : detailText.communitySeller}
                    </Badge>
                  </div>

                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{item.title || t("item")}</h1>
                    {item.authorId ? (
                      <Link href={`/reviews/${item.authorId}`} className="mt-2 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
                        <RatingDisplay userId={item.authorId} size="sm" showCount />
                      </Link>
                    ) : null}
                  </div>

                  <div className="rounded-[1.5rem] border border-[#f1dce0] bg-white p-4 shadow-[0_12px_26px_-22px_rgba(214,60,84,0.08)]">
                    <div className="text-3xl font-bold text-[#D63C54]">{formatShopMoney(item.price)}</div>
                    <p className="mt-2 text-sm text-slate-500">{detailText.paymentHint}</p>
                  </div>

                  <div className="rounded-[1.5rem] border border-[#f1dce0] bg-white p-4 shadow-[0_12px_26px_-22px_rgba(214,60,84,0.08)]">
                    <div className="text-sm font-semibold text-slate-900">{detailText.overviewTitle}</div>
                    <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
                      {item.description || "-"}
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] border border-[#f1dce0] bg-white p-4 shadow-[0_12px_26px_-22px_rgba(214,60,84,0.08)]">
                    <div className="text-sm font-semibold text-slate-900">{detailText.detailsTitle}</div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {detailRows.map((row) => (
                        <div key={row.label} className="rounded-[1rem] border border-[#f5e2e6] bg-[#fffafb] px-4 py-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{row.label}</div>
                          <div className="mt-1 text-sm font-medium text-slate-700">{row.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-[#f1dce0] bg-white p-4 shadow-[0_12px_26px_-22px_rgba(214,60,84,0.08)]">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D63C54]/10 text-[#D63C54]">
                        <Store className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-900">{detailText.sellerCardTitle}</div>
                        <div className="mt-1 text-base font-medium text-slate-800">{item.authorName || "-"}</div>
                        {item.shopName ? <div className="mt-1 text-sm text-slate-500">{item.shopName}</div> : null}
                        <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
                          {item.location ? (
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="h-4 w-4" />
                              {item.location}
                            </span>
                          ) : null}
                          {item.contact ? (
                            <a href={`tel:${item.contact}`} className="inline-flex items-center gap-1.5 text-[#D63C54] hover:underline">
                              <Phone className="h-4 w-4" />
                              {item.contact}
                            </a>
                          ) : null}
                        </div>
                        {item.authorId ? (
                          <Link href={`/reviews/${item.authorId}`} className="mt-3 inline-flex text-sm font-medium text-[#D63C54] hover:underline">
                            {t("reviews")}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border border-white/90 bg-[linear-gradient(135deg,_rgba(255,251,252,0.99)_0%,_rgba(255,255,255,0.99)_100%)] shadow-[0_18px_40px_-30px_rgba(214,60,84,0.08)]">
            <CardContent className="p-6">
              <div className="text-lg font-semibold text-slate-900">{detailText.secureTitle}</div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {detailText.securePoints.map((point) => (
                  <div key={point} className="rounded-[1.25rem] border border-[#f1dce0] bg-white p-4 shadow-[0_10px_22px_-20px_rgba(214,60,84,0.06)]">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-emerald-100 p-1 text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div className="text-sm leading-6 text-slate-600">{point}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="xl:sticky xl:top-6 xl:h-fit">
          <Card className="rounded-[2rem] border border-white/90 bg-white shadow-[0_20px_42px_-30px_rgba(214,60,84,0.08)]">
            <CardContent className="p-5">
              <div className="text-sm font-semibold text-slate-900">{detailText.buySection}</div>
              <div className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-400">{detailText.availability}</div>
              <div className={`mt-1 text-lg font-semibold ${isAvailable ? "text-emerald-700" : "text-red-600"}`}>
                {isAvailable ? detailText.available : detailText.unavailable}
              </div>
              <div className="mt-4 text-3xl font-bold text-[#D63C54]">{formatShopMoney(item.price)}</div>
              {!isAvailable ? <div className="mt-2 text-sm text-slate-500">{detailText.unavailableHint}</div> : null}

              <div className="mt-5 space-y-3">
                <Button
                  variant="outline"
                  className="w-full rounded-[1rem] border-[#f0d8dc] bg-white text-[#D63C54] shadow-[0_10px_22px_-20px_rgba(214,60,84,0.08)] transition-all hover:bg-white"
                  onClick={handleToggleFavorite}
                >
                  <Heart className={`mr-2 h-4 w-4 ${favorite ? "fill-red-500 text-red-500" : ""}`} />
                  {favorite ? t("removeFromFavorites") : t("addToFavorites")}
                </Button>

                {item.authorId !== user?.uid ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-[1rem] border-[#f0d8dc] bg-white py-3 text-sm font-medium text-slate-700 shadow-[0_10px_22px_-20px_rgba(214,60,84,0.08)] transition-all hover:bg-white"
                    onClick={handleAddToCart}
                    disabled={!isAvailable || cartItemIds.includes(item.id)}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {cartItemIds.includes(item.id) ? detailText.alreadyInCart : detailText.addToCart}
                  </Button>
                ) : null}

                <Button
                  className="w-full rounded-[1rem] bg-gradient-to-r from-[#F04A64] to-[#C81E3A] py-3 text-sm font-medium shadow-[0_18px_34px_-18px_rgba(214,60,84,0.26)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_38px_-18px_rgba(214,60,84,0.34)]"
                  onClick={handlePurchase}
                  disabled={!isAvailable || item.authorId === user?.uid}
                >
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  {item.authorId === user?.uid ? detailText.ownItem : t("buyNow")}
                </Button>

                {item.authorId && item.authorId !== user?.uid ? (
                  <Button
                    variant="outline"
                    className="w-full rounded-[1rem] border-[#f0d8dc] bg-white py-3 text-sm font-medium shadow-[0_10px_22px_-20px_rgba(214,60,84,0.08)] transition-all hover:bg-white"
                    onClick={handleContact}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    {t("contactToSeller")}
                  </Button>
                ) : null}

                {item.contact ? (
                  <Button asChild variant="outline" className="w-full rounded-[1rem] border-[#f0d8dc] bg-white py-3 text-sm font-medium shadow-[0_10px_22px_-20px_rgba(214,60,84,0.08)] transition-all hover:bg-white">
                    <a href={`tel:${item.contact}`}>
                      <Phone className="mr-2 h-4 w-4" />
                      {item.contact}
                    </a>
                  </Button>
                ) : null}
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-[#f1dce0] bg-[linear-gradient(135deg,_rgba(255,248,249,0.98)_0%,_rgba(255,255,255,1)_100%)] p-4 shadow-[0_10px_22px_-20px_rgba(214,60,84,0.06)]">
                <div className="space-y-3 text-sm text-slate-600">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                    <span>{detailText.securePoints[0]}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                    <span>{detailText.securePoints[1]}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                    <span>{detailText.securePoints[2]}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/48 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.99)_0%,_rgba(255,246,248,0.98)_100%)] shadow-[0_26px_60px_-32px_rgba(214,60,84,0.16)]">
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">{t("securePayment")}</h2>
                <button
                  type="button"
                  onClick={() => setShowPayment(false)}
                  className="text-slate-400 transition-colors hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div className="mb-6 rounded-[1.4rem] border border-[#f1dce0] bg-white p-4 shadow-[0_10px_22px_-20px_rgba(214,60,84,0.08)]">
                <div className="flex items-center gap-3">
                  {selectedImageUrl ? (
                    <img src={selectedImageUrl} alt={item.title || item.name} className="h-16 w-16 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100 text-slate-300">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-slate-900">{item.title || item.name}</h3>
                    <p className="text-sm text-slate-500">{conditionLabels[item.condition] || item.condition}</p>
                    <p className="text-lg font-bold text-[#D63C54]">{formatShopMoney(item.price)}</p>
                  </div>
                </div>
              </div>

              <PaymentForm
                amount={parseFloat(item.price || 0)}
                itemInfo={{ ...item, name: item.title || item.name }}
                onSuccess={handlePaymentSuccess}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
