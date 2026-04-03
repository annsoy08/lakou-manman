"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Search,
  Filter,
  X,
  DollarSign,
  MapPin,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const getCategories = (t) => [
  { id: "all", label: t("allCategories") },
  { id: "vetements", label: t("vetements") },
  { id: "jouets", label: t("jouets") },
  { id: "mobilier", label: t("mobilier") },
  { id: "livres", label: t("livres") },
  { id: "poussettes", label: t("poussettes") },
  { id: "transport", label: t("transport") },
  { id: "autres", label: t("autres") },
];

const getConditions = (t) => [
  { id: "all", label: t("allConditions") },
  { id: "new", label: t("new") },
  { id: "like-new", label: t("likeNew") },
  { id: "good", label: t("good") },
  { id: "used", label: t("used") },
];

const getSellerSources = (t) => [
  { id: "all", label: t("shopSellerSourceAll") },
  { id: "individual", label: t("shopSellerSourceIndividual") },
  { id: "affiliate_shop", label: t("shopSellerSourceAffiliate") },
];

const locations = [
  "Pòtoprens",
  "Delma",
  "Petyonvil",
  "Kafou",
  "Jakmèl",
  "Taba",
  "Okap",
  "Gonaïves",
  "Kap Ayisyen",
  "Santo Domingo",
];

