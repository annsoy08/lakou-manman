"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  createShopItem,
  deleteShopItem, 
  markItemSold,
  createConversationRequest,
  toggleFavorite,
  isItemFavorite,
  searchShopItems,
  getBuyerShopOrders,
  getSellerShopOrders,
  getUserShopItems,
  requestShopOrderAction,
} from "@/lib/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import ActionDialog from "@/components/ui/action-dialog";
import SearchFilters from "@/components/ui/SearchFilters";
import PaymentForm from "@/components/PaymentForm";
import {
  ShoppingBag,
  Plus,
  X,
  Tag,
  MapPin,
  Phone,
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
  MessageCircle,
  Store,
  ArrowRight,
} from "lucide-react";
import ImageUpload from "@/components/ui/ImageUpload";
import { RatingDisplay } from "@/components/ui/StarRating";

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
  "like-new": "bg-sky-100 text-sky-700",
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
  const { notifyFavorite, notifyItem, notifySystem } = useNotifications();
  const { t, language } = useLanguage();
  const categories = getCategories(t);
  const conditionLabels = getConditionLabels(t);
  const sellerTypeLabels = getSellerTypeLabels(language);
  const router = useRouter();
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
        purchaseSuccessTitle: "Acha a anrejistre",
        purchaseSuccessMessage: "Konfimasyon ak fakti a byen prepare. Ou ka suiv kòmand sa a nan acha ou yo pi ba a.",
        purchasePendingMessage: "Peman an anrejistre. Ekip la oswa sistèm nan ap finalize verifikasyon kòmand sa a byento.",
        viewPurchase: "Gade acha mwen an",
        dismissPurchaseSuccess: "Fèmen mesaj la",
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
  const [showPayment, setShowPayment] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [favorites, setFavorites] = useState({});
  const [loadingError, setLoadingError] = useState("");
  const [buyerOrders, setBuyerOrders] = useState([]);
  const [sellerOrders, setSellerOrders] = useState([]);
  const [sellerItems, setSellerItems] = useState([]);
  const [recentPurchase, setRecentPurchase] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [orderActionLoading, setOrderActionLoading] = useState("");
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

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setBuyerOrders([]);
      setSellerOrders([]);
      setSellerItems([]);
      setRecentPurchase(null);
      return;
    }

    loadShopActivity(user.uid);
  }, [user?.uid]);

  async function loadItems(nextFilters = filters, requestedLimit = shopQueryLimit) {
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
  }

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

  function scrollToBuyerHistory() {
    if (typeof document === "undefined") {
      return;
    }

    const buyerHistorySection = document.getElementById("boutique-buyer-history");
    buyerHistorySection?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  async function handleContact(item) {
    if (!user) {
      router.push("/login");
      return;
    }

    try {
      const result = await createConversationRequest({
        fromUserId: user.uid,
        toUserId: item.authorId,
        itemInfo: {
          type: "boutique",
          itemId: item.id,
          title: item.title || item.name,
          price: item.price,
          imageUrl: item.images?.[0]?.url,
        },
      });

      if (result.status === "existing_conversation") {
        router.push(`/messages?conversationId=${result.conversationId}`);
      } else {
        router.push("/messages");
      }
    } catch (e) {
      console.error("Error requesting conversation:", e);
      setDialogState({
        open: true,
        tone: "error",
        title: boutiqueDialogText.contactTitle,
        message: t("conversationError"),
      });
    }
  }

  // Payment functions
  function handlePurchase(item) {
    if (!user) {
      router.push("/login");
      return;
    }

    // Always open payment modal - let PaymentForm handle the logic
    setSelectedItem(item);
    setShowPayment(true);
  }

  async function handlePaymentSuccess(paymentData) {
    const purchasedItem = selectedItem;
    const fallbackPaymentStatus = normalizeStatusValue(paymentData?.status, "pending");

    setShowPayment(false);
    setSelectedItem(null);

    try {
      await loadItems();

      let matchedOrder = null;

      if (user?.uid) {
        const refreshedActivity = await loadShopActivity(user.uid);
        const buyerOrdersList = Array.isArray(refreshedActivity?.buyerOrders) ? refreshedActivity.buyerOrders : [];
        matchedOrder = buyerOrdersList.find((order) => {
          const orderReference = order.paymentProofReference || order.referenceNumber || "";
          return order.transactionId === paymentData?.transactionId || orderReference === paymentData?.referenceNumber;
        }) || buyerOrdersList[0] || null;
      }

      if (matchedOrder || paymentData || purchasedItem) {
        const resolvedPaymentStatus = normalizeStatusValue(matchedOrder?.paymentStatus || paymentData?.status, "pending");
        setRecentPurchase({
          id: matchedOrder?.id || paymentData?.transactionId || paymentData?.referenceNumber || `${Date.now()}`,
          itemTitle: matchedOrder?.itemTitle || paymentData?.itemName || purchasedItem?.title || purchasedItem?.name || t("item"),
          paymentStatus: resolvedPaymentStatus,
          reference: matchedOrder?.paymentProofReference || matchedOrder?.referenceNumber || paymentData?.referenceNumber || paymentData?.transactionId || "-",
          orderId: matchedOrder?.id || "",
        });
        notifySystem(
          operationsText.purchaseSuccessTitle,
          resolvedPaymentStatus === "completed" ? operationsText.purchaseSuccessMessage : operationsText.purchasePendingMessage
        );
        return;
      }
    } catch (error) {
      console.error("Error finalizing payment success flow:", error);
    }

    if (paymentData || purchasedItem) {
      setRecentPurchase({
        id: paymentData?.transactionId || paymentData?.referenceNumber || `${Date.now()}`,
        itemTitle: paymentData?.itemName || purchasedItem?.title || purchasedItem?.name || t("item"),
        paymentStatus: fallbackPaymentStatus,
        reference: paymentData?.referenceNumber || paymentData?.transactionId || "-",
        orderId: "",
      });
    }

    notifySystem(
      operationsText.purchaseSuccessTitle,
      fallbackPaymentStatus === "completed" ? operationsText.purchaseSuccessMessage : operationsText.purchasePendingMessage
    );
  }

  async function handleToggleFavorite(itemId) {
    if (!user) {
      router.push("/login");
      return;
    }

    try {
      const isFav = await toggleFavorite(user.uid, itemId);
      setFavorites(prev => ({ ...prev, [itemId]: isFav }));
      
      // Send notification if favorited
      if (isFav) {
        const item = items.find(i => i.id === itemId);
        if (item && item.authorId !== user.uid) {
          notifyFavorite(item.title, userProfile?.name || user.displayName || "Anonim");
        }
      }
    } catch (e) {
      console.error("Error toggling favorite:", e);
    }
  }

  async function checkFavorites() {
    if (!user) return;
    
    const favStatus = {};
    for (const item of items) {
      try {
        favStatus[item.id] = await isItemFavorite(user.uid, item.id);
      } catch (e) {
        favStatus[item.id] = false;
      }
    }
    setFavorites(favStatus);
  }

  useEffect(() => {
    if (items.length > 0 && user) {
      checkFavorites();
    }
  }, [items, user]);

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
      return { key, label: operationsText.statusLabels[key], className: "bg-rose-100 text-rose-700" };
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
          ? "bg-sky-100 text-sky-700"
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
          ? "bg-rose-100 text-rose-700"
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
        ? "bg-sky-100 text-sky-700"
        : key === "rejected"
          ? "bg-rose-100 text-rose-700"
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#9B2335] to-[#6B1525] shadow-lg shadow-rose-200">
            <ShoppingBag className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">{t("boutiqueTitle")}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {t("boutiqueDesc")}
            </p>
          </div>
        </div>
        {user && (
          <Button
            onClick={() => setShowForm(!showForm)}
            className="rounded-2xl bg-gradient-to-r from-[#9B2335] to-[#7B1A2C] shadow-sm shadow-rose-300 transition-all hover:shadow-md hover:brightness-110"
          >
            {showForm ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {showForm ? t("reset") : t("sellItem")}
          </Button>
        )}
      </div>

      {/* Search Filters */}
      <SearchFilters
        filters={filters}
        onChange={setFilters}
        onSearch={handleSearchItems}
        shopOptions={availableShopNames}
      />

      {recentPurchase && user && (
        <Card className="overflow-hidden rounded-[2rem] border-0 bg-gradient-to-r from-emerald-50 via-white to-teal-50 shadow-sm">
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{operationsText.purchaseSuccessTitle}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {recentPurchase.paymentStatus === "completed"
                      ? operationsText.purchaseSuccessMessage
                      : operationsText.purchasePendingMessage}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    <Badge className="rounded-full bg-white text-slate-700 border border-emerald-100">{recentPurchase.itemTitle}</Badge>
                    <Badge className="rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                      {operationsText.payment}: {operationsText.statusLabels[recentPurchase.paymentStatus] || recentPurchase.paymentStatus}
                    </Badge>
                    <Badge className="rounded-full bg-white text-slate-700 border border-slate-200">
                      {operationsText.latestReference}: {recentPurchase.reference}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button className="rounded-2xl bg-gradient-to-r from-[#9B2335] to-[#7B1A2C]" onClick={scrollToBuyerHistory}>
                  {operationsText.viewPurchase}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" className="rounded-2xl" onClick={() => setRecentPurchase(null)}>
                  {operationsText.dismissPurchaseSuccess}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {user && (
        <Card className="overflow-hidden rounded-[2rem] border-0 bg-gradient-to-br from-slate-50 via-white to-rose-50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{operationsText.operationsTitle}</h2>
                <p className="mt-1 text-sm text-slate-500">{operationsText.operationsDesc}</p>
              </div>
              {user?.uid && (
                <Link href={`/reviews/${user.uid}`} className="text-sm font-medium text-[#9B2335] hover:underline">
                  {t("reviews")}
                </Link>
              )}
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{operationsText.activeListings}</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{activeSellerItemsCount}</div>
              </div>
              <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{operationsText.salesOrders}</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{sellerOrders.length}</div>
              </div>
              <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{operationsText.confirmedSales}</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{settledSellerOrders.length}</div>
              </div>
              <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{operationsText.sellerRevenue}</div>
                <div className="mt-2 text-2xl font-semibold text-slate-900">{formatShopMoney(sellerRevenue)}</div>
                <div className="mt-1 text-xs text-rose-600">{operationsText.actionRequired}: {sellerActionRequiredCount}</div>
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
                    <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white/80 p-5 text-sm text-slate-500">
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
                        <div key={order.id} className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">{order.itemTitle || t("item")}</div>
                              <div className="mt-1 text-xs text-slate-500">{operationsText.orderDate}: {formatOrderDate(order.createdAt)}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-[#9B2335]">{formatShopMoney(order.totalAmount || order.itemPrice)}</div>
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
                              <Badge className="rounded-full bg-amber-100 text-amber-700">{operationsText.actionPending}</Badge>
                            )}
                            {canRequestCancel && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl"
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
                                className="rounded-xl"
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
                    <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white/80 p-5 text-sm text-slate-500">
                      {sellerItems.length === 0 ? operationsText.noListings : operationsText.noSales}
                    </div>
                  ) : (
                    sellerOrders.slice(0, 6).map((order) => {
                      const paymentMeta = getPaymentStatusMeta(order);
                      const fulfillmentMeta = getFulfillmentStatusMeta(order);
                      const supportMeta = getSupportStatusMeta(order);
                      const proofMeta = getProofStatusMeta(order);
                      return (
                        <div key={order.id} className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">{order.itemTitle || t("item")}</div>
                              <div className="mt-1 text-xs text-slate-500">{operationsText.orderDate}: {formatOrderDate(order.createdAt)}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-[#9B2335]">{formatShopMoney(order.sellerAmount || order.totalAmount || order.itemPrice)}</div>
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

      <Card className="overflow-hidden rounded-[2rem] border-0 bg-gradient-to-br from-violet-50 via-white to-rose-50 shadow-sm">
        <CardContent className="p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-violet-700">
                <Store className="h-6 w-6" />
                <span className="text-sm font-semibold uppercase tracking-wide">
                  {language === "ht" ? "Boutik patnè" : "Boutiques partenaires"}
                </span>
              </div>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
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
                className="rounded-xl"
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
                  className={`rounded-[1.5rem] border p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                    shop.hasActiveFilter
                      ? "border-violet-300 bg-violet-100/70 shadow-sm"
                      : "border-white/80 bg-white/90"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-violet-100 text-violet-700">
                      <Store className="h-8 w-8" />
                    </div>
                    <Badge className="rounded-full bg-violet-100 text-violet-700">
                      {sellerTypeLabels.affiliate_shop}
                    </Badge>
                  </div>

                  <h3 className="mt-4 text-lg font-semibold text-slate-900">{shop.name}</h3>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      {shop.count} {language === "ht" ? "atik" : shop.count > 1 ? "articles" : "article"}
                    </span>
                    {shop.location && (
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        {shop.location}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm font-medium text-violet-700">
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
            <div className="rounded-[1.5rem] border border-dashed border-violet-200 bg-white/80 p-6 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-violet-100 text-violet-700">
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
        <Card className="rounded-[2rem] border-0 shadow-lg">
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
                    className="rounded-xl"
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
                    className="rounded-xl"
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
                  className="min-h-[80px] rounded-xl"
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
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
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
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{t("allCategories")}</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
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
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
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
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
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
                  className="rounded-xl"
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
                  className="rounded-xl"
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
                  className="rounded-xl"
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
                className="rounded-2xl bg-gradient-to-r from-[#9B2335] to-[#7B1A2C] px-6 shadow-sm shadow-rose-300 transition-all hover:shadow-md hover:brightness-110"
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
        <Card className="rounded-[2rem] border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-semibold">{operationsText.loadError}</h3>
            <Button className="mt-4 rounded-2xl" onClick={() => loadItems()}>
              {t("retry") || (language === "ht" ? "Eseye ankò" : "Réessayer")}
            </Button>
          </CardContent>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card className="rounded-[2rem] border-0 shadow-sm">
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleItems.map((item) => (
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
                    <div className="hidden h-full w-full items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50">
                      <ImageIcon className="h-10 w-10 text-slate-300" />
                    </div>
                  </div>
                ) : (
                  <div className="flex h-48 w-full items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50">
                    <ShoppingBag className="h-10 w-10 text-rose-200" />
                  </div>
                )}

                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-tight line-clamp-2">{item.title}</h3>
                    <span className="shrink-0 text-lg font-bold text-[#9B2335]">
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
                    {(item.sellerType === "affiliate_shop" || item.shopName) && (
                      <Badge className="rounded-full bg-violet-100 text-violet-700 text-xs">
                        {sellerTypeLabels.affiliate_shop}
                      </Badge>
                    )}
                    {item.shopName && (
                      <Badge
                        variant="outline"
                        className="rounded-full cursor-pointer text-xs hover:bg-slate-50"
                        onClick={() => handleShopFilterSelect(item.shopName)}
                      >
                        {item.shopName}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      {item.shopName && (
                        <button
                          type="button"
                          onClick={() => handleShopFilterSelect(item.shopName)}
                          className="font-medium text-slate-500 hover:text-slate-700"
                        >
                          {item.shopName}
                        </button>
                      )}
                      <span>{item.authorName}</span>
                      {item.location && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" />
                          {item.location}
                        </span>
                      )}
                      {!item.location && item.sellerCoordinates && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" />
                          GPS
                        </span>
                      )}
                    </div>
                    
                    {item.authorId && (
                      <Link href={`/reviews/${item.authorId}`}>
                        <div className="flex cursor-pointer items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
                          <RatingDisplay userId={item.authorId} size="xs" showCount={false} />
                        </div>
                      </Link>
                    )}
                  </div>

                  {item.contact && (
                    <a
                      href={`tel:${item.contact}`}
                      className="mt-3 flex items-center gap-1.5 text-sm font-medium text-[#9B2335] hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {item.contact}
                    </a>
                  )}

                  {/* Action buttons */}
                  <div className="mt-4 flex flex-col gap-2">
                    <Button
                      variant="outline"
                      className="w-full rounded-xl text-sm font-medium py-2.5"
                      onClick={() => handleToggleFavorite(item.id)}
                    >
                      <Heart className={`h-4 w-4 mr-2 ${favorites[item.id] ? "fill-red-500 text-red-500" : ""}`} />
                      {favorites[item.id] ? t("removeFromFavorites") : t("addToFavorites")}
                    </Button>
                    
                    {user && item.authorId !== user.uid && (
                      <div className="flex flex-col gap-2">
                        <Button
                          className="w-full rounded-xl bg-gradient-to-r from-[#9B2335] to-[#7B1A2C] text-sm font-medium py-2.5 shadow-sm hover:shadow-md transition-all"
                          onClick={() => handlePurchase(item)}
                        >
                          <ShoppingBag className="h-4 w-4 mr-2" />
                          {t("buyNow")}
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full rounded-xl text-sm font-medium py-2.5 border-2 hover:bg-slate-50 transition-all"
                          onClick={() => handleContact(item)}
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          {t("contactToSeller")}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Owner actions */}
                  {user && item.authorId === user.uid && (
                    <div className="mt-3 flex gap-2 border-t pt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 rounded-xl text-xs"
                        onClick={() => handleMarkSold(item.id)}
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {t("sell")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {canLoadMoreItems ? (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl"
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
        <Card className="rounded-[2rem] border-0 bg-gradient-to-br from-rose-50 to-pink-50 shadow-sm">
          <CardContent className="p-8 text-center">
            <Heart className="mx-auto h-10 w-10 text-[#9B2335]" />
            <h3 className="mt-3 text-lg font-bold">{t("welcomeTitle")}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {t("welcomeDesc")}
            </p>
            <Button
              className="mt-4 rounded-2xl bg-gradient-to-r from-[#9B2335] to-[#7B1A2C] shadow-sm shadow-rose-300"
              onClick={() => (window.location.href = "/register")}
            >
              {t("signUpNow")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Payment Modal */}
      {showPayment && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{t("securePayment")}</h2>
                <button
                  onClick={() => {
                    setShowPayment(false);
                    setSelectedItem(null);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  {selectedItem.images?.[0]?.url && (
                    <img 
                      src={selectedItem.images[0].url} 
                      alt={selectedItem.title || selectedItem.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium">{selectedItem.title || selectedItem.name}</h3>
                    <p className="text-sm text-slate-500">{selectedItem.condition}</p>
                    <p className="text-lg font-bold text-[#9B2335]">
                      ${selectedItem.price.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  {language === "ht"
                    ? "Apre konfimasyon an, kòmand ou a ap parèt nan zòn acha ou yo pou ou ka swiv li fasilman."
                    : "Après confirmation, votre commande apparaîtra dans votre espace d'achats pour que vous puissiez la suivre facilement."}
                </div>
                <PaymentForm 
                  amount={parseFloat(selectedItem.price)}
                  itemInfo={selectedItem}
                  onSuccess={handlePaymentSuccess}
                />
              </div>
            </div>
          </div>
        </div>
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
