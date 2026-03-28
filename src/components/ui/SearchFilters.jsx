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
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardContent className="p-4">
        {/* Search bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder={t("shopSearchPlaceholder")}
              value={filters.searchQuery || ""}
              onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
              className="pl-10 rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          
          <Button onClick={handleSearch} className="rounded-xl bg-gradient-to-r from-[#9B2335] to-[#7B1A2C]">
            <Search className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="rounded-xl"
          >
            <Filter className="h-4 w-4 mr-2" />
            {t("filters")}
            {showAdvanced ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
          </Button>
        </div>

        {/* Active filters */}
        {hasActiveFilters() && (
          <div className="mt-3 flex flex-wrap gap-2">
            {filters.category !== "all" && (
              <Badge variant="secondary" className="rounded-full">
                {categories.find(c => c.id === filters.category)?.label}
                <X
                  className="ml-1 h-3 w-3 cursor-pointer"
                  onClick={() => onChange({ ...filters, category: "all" })}
                />
              </Badge>
            )}
            
            {filters.condition !== "all" && (
              <Badge variant="secondary" className="rounded-full">
                {conditions.find(c => c.id === filters.condition)?.label}
                <X
                  className="ml-1 h-3 w-3 cursor-pointer"
                  onClick={() => onChange({ ...filters, condition: "all" })}
                />
              </Badge>
            )}
            
            {(filters.minPrice || filters.maxPrice) && (
              <Badge variant="secondary" className="rounded-full">
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
              <Badge variant="secondary" className="rounded-full">
                <MapPin className="h-3 w-3 mr-1" />
                {filters.location}
                <X
                  className="ml-1 h-3 w-3 cursor-pointer"
                  onClick={() => onChange({ ...filters, location: "" })}
                />
              </Badge>
            )}

            {filters.sellerSource !== "all" && (
              <Badge variant="secondary" className="rounded-full">
                {sellerSources.find((source) => source.id === filters.sellerSource)?.label}
                <X
                  className="ml-1 h-3 w-3 cursor-pointer"
                  onClick={() => onChange({ ...filters, sellerSource: "all" })}
                />
              </Badge>
            )}

            {filters.shopName && (
              <Badge variant="secondary" className="rounded-full">
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
              className="h-6 rounded-full text-xs"
            >
              {t("shopClearAll")}
            </Button>
          </div>
        )}

        {/* Advanced filters */}
        {showAdvanced && (
          <div className="mt-4 space-y-4 border-t pt-4">
            {/* Category */}
            <div>
              <label className="mb-2 block text-sm font-medium">{t("allCategories")}</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={filters.category === category.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => onChange({ ...filters, category: category.id })}
                    className={`rounded-xl ${
                      filters.category === category.id
                        ? "bg-gradient-to-r from-[#9B2335] to-[#7B1A2C]"
                        : ""
                    }`}
                  >
                    {category.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Condition */}
            <div>
              <label className="mb-2 block text-sm font-medium">{t("condition")}</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {conditions.map((condition) => (
                  <Button
                    key={condition.id}
                    variant={filters.condition === condition.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => onChange({ ...filters, condition: condition.id })}
                    className={`rounded-xl ${
                      filters.condition === condition.id
                        ? "bg-gradient-to-r from-[#9B2335] to-[#7B1A2C]"
                        : ""
                    }`}
                  >
                    {condition.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
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
                    className={`rounded-xl ${
                      filters.sellerSource === source.id
                        ? "bg-gradient-to-r from-[#9B2335] to-[#7B1A2C]"
                        : ""
                    }`}
                  >
                    {source.label}
                  </Button>
                ))}
              </div>
            </div>

            {(shopOptions.length > 0 || filters.shopName) && (
              <div>
                <label className="mb-2 block text-sm font-medium">{t("shopPartnerFilterLabel")}</label>
                <select
                  value={filters.shopName || ""}
                  onChange={(e) =>
                    applyImmediateFilters({
                      sellerSource: e.target.value ? "affiliate_shop" : filters.sellerSource,
                      shopName: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B2335]"
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
              <label className="mb-2 block text-sm font-medium">{t("price")} (HTG)</label>
              <div className="flex gap-2">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="number"
                    placeholder={t("shopMinPrice")}
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                    className="pl-10 rounded-xl"
                  />
                </div>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="number"
                    placeholder={t("shopMaxPrice")}
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                    className="pl-10 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="mb-2 block text-sm font-medium">{t("location")}</label>
              <select
                value={filters.location || ""}
                onChange={(e) => onChange({ ...filters, location: e.target.value })}
                className="w-full rounded-xl border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B2335]"
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
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSearch} className="rounded-xl bg-gradient-to-r from-[#9B2335] to-[#7B1A2C]">
                {t("shopApplyFilters")}
              </Button>
              <Button variant="outline" onClick={handleClear} className="rounded-xl">
                {t("shopResetFilters")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
