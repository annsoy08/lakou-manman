"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  createShopItem,
  deleteShopItem, 
  markItemSold,
  searchShopItems,
  getBuyerShopOrders,
  getSellerShopOrders,
  getUserShopItems,
  requestShopOrderAction,
} from "@/lib/firestore";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import ActionDialog from "@/components/ui/action-dialog";
import SearchFilters from "@/components/ui/SearchFilters";
import { addItemToShopCart, getShopCartItems, subscribeToShopCartUpdates, syncShopCartWithAccount } from "@/lib/shopCart";
import {
  ShoppingBag,
  ShoppingCart,
  Plus,
  X,
  Tag,
  Heart,
  Baby,
  Shirt,
  BookOpen,
  Bed,
  Bike,
  Gift,
  Package,
  Trash2,
  CheckCircle2,
  ImageIcon,
  Search,
  Store,
  ArrowRight,
} from "lucide-react";
import ImageUpload from "@/components/ui/ImageUpload";

const getCategories = (t) => [
  { id: "all", label: t("allCategories"), icon: Package },
  { id: "vetements", label: t("vetements"), icon: Shirt },
  { id: "jouets", label: t("jouets"), icon: Gift },
  { id: "mobilier", label: t("mobilier"), icon: Bed },
  { id: "livres", label: t("livres"), icon: BookOpen },
  { id: "poussettes", label: t("poussettes"), icon: Baby },
  { id: "transport", label: t("transport"), icon: Bike },
  { id: "autres", label: t("autres"), icon: Tag },
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

const getSellerTypeLabels = (language) => ({
  individual: language === "ht" ? "Manm kominote" : "Membre communauté",
  affiliate_shop: language === "ht" ? "Magazen afilye" : "Magasin affilié",
});

function normalizeStatusValue(value, fallback = "") {
  return String(value || fallback).trim().toLowerCase();
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

function formatShopMoney(value) {
  return `${Number(value || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} HTG`;
}

const SHOP_QUERY_PAGE_SIZE = 24;
const SHOP_VISIBLE_STEP = 12;

export default function BoutiquePage() {
  const { user, userProfile } = useAuth();
  const { notifyItem, notifySystem } = useNotifications();
  const { t, language } = useLanguage();
  const categories = getCategories(t);
  const conditionLabels = getConditionLabels(t);
  const sellerTypeLabels = getSellerTypeLabels(language);
  const sellerGpsText = language === "ht"
    ? {
        help: "Ajoute GPS ou pou ede kalkile frè livrezon yo pi byen.",
        button: "Itilize GPS vandè a",
        loading: "N ap chèche pozisyon ou...",
        ready: "Pozisyon GPS vandè a anrejistre.",
        unavailable: "GPS pa disponib sou aparèy sa a.",
        denied: "Nou pa rive jwenn pozisyon GPS la. Verifye otorizasyon navigatè a.",
      }
    : {
        help: "Ajoutez votre GPS pour améliorer le calcul des frais de livraison.",
        button: "Utiliser le GPS du vendeur",
        loading: "Recherche de votre position...",
        ready: "Position GPS du vendeur enregistrée.",
        unavailable: "Le GPS n'est pas disponible sur cet appareil.",
        denied: "Impossible de récupérer la position GPS. Vérifiez l'autorisation du navigateur.",
      };
  const cartText = language === "ht"
    ? {
        title: "Panier",
        add: "Mete nan panier",
        added: "Deja nan panier",
        addedTitle: "Panier mete ajou",
        addedMessage: "Atik la ajoute nan panier ou.",
        alreadyMessage: "Atik sa a deja nan panier ou.",
      }
    : {
        title: "Panier",
        add: "Ajouter au panier",
        added: "Déjà au panier",
        addedTitle: "Panier mis à jour",
        addedMessage: "L'article a été ajouté à votre panier.",
        alreadyMessage: "Cet article est déjà dans votre panier.",
      };
  const operationsText = language === "ht"
    ? {
        loadError: "Nou pa kapab chaje atik boutik yo pou kounye a.",
        operationsTitle: "Swiv acha ak vant ou yo",
        operationsDesc: "Jere kòmand yo, prèv peman yo ak demann asistans yo nan yon sèl kote.",
        buyerHistory: "Acha mwen yo",
        sellerHistory: "Vant mwen yo",
        dashboard: "Tableau de bord vandè",
        activeListings: "Anons aktif",
        salesOrders: "Kòmand resevwa",
        confirmedSales: "Vant konfime",
        sellerRevenue: "Revni vandè",
        actionRequired: "Aksyon nesesè",
        noPurchases: "Ou poko gen acha nan boutik la.",
        noSales: "Ou poko resevwa kòmand kliyan yo.",
        noListings: "Ou poko pibliye okenn atik.",
        payment: "Pèman",
        fulfillment: "Swivi",
        support: "Sipò",
        proof: "Prèv",
        reference: "Referans",
        seller: "Vandè",
        buyer: "Achtè",
        orderDate: "Dat",
        requestCancel: "Mande anilasyon",
        requestRefund: "Mande ranbousman",
        actionPending: "Demann an kou",
        requestSentTitle: "Demann voye",
        requestSentMessage: "Sipò a pral revize demann ou an rapidman.",
        requestErrorTitle: "Demann pa pase",
        requestErrorMessage: "Nou pa rive anrejistre demann lan. Tanpri eseye ankò.",
        purchaseSuccessTitle: "Achat a anrejistre",
        purchaseSuccessMessage: "Konfimasyon ak fakti a byen prepare. Ou ka suiv kòmand sa a nan acha ou yo pi ba a.",
        purchasePendingMessage: "Peman an anrejistre. Ekip la oswa sistèm nan ap finalize verifikasyon kòmand sa a byento.",
        viewPurchase: "Gade acha mwen an",
        dismissPurchaseSuccess: "Fèmen mesaj la",
        openHistory: "Acha ak vant mwen yo",
        hideHistory: "Kache istwa a",
        latestReference: "Dènye referans",
        statusLabels: {
          pending: "An atant",
          completed: "Konfime",
          failed: "Echwe",
          cancelled: "Anile",
          refunded: "Rembouse",
          awaiting_payment: "Ap tann peman",
          confirmed: "Konfime",
          preparing: "Ap prepare",
          ready_for_pickup: "Pare pou retrè",
          in_delivery: "Nan livrezon",
          delivered: "Livre",
          refund_requested: "Rembousman mande",
          monitoring: "Siveyans",
          action_required: "Aksyon nesesè",
          resolved: "Rezoud",
          none: "Pa gen",
          pending_proof: "Prèv an atant",
          pending_request: "Demann an kou",
          missing: "Prèv manke",
          provided: "Prèv soumèt",
          verified: "Prèv verifye",
          rejected: "Prèv rejte",
        },
      }
    : {
        loadError: "Impossible de charger les articles de la boutique pour le moment.",
        operationsTitle: "Suivez vos achats et vos ventes",
        operationsDesc: "Gérez vos commandes, vos preuves de paiement et vos demandes d'assistance au même endroit.",
        buyerHistory: "Mes achats",
        sellerHistory: "Mes ventes",
        dashboard: "Tableau de bord vendeur",
        activeListings: "Annonces actives",
        salesOrders: "Commandes reçues",
        confirmedSales: "Ventes confirmées",
        sellerRevenue: "Revenus vendeur",
        actionRequired: "Action requise",
        noPurchases: "Vous n'avez pas encore d'achat dans la boutique.",
        noSales: "Vous n'avez pas encore reçu de commande client.",
        noListings: "Vous n'avez pas encore publié d'article.",
        payment: "Paiement",
        fulfillment: "Suivi",
        support: "Support",
        proof: "Preuve",
        reference: "Référence",
        seller: "Vendeur",
        buyer: "Acheteuse",
        orderDate: "Date",
        requestCancel: "Demander l'annulation",
        requestRefund: "Demander le remboursement",
        actionPending: "Demande en cours",
        requestSentTitle: "Demande envoyée",
        requestSentMessage: "Le support examinera votre demande rapidement.",
        requestErrorTitle: "Demande non envoyée",
        requestErrorMessage: "Impossible d'enregistrer la demande. Veuillez réessayer.",
        purchaseSuccessTitle: "Achat bien enregistré",
        purchaseSuccessMessage: "La confirmation et la facture sont prêtes. Vous pouvez suivre cette commande dans vos achats ci-dessous.",
        purchasePendingMessage: "Le paiement est enregistré. Le système ou l'équipe finalisera bientôt la vérification de cette commande.",
        viewPurchase: "Voir mon achat",
        dismissPurchaseSuccess: "Fermer le message",
        openHistory: "Mes achats et ventes",
        hideHistory: "Masquer l'historique",
        latestReference: "Dernière référence",
        statusLabels: {
          pending: "En attente",
          completed: "Confirmée",
          failed: "Échouée",
          cancelled: "Annulée",
          refunded: "Remboursée",
          awaiting_payment: "En attente de paiement",
          confirmed: "Confirmée",
          preparing: "Préparation",
          ready_for_pickup: "Prête au retrait",
          in_delivery: "En livraison",
          delivered: "Livrée",
          refund_requested: "Remboursement demandé",
          monitoring: "Suivi",
          action_required: "Action requise",
          resolved: "Résolue",
          none: "Aucun",
          pending_proof: "Preuve en attente",
          pending_request: "Demande en cours",
          missing: "Preuve manquante",
          provided: "Preuve fournie",
          verified: "Preuve vérifiée",
          rejected: "Preuve rejetée",
        },
      };
  const [items, setItems] = useState([]);
  const [availableShopNames, setAvailableShopNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [loadingError, setLoadingError] = useState("");
  const [buyerOrders, setBuyerOrders] = useState([]);
  const [sellerOrders, setSellerOrders] = useState([]);
  const [sellerItems, setSellerItems] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [orderActionLoading, setOrderActionLoading] = useState("");
  const [cartItemIds, setCartItemIds] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [shopQueryLimit, setShopQueryLimit] = useState(SHOP_QUERY_PAGE_SIZE);
  const [visibleItemCount, setVisibleItemCount] = useState(SHOP_VISIBLE_STEP);
  const [filters, setFilters] = useState({
    searchQuery: "",
    category: "all",
    condition: "all",
    minPrice: undefined,
    maxPrice: undefined,
    location: "",
    sellerSource: "all",
    shopName: "",
  });

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "vetements",
    condition: "good",
    sellerType: "individual",
    shopName: "",
    location: "",
    contact: "",
    moncashPhone: "", // Nouveau champ pour numéro MonCash du vendeur
    natcashPhone: "",
    sellerCoordinates: null,
    sellerLocationSource: "manual",
  });
  const [formImages, setFormImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [sellerGeoStatus, setSellerGeoStatus] = useState("idle");
  const [sellerGeoError, setSellerGeoError] = useState("");
  const [pendingDeleteItemId, setPendingDeleteItemId] = useState("");
  const [dialogState, setDialogState] = useState({
    open: false,
    tone: "info",
    title: "",
    message: "",
  });
  const boutiqueDialogText = language === "ht"
    ? {
        deleteTitle: "Efase atik sa a",
        deleteMessage: "Ou sèten ou vle retire atik sa a nan boutique la? Aksyon sa a ap retire li nan lis piblik la.",
        contactTitle: "Konvèsasyon",
      }
    : {
        deleteTitle: "Supprimer cet article",
        deleteMessage: "Voulez-vous vraiment retirer cet article de la boutique ? Cette action le retirera de la liste publique.",
        contactTitle: "Conversation",
      };

  const loadItems = useCallback(async (nextFilters = filters, requestedLimit = shopQueryLimit) => {
    setLoading(true);
    try {
      const data = await searchShopItems({
        ...nextFilters,
        limitCount: requestedLimit,
      });
      setLoadingError("");
      setItems(data);
      const nextShopNames = Array.from(
        new Set(
          data
            .map((item) => String(item.shopName || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
      setAvailableShopNames((current) =>
        Array.from(new Set([...current, ...nextShopNames])).sort((a, b) =>
          a.localeCompare(b, "fr", { sensitivity: "base" })
        )
      );
    } catch (e) {
      console.error("Error loading shop items:", e);
      setItems([]);
      setAvailableShopNames([]);
      setLoadingError(operationsText.loadError);
    }
    setLoading(false);
  }, [filters, operationsText.loadError, shopQueryLimit]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (!user?.uid) {
      setBuyerOrders([]);
      setSellerOrders([]);
      setSellerItems([]);
      setShowHistoryPanel(false);
      return;
    }

    loadShopActivity(user.uid);
  }, [user?.uid]);

  useEffect(() => {
    let isActive = true;

    function syncCart(nextItems = getShopCartItems(user?.uid)) {
      if (!isActive) {
        return;
      }

      const nextIds = nextItems.map((item) => item.id).filter(Boolean);
      setCartItemIds(nextIds);
      setCartCount(nextIds.length);
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

  function handleSearchItems(nextFilters = filters) {
    setVisibleItemCount(SHOP_VISIBLE_STEP);
    setShopQueryLimit(SHOP_QUERY_PAGE_SIZE);
    loadItems(nextFilters, SHOP_QUERY_PAGE_SIZE);
  }

  async function loadShopActivity(uid) {
    if (!uid) {
      return { buyerOrders: [], sellerOrders: [], sellerItems: [] };
    }

    setActivityLoading(true);
    try {
      const [nextBuyerOrders, nextSellerOrders, nextSellerItems] = await Promise.all([
        getBuyerShopOrders(uid),
        getSellerShopOrders(uid),
        getUserShopItems(uid),
      ]);
      setBuyerOrders(nextBuyerOrders);
      setSellerOrders(nextSellerOrders);
      setSellerItems(nextSellerItems);
      return {
        buyerOrders: nextBuyerOrders,
        sellerOrders: nextSellerOrders,
        sellerItems: nextSellerItems,
      };
    } catch (e) {
      console.error("Error loading shop activity:", e);
      setBuyerOrders([]);
      setSellerOrders([]);
      setSellerItems([]);
      return { buyerOrders: [], sellerOrders: [], sellerItems: [] };
    } finally {
      setActivityLoading(false);
    }
  }

  async function handleAddToCart(item) {
    if (!item?.id || item.authorId === user?.uid || String(item.status || "available").trim().toLowerCase() !== "available") {
      return;
    }

    const result = await addItemToShopCart({
      id: item.id,
      title: item.title || item.name,
      price: item.price,
      imageUrl: item.images?.[0]?.url,
      condition: item.condition,
      sellerName: item.authorName,
      shopName: item.shopName,
      status: item.status,
    }, {
      userId: user?.uid,
    });

    notifySystem(
      cartText.addedTitle,
      result.alreadyExists ? cartText.alreadyMessage : cartText.addedMessage
    );
  }

  function scrollToBuyerHistory() {
    setShowHistoryPanel(true);

    if (typeof document === "undefined") {
      return;
    }

    window.setTimeout(() => {
      const buyerHistorySection = document.getElementById("boutique-buyer-history");
      buyerHistorySection?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 160);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user || !form.title || !form.price) return;
    if (form.sellerType === "affiliate_shop" && !String(form.shopName || "").trim()) {
      notifySystem(
        language === "ht" ? "Non magazen obligatwa" : "Nom du magasin requis",
        language === "ht"
          ? "Pou yon atik magazen afilye, antre non magazen an."
          : "Pour un article de magasin affilié, indique le nom du magasin."
      );
      return;
    }
    setSubmitting(true);
    try {
      await createShopItem({
        ...form,
        price: parseFloat(form.price),
        images: formImages,
        authorId: user.uid,
        authorName: userProfile?.name || user.displayName || "Anonim",
      });
      
      // Notify about new item
      notifyItem(form.title, userProfile?.name || user.displayName || "Anonim");
      
      setForm({
        title: "",
        description: "",
        price: "",
        category: "vetements",
        condition: "good",
        sellerType: "individual",
        shopName: "",
        location: "",
        contact: "",
        moncashPhone: "",
        natcashPhone: "",
        sellerCoordinates: null,
        sellerLocationSource: "manual",
      });
      setFormImages([]);
      setSellerGeoStatus("idle");
      setSellerGeoError("");
      setShowForm(false);
      await loadItems();
      await loadShopActivity(user.uid);
    } catch (e) {
      console.error("Error creating item:", e);
    }
    setSubmitting(false);
  }

  function requestSellerLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setSellerGeoStatus("error");
      setSellerGeoError(sellerGpsText.unavailable);
      return;
    }

    setSellerGeoStatus("loading");
    setSellerGeoError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          sellerCoordinates: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          sellerLocationSource: "gps",
        }));
        setSellerGeoStatus("success");
      },
      () => {
        setSellerGeoStatus("error");
        setSellerGeoError(sellerGpsText.denied);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }

  async function handleDelete(itemId) {
    setPendingDeleteItemId(itemId);
  }

  async function confirmDeleteItem(itemId) {
    try {
      await deleteShopItem(itemId);
      setPendingDeleteItemId("");
      await loadItems();
      if (user?.uid) {
        await loadShopActivity(user.uid);
      }
    } catch (e) {
      console.error("Error deleting item:", e);
      setDialogState({
        open: true,
        tone: "error",
        title: boutiqueDialogText.deleteTitle,
        message: operationsText.requestErrorMessage,
      });
    }
  }

  async function handleMarkSold(itemId) {
    try {
      await markItemSold(itemId);
      setItems(items.filter((i) => i.id !== itemId));
      if (user?.uid) {
        await loadShopActivity(user.uid);
      }
    } catch (e) {
      console.error("Error marking sold:", e);
    }
  }

  function getPaymentStatusMeta(order) {
    const key = normalizeStatusValue(order?.paymentStatus || order?.status, "pending");

    if (key === "completed") {
      return { key, label: operationsText.statusLabels.completed, className: "bg-emerald-100 text-emerald-700" };
    }

    if (key === "refunded") {
      return { key, label: operationsText.statusLabels.refunded, className: "bg-slate-200 text-slate-700" };
    }

    if (["failed", "cancelled"].includes(key)) {
      return { key, label: operationsText.statusLabels[key], className: "bg-red-100 text-red-700" };
    }

    return { key, label: operationsText.statusLabels.pending, className: "bg-amber-100 text-amber-700" };
  }

  function getFulfillmentStatusMeta(order) {
    const fallback = getPaymentStatusMeta(order).key === "completed" ? "confirmed" : "awaiting_payment";
    const key = normalizeStatusValue(order?.fulfillmentStatus, fallback);
    const className = ["delivered", "confirmed", "ready_for_pickup"].includes(key)
      ? "bg-emerald-100 text-emerald-700"
      : ["cancelled", "refunded", "refund_requested"].includes(key)
        ? "bg-slate-200 text-slate-700"
        : key === "in_delivery" || key === "preparing"
          ? "bg-[#fff0f3] text-[#D63C54]"
          : "bg-amber-100 text-amber-700";

    return {
      key,
      label: operationsText.statusLabels[key] || key,
      className,
    };
  }

  function getSupportStatusMeta(order) {
    const fallback = order?.actionRequestStatus === "pending" ? "action_required" : "none";
    const key = normalizeStatusValue(order?.supportStatus, fallback);
    const className = key === "resolved"
      ? "bg-emerald-100 text-emerald-700"
      : key === "refunded"
        ? "bg-slate-200 text-slate-700"
        : key === "action_required"
          ? "bg-red-100 text-red-700"
          : key === "monitoring"
            ? "bg-amber-100 text-amber-700"
            : "bg-slate-100 text-slate-600";

    return {
      key,
      label: operationsText.statusLabels[key] || key,
      className,
    };
  }

  function getProofStatusMeta(order) {
    const fallback = order?.paymentProofReference || order?.referenceNumber || order?.transactionId
      ? "provided"
      : "pending";
    const key = normalizeStatusValue(order?.paymentProofStatus, fallback);
    const className = key === "verified"
      ? "bg-emerald-100 text-emerald-700"
      : key === "provided"
        ? "bg-[#fff0f3] text-[#D63C54]"
        : key === "rejected"
          ? "bg-red-100 text-red-700"
          : key === "missing"
            ? "bg-slate-200 text-slate-700"
            : "bg-amber-100 text-amber-700";

    return {
      key,
      label: operationsText.statusLabels[key] || key,
      className,
    };
  }

  function formatOrderDate(value) {
    const date = getTimestampDate(value);
    if (!date) {
      return "";
    }

    return date.toLocaleDateString(language === "ht" ? "ht-HT" : "fr-HT", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  async function handleOrderActionRequest(order, actionType) {
    if (!user?.uid || !order?.id) {
      return;
    }

    const actionKey = `${order.id}:${actionType}`;
    setOrderActionLoading(actionKey);
    try {
      await requestShopOrderAction(order.id, {
        actionType,
        requestedBy: user.uid,
        note: `${actionType}:${user.uid}`,
      });
      notifySystem(operationsText.requestSentTitle, operationsText.requestSentMessage);
      await loadShopActivity(user.uid);
    } catch (e) {
      console.error("Error requesting order action:", e);
      notifySystem(operationsText.requestErrorTitle, operationsText.requestErrorMessage);
    } finally {
      setOrderActionLoading("");
    }
  }

  function handleShopFilterSelect(shopName) {
    const nextFilters = {
      ...filters,
      sellerSource: "affiliate_shop",
      shopName: shopName || "",
    };
    setFilters(nextFilters);
    handleSearchItems(nextFilters);
  }

  const filteredItems = items;
  const visibleItems = filteredItems.slice(0, visibleItemCount);
  const canLoadMoreItems = filteredItems.length > visibleItemCount || items.length >= shopQueryLimit;
  const affiliateShopCards = availableShopNames.map((shopName) => {
    const shopItems = items.filter((item) => String(item.shopName || "").trim() === shopName);
    const firstItem = shopItems[0];
    return {
      name: shopName,
      count: shopItems.length,
      location: firstItem?.location || "",
      hasActiveFilter: filters.shopName === shopName,
    };
  });
  const activeSellerItemsCount = sellerItems.filter((item) => item.status !== "sold").length;
  const settledSellerOrders = sellerOrders.filter((order) => getPaymentStatusMeta(order).key === "completed");
  const sellerRevenue = settledSellerOrders.reduce((sum, order) => sum + (Number(order.sellerAmount) || 0), 0);
  const sellerActionRequiredCount = sellerOrders.filter((order) => {
    const supportKey = getSupportStatusMeta(order).key;
    return supportKey === "action_required" || order.actionRequestStatus === "pending";
  }).length;

  async function handleLoadMoreItems() {
    const nextVisibleItemCount = visibleItemCount + SHOP_VISIBLE_STEP;
    setVisibleItemCount(nextVisibleItemCount);

    if (nextVisibleItemCount > shopQueryLimit) {
      const nextQueryLimit = shopQueryLimit + SHOP_QUERY_PAGE_SIZE;
      setShopQueryLimit(nextQueryLimit);
      await loadItems(filters, nextQueryLimit);
    }
  }

  return (
    <div className="space-y-8 rounded-[2.5rem] bg-[radial-gradient(circle_at_top,_rgba(214,60,84,0.08),_transparent_28%),linear-gradient(180deg,_rgba(255,250,251,0.99)_0%,_rgba(255,246,247,0.98)_42%,_rgba(255,255,255,1)_100%)] p-3 sm:p-4 lg:p-5">
      {/* Header */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.9fr)]">
        <div className="relative overflow-hidden rounded-[2.2rem] border border-[#f0d8dc] bg-[linear-gradient(135deg,_rgba(255,255,255,0.99)_0%,_rgba(255,244,246,0.98)_52%,_rgba(252,237,240,0.96)_100%)] p-5 shadow-[0_26px_72px_-42px_rgba(214,60,84,0.2)] sm:p-7">
          <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_center,_rgba(214,60,84,0.14),_transparent_62%)] lg:block" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#D63C54] shadow-sm backdrop-blur">
              <Search className="h-3.5 w-3.5" />
              {t("marketplace")}
            </div>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-[#F04A64] via-[#D63C54] to-[#B91C3C] shadow-[0_20px_44px_-18px_rgba(214,60,84,0.42)]">
                <ShoppingBag className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  {t("boutiqueTitle")}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                  {t("boutiqueDesc")}
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.4rem] border border-white/90 bg-white/88 px-4 py-3 text-sm text-slate-600 shadow-sm backdrop-blur">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#D63C54]">
                  {language === "ht" ? "Katalòg" : "Catalogue"}
                </div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">{filteredItems.length}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {language === "ht" ? "atik disponib" : filteredItems.length > 1 ? "articles disponibles" : "article disponible"}
                </div>
              </div>
              <div className="rounded-[1.4rem] border border-white/90 bg-white/88 px-4 py-3 text-sm text-slate-600 shadow-sm backdrop-blur">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#D63C54]">
                  {language === "ht" ? "Patnè" : "Partenaires"}
                </div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">{affiliateShopCards.length}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {language === "ht" ? "boutik patnè" : affiliateShopCards.length > 1 ? "boutiques partenaires" : "boutique partenaire"}
                </div>
              </div>
              <div className="rounded-[1.4rem] border border-white/90 bg-white/88 px-4 py-3 text-sm text-slate-600 shadow-sm backdrop-blur">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#D63C54]">
                  {user ? operationsText.buyerHistory : t("securePayment")}
                </div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">{user ? buyerOrders.length : visibleItems.length}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {user
                    ? language === "ht"
                      ? "acha resan"
                      : "achats récents"
                    : language === "ht"
                      ? "peyman pwoteje"
                      : "paiement protégé"}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <Button
            asChild
            variant="outline"
            className="h-auto w-full rounded-[1.7rem] border-[#f0d8dc] bg-white/92 px-5 py-5 text-sm font-medium text-[#D63C54] shadow-[0_12px_28px_-24px_rgba(214,60,84,0.14)] transition-all hover:bg-white"
          >
            <Link href="/boutique/panier">
              <ShoppingCart className="mr-2 h-4 w-4" />
              {cartText.title}
              <span className="ml-2 rounded-full bg-[#D63C54]/10 px-2 py-0.5 text-xs text-[#D63C54]">
                {cartCount}
              </span>
            </Link>
          </Button>
          {user ? (
            <Button
              onClick={() => setShowForm(!showForm)}
              className="h-auto w-full rounded-[1.7rem] bg-gradient-to-r from-[#F04A64] to-[#C81E3A] px-5 py-5 text-sm shadow-[0_22px_52px_-24px_rgba(214,60,84,0.4)] transition-all hover:-translate-y-0.5 hover:brightness-105"
            >
              {showForm ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
              {showForm ? t("reset") : t("sellItem")}
            </Button>
          ) : null}
          {user ? (
            <Button
              variant="outline"
              onClick={() => setShowHistoryPanel((prev) => !prev)}
              className="h-auto w-full rounded-[1.7rem] border-[#f0d8dc] bg-white/92 px-5 py-5 text-sm font-medium text-[#D63C54] shadow-sm transition-all hover:bg-white"
            >
              <Store className="mr-2 h-4 w-4" />
              {showHistoryPanel ? operationsText.hideHistory : operationsText.openHistory}
              <span className="ml-2 rounded-full bg-[#D63C54]/10 px-2 py-0.5 text-xs text-[#D63C54]">
                {buyerOrders.length + sellerOrders.length}
              </span>
            </Button>
          ) : null}
          <div className="rounded-[2rem] border border-white/90 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(255,246,247,0.96)_100%)] p-5 shadow-[0_22px_52px_-34px_rgba(214,60,84,0.16)] backdrop-blur xl:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D63C54]/10 text-[#D63C54]">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">{operationsText.operationsTitle}</div>
                <div className="mt-1 text-xs leading-5 text-slate-500">{operationsText.operationsDesc}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Filters */}
      <SearchFilters
        filters={filters}
        onChange={setFilters}
        onSearch={handleSearchItems}
        shopOptions={availableShopNames}
      />

      {user && showHistoryPanel && (
        <Card className="overflow-hidden rounded-[2rem] border border-white/90 bg-[linear-gradient(135deg,_rgba(255,255,255,0.99)_0%,_rgba(255,247,248,0.98)_55%,_rgba(255,242,245,0.97)_100%)] shadow-[0_20px_44px_-34px_rgba(214,60,84,0.08)]">
          <CardContent className="p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{operationsText.operationsTitle}</h2>
                <p className="mt-1 text-sm text-slate-500">{operationsText.operationsDesc}</p>
              </div>
              {user?.uid && (
                <Link href={`/reviews/${user.uid}`} className="text-sm font-medium text-[#D63C54] hover:underline">
                  {t("reviews")}
                </Link>
              )}
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[1.5rem] border border-white/90 bg-white p-4 shadow-[0_12px_24px_-22px_rgba(214,60,84,0.06)]">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{operationsText.activeListings}</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{activeSellerItemsCount}</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/90 bg-white p-4 shadow-[0_12px_24px_-22px_rgba(214,60,84,0.06)]">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{operationsText.salesOrders}</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{sellerOrders.length}</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/90 bg-white p-4 shadow-[0_12px_24px_-22px_rgba(214,60,84,0.06)]">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{operationsText.confirmedSales}</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{settledSellerOrders.length}</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/90 bg-white p-4 shadow-[0_12px_24px_-22px_rgba(214,60,84,0.06)]">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{operationsText.sellerRevenue}</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{formatShopMoney(sellerRevenue)}</div>
                <div className="mt-1 text-xs text-[#D63C54]">{operationsText.actionRequired}: {sellerActionRequiredCount}</div>
              </div>
            </div>

            {activityLoading ? (
              <div className="mt-6 text-sm text-slate-500">{t("loadingItems")}</div>
            ) : (
              <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <div id="boutique-buyer-history" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">{operationsText.buyerHistory}</h3>
                    <span className="text-xs font-medium text-slate-400">{buyerOrders.length}</span>
                  </div>

                  {buyerOrders.length === 0 ? (
                    <div className="rounded-[1.5rem] border border-dashed border-[#f0d8dc] bg-white p-5 text-sm text-slate-500 shadow-[0_12px_24px_-22px_rgba(214,60,84,0.06)]">
                      {operationsText.noPurchases}
                    </div>
                  ) : (
                    buyerOrders.slice(0, 6).map((order) => {
                      const paymentMeta = getPaymentStatusMeta(order);
                      const fulfillmentMeta = getFulfillmentStatusMeta(order);
                      const supportMeta = getSupportStatusMeta(order);
                      const proofMeta = getProofStatusMeta(order);
                      const isActionPending = normalizeStatusValue(order.actionRequestStatus) === "pending";
                      const canRequestCancel = !isActionPending && ["pending"].includes(paymentMeta.key);
                      const canRequestRefund = !isActionPending && paymentMeta.key === "completed" && !["refunded", "cancelled"].includes(fulfillmentMeta.key);
                      return (
                        <div key={order.id} className="rounded-[1.5rem] border border-white/90 bg-white p-4 shadow-[0_12px_24px_-22px_rgba(214,60,84,0.06)]">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">{order.itemTitle || t("item")}</div>
                              <div className="mt-1 text-xs text-slate-500">{operationsText.orderDate}: {formatOrderDate(order.createdAt)}</div>
                            </div>
                            <div className="sm:text-right">
                              <div className="text-sm font-semibold text-[#D63C54]">{formatShopMoney(order.totalAmount || order.itemPrice)}</div>
                              <div className="mt-1 text-xs text-slate-500">{operationsText.seller}: {order.sellerId ? <Link href={`/reviews/${order.sellerId}`} className="hover:underline">{order.sellerName || "-"}</Link> : order.sellerName || "-"}</div>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge className={`rounded-full ${paymentMeta.className}`}>{operationsText.payment}: {paymentMeta.label}</Badge>
                            <Badge className={`rounded-full ${fulfillmentMeta.className}`}>{operationsText.fulfillment}: {fulfillmentMeta.label}</Badge>
                            <Badge className={`rounded-full ${supportMeta.className}`}>{operationsText.support}: {supportMeta.label}</Badge>
                            <Badge className={`rounded-full ${proofMeta.className}`}>{operationsText.proof}: {proofMeta.label}</Badge>
                          </div>

                          <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                            <div>{operationsText.reference}: {order.paymentProofReference || order.referenceNumber || order.transactionId || "-"}</div>
                            <div>{operationsText.buyer}: {order.buyerName || "-"}</div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {isActionPending && (
                              <Badge className="rounded-full bg-[#fff0f3] text-[#D63C54]">{operationsText.actionPending}</Badge>
                            )}
                            {canRequestCancel && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl border-[#f0d8dc] bg-white shadow-[0_10px_22px_-20px_rgba(214,60,84,0.06)] transition-all hover:bg-white"
                                disabled={orderActionLoading === `${order.id}:cancel`}
                                onClick={() => handleOrderActionRequest(order, "cancel")}
                              >
                                {operationsText.requestCancel}
                              </Button>
                            )}
                            {canRequestRefund && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl border-[#f0d8dc] bg-white shadow-[0_10px_22px_-20px_rgba(214,60,84,0.06)] transition-all hover:bg-white"
                                disabled={orderActionLoading === `${order.id}:refund`}
                                onClick={() => handleOrderActionRequest(order, "refund")}
                              >
                                {operationsText.requestRefund}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">{operationsText.sellerHistory}</h3>
                    <span className="text-xs font-medium text-slate-400">{sellerOrders.length}</span>
                  </div>

                  {sellerOrders.length === 0 ? (
                    <div className="rounded-[1.5rem] border border-dashed border-[#f0d8dc] bg-white p-5 text-sm text-slate-500 shadow-[0_12px_24px_-22px_rgba(214,60,84,0.06)]">
                      {sellerItems.length === 0 ? operationsText.noListings : operationsText.noSales}
                    </div>
                  ) : (
                    sellerOrders.slice(0, 6).map((order) => {
                      const paymentMeta = getPaymentStatusMeta(order);
                      const fulfillmentMeta = getFulfillmentStatusMeta(order);
                      const supportMeta = getSupportStatusMeta(order);
                      const proofMeta = getProofStatusMeta(order);
                      return (
                        <div key={order.id} className="rounded-[1.5rem] border border-white/90 bg-white p-4 shadow-[0_12px_24px_-22px_rgba(214,60,84,0.06)]">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">{order.itemTitle || t("item")}</div>
                              <div className="mt-1 text-xs text-slate-500">{operationsText.orderDate}: {formatOrderDate(order.createdAt)}</div>
                            </div>
                            <div className="sm:text-right">
                              <div className="text-sm font-semibold text-[#D63C54]">{formatShopMoney(order.sellerAmount || order.totalAmount || order.itemPrice)}</div>
                              <div className="mt-1 text-xs text-slate-500">{operationsText.buyer}: {order.buyerName || "-"}</div>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge className={`rounded-full ${paymentMeta.className}`}>{operationsText.payment}: {paymentMeta.label}</Badge>
                            <Badge className={`rounded-full ${fulfillmentMeta.className}`}>{operationsText.fulfillment}: {fulfillmentMeta.label}</Badge>
                            <Badge className={`rounded-full ${supportMeta.className}`}>{operationsText.support}: {supportMeta.label}</Badge>
                            <Badge className={`rounded-full ${proofMeta.className}`}>{operationsText.proof}: {proofMeta.label}</Badge>
                          </div>

                          <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                            <div>{operationsText.reference}: {order.paymentProofReference || order.referenceNumber || order.transactionId || "-"}</div>
                            <div>{operationsText.seller}: {order.sellerName || userProfile?.name || user?.displayName || "-"}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden rounded-[2rem] border border-white/90 bg-[linear-gradient(135deg,_rgba(255,255,255,0.99)_0%,_rgba(255,247,248,0.98)_55%,_rgba(255,242,245,0.97)_100%)] shadow-[0_24px_60px_-40px_rgba(214,60,84,0.08)]">
        <CardContent className="p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[#D63C54]">
                <Store className="h-6 w-6" />
                <span className="text-sm font-semibold uppercase tracking-wide">
                  {language === "ht" ? "Boutik patnè" : "Boutiques partenaires"}
                </span>
              </div>
              <h2 className="mt-2 text-xl font-semibold">
                {language === "ht"
                  ? "Dekouvri magazen afilye yo nan boutik la"
                  : "Découvrez les magasins affiliés dans la boutique"}
              </h2>
              {affiliateShopCards.length > 0 && (
                <p className="mt-1 text-sm text-slate-500">
                  {language === "ht"
                    ? "Chwazi yon boutik pou wè tout atik li yo."
                    : "Choisissez une boutique pour voir tous ses articles."}
                </p>
              )}
            </div>

            {filters.shopName && (
              <Button
                variant="outline"
                className="w-full rounded-xl border-[#f0d8dc] bg-white shadow-[0_10px_26px_-22px_rgba(214,60,84,0.12)] transition-all hover:bg-white sm:w-auto"
                onClick={() => handleShopFilterSelect("")}
              >
                {language === "ht" ? "Wè tout boutik yo" : "Voir toutes les boutiques"}
              </Button>
            )}
          </div>

          {affiliateShopCards.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {affiliateShopCards.map((shop) => (
                <button
                  key={shop.name}
                  type="button"
                  onClick={() => handleShopFilterSelect(shop.name)}
                  className={`rounded-[1.45rem] border p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-30px_rgba(214,60,84,0.12)] ${
                    shop.hasActiveFilter
                      ? "border-[#f3c7d0] bg-[linear-gradient(180deg,_rgba(255,243,246,0.98)_0%,_rgba(255,250,251,0.96)_100%)] shadow-[0_16px_34px_-28px_rgba(214,60,84,0.1)]"
                      : "border-white/90 bg-white shadow-[0_16px_34px_-28px_rgba(214,60,84,0.08)]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-[#fff1f4] text-[#D63C54]">
                      <Store className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-semibold text-slate-900">{shop.name}</h3>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span className="rounded-full bg-[#fff4f6] px-2.5 py-1 text-[#D63C54]">
                              {shop.count} {language === "ht" ? "atik" : shop.count > 1 ? "articles" : "article"}
                            </span>
                            {shop.location && (
                              <span className="rounded-full bg-slate-50 px-2.5 py-1 text-slate-500">
                                {shop.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge className="rounded-full bg-[#fff1f4] text-[#D63C54]">
                          {sellerTypeLabels.affiliate_shop}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm font-medium text-[#D63C54]">
                    <span>
                      {shop.hasActiveFilter
                        ? language === "ht"
                          ? "Boutik aktif"
                          : "Boutique active"
                        : language === "ht"
                          ? "Wè atik yo"
                          : "Voir les articles"}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-[#f0d8dc] bg-white p-6 text-center shadow-[0_16px_34px_-28px_rgba(214,60,84,0.08)] backdrop-blur-sm">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-[#fff1f4] text-[#D63C54]">
                <Store className="h-10 w-10" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                {language === "ht" ? "Pa gen boutik afilye pou kounye a" : "Aucune boutique affiliée pour le moment"}
              </h3>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Post form */}
      {showForm && (
        <Card className="rounded-[2rem] border border-white/90 bg-[linear-gradient(135deg,_rgba(255,255,255,0.99)_0%,_rgba(255,247,248,0.98)_55%,_rgba(255,242,245,0.98)_100%)] shadow-[0_20px_44px_-34px_rgba(214,60,84,0.08)]">
          <CardContent className="p-6">
            <h2 className="mb-4 text-lg font-bold">{t("sellItem")}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{t("itemName")} *</label>
                  <Input
                    placeholder={t("itemExample")}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="rounded-xl border-[#e6d5db] bg-white/90 shadow-sm"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{t("price")} (HTG) *</label>
                  <Input
                    type="number"
                    placeholder={t("priceExample")}
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="rounded-xl border-[#e6d5db] bg-white/90 shadow-sm"
                    required
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{t("itemDescription")}</label>
                <Textarea
                  placeholder={t("descriptionExample")}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="min-h-[80px] rounded-xl border-[#e6d5db] bg-white/90 shadow-sm"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    {language === "ht" ? "Kalite vandè" : "Type de vendeur"}
                  </label>
                  <select
                    value={form.sellerType}
                    onChange={(e) => setForm({ ...form, sellerType: e.target.value })}
                    className="w-full rounded-xl border border-[#e6d5db] bg-white/90 px-3 py-2 text-sm shadow-sm"
                  >
                    <option value="individual">{sellerTypeLabels.individual}</option>
                    <option value="affiliate_shop">{sellerTypeLabels.affiliate_shop}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    {language === "ht" ? "Non magazen / boutik" : "Nom du magasin / boutique"}
                    {form.sellerType === "affiliate_shop" ? " *" : ""}
                  </label>
                  <Input
                    placeholder={language === "ht" ? "Egzanp: Boutik Manman" : "Ex : Boutique Maman"}
                    value={form.shopName}
                    onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                    className="rounded-xl border-[#e6d5db] bg-white/90 shadow-sm"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{t("allCategories")}</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-xl border border-[#e6d5db] bg-white/90 px-3 py-2 text-sm shadow-sm"
                  >
                    {categories.filter((c) => c.id !== "all").map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{t("condition")}</label>
                  <select
                    value={form.condition}
                    onChange={(e) => setForm({ ...form, condition: e.target.value })}
                    className="w-full rounded-xl border border-[#e6d5db] bg-white/90 px-3 py-2 text-sm shadow-sm"
                  >
                    <option value="new">{t("new")}</option>
                    <option value="like-new">{t("likeNew")}</option>
                    <option value="good">{t("good")}</option>
                    <option value="used">{t("used")}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{t("location")}</label>
                  <Input
                    placeholder={t("locationExample")}
                    value={form.location}
                    onChange={(e) => setForm({
                      ...form,
                      location: e.target.value,
                      sellerLocationSource: "manual",
                    })}
                    className="rounded-xl border-[#e6d5db] bg-white/90 shadow-sm"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-orange-100 bg-[linear-gradient(135deg,_rgba(255,247,237,0.96)_0%,_rgba(255,251,235,0.96)_100%)] p-4 shadow-[0_18px_42px_-34px_rgba(251,146,60,0.26)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-800">
                      {t("sellerLocation")}
                    </p>
                    <p className="text-xs text-orange-700">
                      {sellerGpsText.help}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={requestSellerLocation}
                    className="rounded-xl border-orange-200 bg-white text-orange-700 hover:bg-orange-100"
                  >
                    {sellerGeoStatus === "loading" ? sellerGpsText.loading : sellerGpsText.button}
                  </Button>
                </div>
                {form.sellerCoordinates && (
                  <p className="mt-3 text-xs text-green-700">
                    {sellerGpsText.ready} {form.sellerCoordinates.lat.toFixed(5)}, {form.sellerCoordinates.lng.toFixed(5)}
                  </p>
                )}
                {sellerGeoError && (
                  <p className="mt-3 text-xs text-red-600">{sellerGeoError}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{t("contactInfo")}</label>
                <Input
                  placeholder={t("contactExample")}
                  value={form.contact}
                  onChange={(e) => setForm({ ...form, contact: e.target.value })}
                  className="rounded-xl border-[#e6d5db] bg-white/90 shadow-sm"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  📱 {t("sellerMonCashNumber") || "Numéro MonCash (vendeur)"}
                </label>
                <Input
                  placeholder="+509 34 56 78 90"
                  value={form.moncashPhone}
                  onChange={(e) => setForm({ ...form, moncashPhone: e.target.value })}
                  className="rounded-xl border-[#e6d5db] bg-white/90 shadow-sm"
                />
                <p className="mt-1 text-xs text-slate-500">
                  {t("receivePaymentsText") || "Pour recevoir les paiements directement sur votre compte MonCash"}
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  📱 {t("sellerNatCashNumber") || "Numéro NatCash (vendeur)"}
                </label>
                <Input
                  placeholder="+509 34 56 78 90"
                  value={form.natcashPhone}
                  onChange={(e) => setForm({ ...form, natcashPhone: e.target.value })}
                  className="rounded-xl border-[#e6d5db] bg-white/90 shadow-sm"
                />
                <p className="mt-1 text-xs text-slate-500">
                  {t("receiveNatCashPaymentsText") || "Pour recevoir les paiements NatCash directement sur votre compte NatCash"}
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{t("images")}</label>
                <ImageUpload
                  images={formImages}
                  onChange={setFormImages}
                  maxImages={5}
                  pathPrefix={user ? `shop-items/${user.uid}` : "shop-items"}
                />
              </div>

              <Button
                type="submit"
                disabled={submitting || !form.title || !form.price}
                className="rounded-2xl bg-gradient-to-r from-[#F04A64] to-[#C81E3A] px-6 shadow-[0_16px_30px_-20px_rgba(214,60,84,0.18)] transition-all hover:shadow-[0_18px_34px_-20px_rgba(214,60,84,0.24)] hover:brightness-105"
              >
                {submitting ? t("sending") + "..." : t("publish")}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Items grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">{t("loadingItems")}</div>
      ) : loadingError ? (
        <Card className="rounded-[2rem] border border-white/90 bg-white shadow-[0_18px_36px_-28px_rgba(214,60,84,0.08)] backdrop-blur-sm">
          <CardContent className="py-16 text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-semibold">{operationsText.loadError}</h3>
            <Button className="mt-4 rounded-2xl" onClick={() => loadItems()}>
              {t("retry") || (language === "ht" ? "Eseye ankò" : "Réessayer")}
            </Button>
          </CardContent>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card className="rounded-[2rem] border border-white/90 bg-white shadow-[0_18px_36px_-28px_rgba(214,60,84,0.08)] backdrop-blur-sm">
          <CardContent className="py-16 text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-semibold">{t("noItems")}</h3>
            <p className="mt-2 text-sm text-slate-500">
              {user
                ? t("startSellingFirstItem")
                : t("connectToSellOrSeeMore")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visibleItems.map((item) => (
              <Card
                key={item.id}
                id={item.id}
                className="group card-hover overflow-hidden rounded-[1.9rem] border border-white/90 bg-[linear-gradient(180deg,_rgba(255,255,255,1)_0%,_rgba(255,248,249,0.99)_100%)] shadow-[0_18px_36px_-28px_rgba(214,60,84,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_44px_-30px_rgba(214,60,84,0.12)]"
              >
                {/* Images */}
                <Link href={`/boutique/${item.id}`} className="block">
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
                        <div className="absolute right-3 top-3 flex h-7 min-w-7 items-center justify-center rounded-full border border-white/30 bg-slate-950/55 px-2 text-xs text-white backdrop-blur-sm">
                          +{item.images.length - 1}
                        </div>
                      )}
                      <div className="hidden h-full w-full items-center justify-center bg-gradient-to-br from-white to-[#fff0f2]">
                        <ImageIcon className="h-10 w-10 text-slate-300" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-48 w-full items-center justify-center bg-gradient-to-br from-white via-[#fff4f6] to-[#ffe9ed]">
                      <ShoppingBag className="h-10 w-10 text-slate-300" />
                    </div>
                  )}
                </Link>

                <CardContent className="flex h-full flex-col p-4">
                  <div className="flex flex-1 flex-col">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge className={`rounded-full text-xs ${conditionColors[item.condition] || "bg-slate-100 text-slate-600"}`}>
                        {conditionLabels[item.condition] || item.condition}
                      </Badge>
                      {item.category && (
                        <Badge variant="secondary" className="rounded-full bg-white text-xs text-slate-700 shadow-sm">
                          {categories.find((c) => c.id === item.category)?.label || item.category}
                        </Badge>
                      )}
                      {(item.sellerType === "affiliate_shop" || item.shopName) && (
                        <Badge className="rounded-full bg-[#ffecef] text-[#D63C54] text-xs">
                          {sellerTypeLabels.affiliate_shop}
                        </Badge>
                      )}
                    </div>

                    <div className="mt-3 flex items-start justify-between gap-3">
                      <Link href={`/boutique/${item.id}`} className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-lg font-semibold leading-tight text-slate-900 transition-colors hover:text-[#D63C54]">{item.title}</h3>
                      </Link>
                      <div className="shrink-0 rounded-[1.1rem] border border-[#f3d3da] bg-[#fff6f7] px-3 py-2 text-right shadow-[0_12px_24px_-22px_rgba(214,60,84,0.1)]">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d98091]">{t("price")}</div>
                        <div className="mt-1 text-base font-bold text-[#D63C54]">{item.price?.toLocaleString()} HTG</div>
                      </div>
                    </div>

                    <div className={`mt-4 grid gap-2 ${user && item.authorId === user.uid ? "" : "sm:grid-cols-2"}`}>
                      <Button
                        asChild
                        variant="outline"
                        className="w-full rounded-[1rem] border-[#f0d8dc] bg-white py-2.5 text-sm font-medium text-[#D63C54] shadow-[0_10px_22px_-20px_rgba(214,60,84,0.06)] transition-all hover:bg-[#fff5f6]"
                      >
                        <Link href={`/boutique/${item.id}`}>
                          {t("viewDetails")}
                        </Link>
                      </Button>
                      {(!user || item.authorId !== user.uid) ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full rounded-[1rem] border-[#f0d8dc] bg-white py-2.5 text-sm font-medium text-slate-700 shadow-[0_10px_22px_-20px_rgba(214,60,84,0.06)] transition-all hover:bg-[#fff5f6]"
                          onClick={() => handleAddToCart(item)}
                          disabled={cartItemIds.includes(item.id)}
                        >
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          {cartItemIds.includes(item.id) ? cartText.added : cartText.add}
                        </Button>
                      ) : null}
                    </div>

                    {/* Owner actions */}
                    {user && item.authorId === user.uid && (
                      <div className="mt-4 flex flex-col gap-2 border-t border-[#f4e1e5] pt-4 sm:flex-row">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 rounded-xl border-[#f0d8dc] bg-white text-xs text-[#D63C54]"
                          onClick={() => handleMarkSold(item.id)}
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          {t("sell")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl border-red-200 bg-white text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {canLoadMoreItems ? (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-2xl border-[#e6d5db] bg-white/88 px-5 shadow-sm transition-all hover:bg-white sm:w-auto"
                onClick={handleLoadMoreItems}
                disabled={loading}
              >
                {loading
                  ? language === "ht" ? "Chajman an ap kontinye..." : "Chargement en cours..."
                  : language === "ht" ? "Chaje plis atik" : "Charger plus d'articles"}
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {/* Info section */}
      {!user && (
        <Card className="rounded-[2rem] border border-white/90 bg-[linear-gradient(135deg,_rgba(255,250,251,0.99)_0%,_rgba(255,255,255,0.99)_100%)] shadow-[0_18px_36px_-28px_rgba(214,60,84,0.08)]">
          <CardContent className="p-8 text-center">
            <Heart className="mx-auto h-10 w-10 text-[#D63C54]" />
            <h3 className="mt-3 text-lg font-bold">{t("welcomeTitle")}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {t("welcomeDesc")}
            </p>
            <Button
              className="mt-4 rounded-2xl bg-gradient-to-r from-[#F04A64] to-[#C81E3A] shadow-[0_16px_30px_-20px_rgba(214,60,84,0.18)]"
              onClick={() => (window.location.href = "/register")}
            >
              {t("signUpNow")}
            </Button>
          </CardContent>
        </Card>
      )}

      <ActionDialog
        open={Boolean(pendingDeleteItemId)}
        tone="danger"
        title={boutiqueDialogText.deleteTitle}
        message={boutiqueDialogText.deleteMessage}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        closeLabel={t("close")}
        loadingLabel={t("loading")}
        onClose={() => setPendingDeleteItemId("")}
        onConfirm={() => confirmDeleteItem(pendingDeleteItemId)}
      />

      <ActionDialog
        open={dialogState.open}
        tone={dialogState.tone}
        title={dialogState.title}
        message={dialogState.message}
        closeLabel={t("close")}
        onClose={() => setDialogState((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