export default function SearchFilters({ filters, onChange, onSearch, shopOptions = [] }) {
  const { t } = useLanguage();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [priceRange, setPriceRange] = useState({
    min: filters.minPrice || "",
    max: filters.maxPrice || "",
  });

  function handleSearch() {
    const nextFilters = {
      ...filters,
      minPrice: priceRange.min || undefined,
      maxPrice: priceRange.max || undefined,
    };
    onChange(nextFilters);
    onSearch?.(nextFilters);
  }

  function applyImmediateFilters(partialFilters) {
    const nextFilters = {
      ...filters,
      ...partialFilters,
      minPrice: priceRange.min || undefined,
      maxPrice: priceRange.max || undefined,
    };
    onChange(nextFilters);
    onSearch?.(nextFilters);
  }

  function handleClear() {
    setPriceRange({ min: "", max: "" });
    const resetFilters = {
      searchQuery: "",
      category: "all",
      condition: "all",
      minPrice: undefined,
      maxPrice: undefined,
      location: "",
      sellerSource: "all",
      shopName: "",
    };
    onChange(resetFilters);
    onSearch?.(resetFilters);
  }

  function hasActiveFilters() {
    return (
      filters.searchQuery ||
      filters.category !== "all" ||
      filters.condition !== "all" ||
      filters.minPrice ||
      filters.maxPrice ||
      filters.location ||
      filters.sellerSource !== "all" ||
      filters.shopName
    );
  }

  const categories = getCategories(t);
  const conditions = getConditions(t);
  const sellerSources = getSellerSources(t);

  return (
    <Card className="rounded-[2rem] border border-white/80 bg-[linear-gradient(135deg,_rgba(255,255,255,0.98)_0%,_rgba(250,245,247,0.98)_52%,_rgba(252,248,249,0.98)_100%)] shadow-[0_24px_80px_-48px_rgba(108,31,50,0.14)]">
      <CardContent className="p-5">
        {/* Search bar */}
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder={t("shopSearchPlaceholder")}
              value={filters.searchQuery || ""}
              onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
              className="rounded-[1rem] border-[#e6d5db] bg-white/90 pl-10 shadow-sm"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          
          <Button onClick={handleSearch} className="w-full rounded-[1rem] bg-gradient-to-r from-[#6C1F32] to-[#4B1021] shadow-[0_16px_34px_-18px_rgba(108,31,50,0.38)] transition-all hover:-translate-y-0.5 hover:brightness-110 lg:w-auto">
            <Search className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full rounded-[1rem] border-[#e6d5db] bg-white/85 shadow-sm transition-all hover:bg-white lg:w-auto"
          >
            <Filter className="h-4 w-4 mr-2" />
            {t("filters")}
            {showAdvanced ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
          </Button>
        </div>

        {/* Active filters */}
        {hasActiveFilters() && (
          <div className="mt-4 flex flex-wrap gap-2">
            {filters.category !== "all" && (
              <Badge variant="secondary" className="rounded-full border border-[#e6d5db] bg-white/90 px-3 py-1 text-slate-700 shadow-sm">
                {categories.find(c => c.id === filters.category)?.label}
                <X
                  className="ml-1 h-3 w-3 cursor-pointer"
                  onClick={() => onChange({ ...filters, category: "all" })}
                />
              </Badge>
            )}
            
            {filters.condition !== "all" && (
              <Badge variant="secondary" className="rounded-full border border-[#e6d5db] bg-white/90 px-3 py-1 text-slate-700 shadow-sm">
                {conditions.find(c => c.id === filters.condition)?.label}
                <X
                  className="ml-1 h-3 w-3 cursor-pointer"
                  onClick={() => onChange({ ...filters, condition: "all" })}
                />
              </Badge>
            )}
            
            {(filters.minPrice || filters.maxPrice) && (
              <Badge variant="secondary" className="rounded-full border border-[#e6d5db] bg-white/90 px-3 py-1 text-slate-700 shadow-sm">
                {filters.minPrice ? `${filters.minPrice} HTG` : "0"} -{" "}
                {filters.maxPrice ? `${filters.maxPrice} HTG` : "∞"}
                <X
                  className="ml-1 h-3 w-3 cursor-pointer"
                  onClick={() => {
                    setPriceRange({ min: "", max: "" });
                    onChange({ ...filters, minPrice: undefined, maxPrice: undefined });
                  }}
                />
              </Badge>
            )}
            
            {filters.location && (
              <Badge variant="secondary" className="rounded-full border border-[#e6d5db] bg-white/90 px-3 py-1 text-slate-700 shadow-sm">
                <MapPin className="h-3 w-3 mr-1" />
                {filters.location}
                <X
                  className="ml-1 h-3 w-3 cursor-pointer"
                  onClick={() => onChange({ ...filters, location: "" })}
                />
              </Badge>
            )}

            {filters.sellerSource !== "all" && (
              <Badge variant="secondary" className="rounded-full border border-[#e6d5db] bg-white/90 px-3 py-1 text-slate-700 shadow-sm">
                {sellerSources.find((source) => source.id === filters.sellerSource)?.label}
                <X
                  className="ml-1 h-3 w-3 cursor-pointer"
                  onClick={() => onChange({ ...filters, sellerSource: "all" })}
                />
              </Badge>
            )}

            {filters.shopName && (
              <Badge variant="secondary" className="rounded-full border border-[#e6d5db] bg-white/90 px-3 py-1 text-slate-700 shadow-sm">
                {filters.shopName}
                <X
                  className="ml-1 h-3 w-3 cursor-pointer"
                  onClick={() => onChange({ ...filters, shopName: "" })}
                />
              </Badge>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-8 rounded-full border border-transparent px-3 text-xs text-[#7E243A] transition-all hover:border-[#e6d5db] hover:bg-white"
            >
              {t("shopClearAll")}
            </Button>
          </div>
        )}

        {/* Advanced filters */}
        {showAdvanced && (
          <div className="mt-5 space-y-5 rounded-[1.5rem] border border-[#ead7de] bg-white/70 p-4 shadow-[0_18px_40px_-34px_rgba(108,31,50,0.12)] backdrop-blur-sm">
            {/* Category */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t("allCategories")}</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={filters.category === category.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => onChange({ ...filters, category: category.id })}
                    className={`rounded-xl border-[#e6d5db] ${
                      filters.category === category.id
                        ? "bg-gradient-to-r from-[#6C1F32] to-[#4B1021] shadow-[0_14px_30px_-18px_rgba(108,31,50,0.34)]"
                        : "bg-white/90 hover:bg-white"
                    }`}
                  >
                    {category.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Condition */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t("condition")}</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {conditions.map((condition) => (
                  <Button
                    key={condition.id}
                    variant={filters.condition === condition.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => onChange({ ...filters, condition: condition.id })}
                    className={`rounded-xl border-[#e6d5db] ${
                      filters.condition === condition.id
                        ? "bg-gradient-to-r from-[#6C1F32] to-[#4B1021] shadow-[0_14px_30px_-18px_rgba(108,31,50,0.34)]"
                        : "bg-white/90 hover:bg-white"
                    }`}
                  >
                    {condition.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {t("shopSellerSourceLabel")}
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {sellerSources.map((source) => (
                  <Button
                    key={source.id}
                    variant={filters.sellerSource === source.id ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      applyImmediateFilters({
                        sellerSource: source.id,
                        shopName: source.id === "affiliate_shop" ? filters.shopName || "" : "",
                      })
                    }
                    className={`rounded-xl border-[#e6d5db] ${
                      filters.sellerSource === source.id
                        ? "bg-gradient-to-r from-[#6C1F32] to-[#4B1021] shadow-[0_14px_30px_-18px_rgba(108,31,50,0.34)]"
                        : "bg-white/90 hover:bg-white"
                    }`}
                  >
                    {source.label}
                  </Button>
                ))}
              </div>
            </div>

            {(shopOptions.length > 0 || filters.shopName) && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t("shopPartnerFilterLabel")}</label>
                <select
                  value={filters.shopName || ""}
                  onChange={(e) =>
                    applyImmediateFilters({
                      sellerSource: e.target.value ? "affiliate_shop" : filters.sellerSource,
                      shopName: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-[#e6d5db] bg-white/90 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7E243A]"
                >
                  <option value="">{t("shopAllPartnerShops")}</option>
                  {shopOptions.map((shopName) => (
                    <option key={shopName} value={shopName}>
                      {shopName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Price range */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t("price")} (HTG)</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="number"
                    placeholder={t("shopMinPrice")}
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                    className="rounded-xl border-[#e6d5db] bg-white/90 pl-10 shadow-sm"
                  />
                </div>
                <div className="relative flex-1">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="number"
                    placeholder={t("shopMaxPrice")}
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                    className="rounded-xl border-[#e6d5db] bg-white/90 pl-10 shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{t("location")}</label>
              <select
                value={filters.location || ""}
                onChange={(e) => onChange({ ...filters, location: e.target.value })}
                className="w-full rounded-xl border border-[#e6d5db] bg-white/90 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7E243A]"
              >
                <option value="">{t("shopAllLocations")}</option>
                {locations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>

            {/* Apply buttons */}
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <Button onClick={handleSearch} className="w-full rounded-[1rem] bg-gradient-to-r from-[#6C1F32] to-[#4B1021] shadow-[0_16px_34px_-18px_rgba(108,31,50,0.38)] transition-all hover:-translate-y-0.5 hover:brightness-110 sm:w-auto">
                {t("shopApplyFilters")}
              </Button>
              <Button variant="outline" onClick={handleClear} className="w-full rounded-[1rem] border-[#e6d5db] bg-white/90 shadow-sm transition-all hover:bg-white sm:w-auto">
                {t("shopResetFilters")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
