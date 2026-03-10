"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  createShopItem, 
  getShopItems, 
  deleteShopItem, 
  markItemSold,
  createConversation,
  toggleFavorite,
  isItemFavorite,
  searchShopItems
} from "@/lib/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import SearchFilters from "@/components/ui/SearchFilters";
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
  ShoppingCart,
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

export default function BoutiquePage() {
  const { user, userProfile } = useAuth();
  const { notifyFavorite, notifyItem } = useNotifications();
  const { t } = useLanguage();
  const categories = getCategories(t);
  const conditionLabels = getConditionLabels(t);
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  // const [showPayment, setShowPayment] = useState(false);
  // const [selectedItem, setSelectedItem] = useState(null);
  const [favorites, setFavorites] = useState({});
  const [filters, setFilters] = useState({
    searchQuery: "",
    category: "all",
    condition: "all",
    minPrice: undefined,
    maxPrice: undefined,
    location: "",
  });

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "vetements",
    condition: "good",
    location: "",
    contact: "",
  });
  const [formImages, setFormImages] = useState([]);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);
    try {
      const data = await searchShopItems(filters);
      setItems(data);
    } catch (e) {
      console.error("Error loading shop items:", e);
    }
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user || !form.title || !form.price) return;
    setSubmitting(true);
    try {
      const newItemId = await createShopItem({
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
        location: "",
        contact: "",
      });
      setFormImages([]);
      setShowForm(false);
      await loadItems();
    } catch (e) {
      console.error("Error creating item:", e);
    }
    setSubmitting(false);
  }

  async function handleDelete(itemId) {
    if (!confirm("Ou sèten ou vle efase atik sa a?")) return;
    try {
      await deleteShopItem(itemId);
      await loadItems();
    } catch (e) {
      console.error("Error deleting item:", e);
    }
  }

  async function handleContact(item) {
    if (!user) {
      router.push("/login");
      return;
    }

    try {
      const conversationId = await createConversation([user.uid, item.authorId], {
        type: "boutique",
        itemId: item.id,
        itemName: item.name,
        price: item.price,
        imageUrl: item.images?.[0]?.url,
      });
      
      // Add participant names to conversation
      // This would be better handled in a backend function
      router.push("/messages");
    } catch (e) {
      console.error("Error creating conversation:", e);
      alert(t("conversationError"));
    }
  }

  // Payment functions temporarily disabled for deployment
  // function handlePurchase(item) {
  //   if (!user) {
  //     router.push("/login");
  //     return;
  //   }
  //   
  //   setSelectedItem(item);
  //   setShowPayment(true);
  // }

  // function handlePaymentSuccess() {
  //   setShowPayment(false);
  //   setSelectedItem(null);
  //   // You could add success notification here
  //   alert(t("paymentSuccessful") + "!");
  // }

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
    } catch (e) {
      console.error("Error marking sold:", e);
    }
  }

  const filteredItems = items;

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
        onSearch={loadItems}
      />

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
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
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
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{t("images")}</label>
                <ImageUpload
                  images={formImages}
                  onChange={setFormImages}
                  maxImages={5}
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
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
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>{item.authorName}</span>
                    {item.location && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" />
                        {item.location}
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
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 rounded-xl text-xs"
                    onClick={() => handleToggleFavorite(item.id)}
                  >
                    <Heart className={`h-3.5 w-3.5 mr-1 ${favorites[item.id] ? "fill-red-500 text-red-500" : ""}`} />
                    {favorites[item.id] ? t("removeFromFavorites") : t("addToFavorites")}
                  </Button>
                  
                  {user && item.authorId !== user.uid && (
                    <Button
                      size="sm"
                      className="w-full rounded-xl bg-gradient-to-r from-[#9B2335] to-[#7B1A2C] text-xs"
                      onClick={() => handleContact(item)}
                    >
                      <MessageCircle className="h-3.5 w-3.5 mr-1" />
                      {t("contactToSeller")}
                    </Button>
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

      {/* Payment Modal - Temporarily disabled for deployment */}
      {/* {showPayment && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{t("securePayment")}</h2>
                <button
                  onClick={() => setShowPayment(false)}
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
                      alt={selectedItem.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium">{selectedItem.name}</h3>
                    <p className="text-sm text-slate-500">{selectedItem.condition}</p>
                    <p className="text-lg font-bold text-[#9B2335]">
                      ${selectedItem.price.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-xl text-center">
                  <p className="text-sm text-blue-700 mb-2">
                    {t("paymentProcessing")}
                  </p>
                  <p className="text-xs text-blue-600">
                    {t("paymentInfo")}
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onClick={() => setShowPayment(false)}
                  >
                    {t("cancel")}
                  </Button>
                  <Button
                    className="flex-1 rounded-xl bg-gradient-to-r from-[#9B2335] to-[#7B1A2C]"
                    onClick={() => {
                      handlePaymentSuccess();
                    }}
                  >
                    {t("confirmPayment")} ${selectedItem.price.toFixed(2)}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
}
