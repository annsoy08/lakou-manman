"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const communityRequestsStorageKey = "lakou-manman-community-support-requests";
const communityOffersStorageKey = "lakou-manman-community-support-offers";

function createToolEntryId(prefix = "tool") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readToolStateFromStorage(storageKey, fallbackValue) {
  if (typeof window === "undefined") {
    return fallbackValue;
  }

  try {
    const savedValue = window.localStorage.getItem(storageKey);
    if (!savedValue) {
      return fallbackValue;
    }

    const parsedValue = JSON.parse(savedValue);

    if (Array.isArray(fallbackValue)) {
      return Array.isArray(parsedValue) ? parsedValue : fallbackValue;
    }

    if (fallbackValue && typeof fallbackValue === "object" && !Array.isArray(fallbackValue)) {
      return parsedValue && typeof parsedValue === "object" && !Array.isArray(parsedValue)
        ? { ...fallbackValue, ...parsedValue }
        : fallbackValue;
    }

    return parsedValue ?? fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function writeToolStateToStorage(storageKey, value) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
  }
}

function formatToolDate(dateValue, language) {
  if (!dateValue) {
    return "--";
  }

  try {
    const locale = language === "ht" ? "fr-HT" : "fr-FR";
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${dateValue}T00:00:00`));
  } catch {
    return dateValue;
  }
}

export default function CommunitySupportTool({ language, onDownloadFile }) {
  const [communityRequestForm, setCommunityRequestForm] = useState({
    supportType: "",
    urgency: "standard",
    location: "",
    details: "",
    contactPreference: "private"
  });
  const [communityOfferForm, setCommunityOfferForm] = useState({
    helpType: "",
    availability: "thisWeek",
    location: "",
    details: ""
  });
  const [communityRequests, setCommunityRequests] = useState(() => readToolStateFromStorage(communityRequestsStorageKey, []));
  const [communityOffers, setCommunityOffers] = useState(() => readToolStateFromStorage(communityOffersStorageKey, []));

  useEffect(() => {
    writeToolStateToStorage(communityRequestsStorageKey, communityRequests);
  }, [communityRequests]);

  useEffect(() => {
    writeToolStateToStorage(communityOffersStorageKey, communityOffers);
  }, [communityOffers]);

  const communityUi = language === "ht"
    ? {
        requestTitle: "Mande soutyen",
        offerTitle: "Pwopoze èd",
        supportType: "Kalite sipò",
        urgency: "Nivo ijans",
        location: "Zòn oswa vil",
        details: "Detay",
        contactPreference: "Kijan ou vle moun kontakte ou",
        availability: "Disponiblite",
        saveRequest: "Anrejistre demann lan",
        saveOffer: "Anrejistre òf la",
        recentRequests: "Dènye demann yo",
        recentOffers: "Dènye òf èd yo",
        resources: "Resous itil",
        export: "Telechaje rezime a",
        noRequests: "Pa gen demann pou kounye a.",
        noOffers: "Pa gen òf èd pou kounye a.",
        requestPlaceholder: "Eksplike sa ou bezwen oswa poukisa li ijan",
        offerPlaceholder: "Eksplike kijan ou ka ede oubyen ki lè ou disponib",
        supportTypes: [
          { value: "emotional", label: "Soutyen emosyonèl" },
          { value: "material", label: "Èd materyèl" },
          { value: "medical", label: "Resous lasante" },
          { value: "school", label: "Lekòl / devlopman" }
        ],
        offerTypes: [
          { value: "listening", label: "Koute ak ankouraje" },
          { value: "materials", label: "Bay rad / kouch / manje" },
          { value: "referral", label: "Pataje bon kontak" },
          { value: "transport", label: "Ede ak deplasman" }
        ],
        urgencyOptions: [
          { value: "standard", label: "Nòmal" },
          { value: "priority", label: "Priyorite" },
          { value: "urgent", label: "Ijans" }
        ],
        contactOptions: [
          { value: "private", label: "An prive" },
          { value: "public", label: "Nan kominote a" }
        ],
        availabilityOptions: [
          { value: "today", label: "Jodi a" },
          { value: "thisWeek", label: "Semèn sa a" },
          { value: "flexible", label: "Fleksib" }
        ],
        resourceItems: [
          { title: "Gwoup sipò manman yo", description: "Dirije moun nan vè gwoup tematik ki koresponn ak bezwen li." },
          { title: "Sant sante ak lopital", description: "Kenbe yon lis kote ki ka bay swen oswa konsèy." },
          { title: "Kontak ijans ak referans", description: "Pataje pwofesyonèl oswa sèvis serye sèlman." }
        ]
      }
    : {
        requestTitle: "Demander du soutien",
        offerTitle: "Proposer de l'aide",
        supportType: "Type de soutien",
        urgency: "Niveau d'urgence",
        location: "Zone ou ville",
        details: "Détails",
        contactPreference: "Mode de contact souhaité",
        availability: "Disponibilité",
        saveRequest: "Enregistrer la demande",
        saveOffer: "Enregistrer l'offre",
        recentRequests: "Demandes récentes",
        recentOffers: "Offres d'aide récentes",
        resources: "Ressources utiles",
        export: "Télécharger le résumé",
        noRequests: "Aucune demande enregistrée pour le moment.",
        noOffers: "Aucune offre d'aide enregistrée pour le moment.",
        requestPlaceholder: "Expliquez le besoin ou pourquoi la situation est prioritaire",
        offerPlaceholder: "Expliquez comment vous pouvez aider ou quand vous êtes disponible",
        supportTypes: [
          { value: "emotional", label: "Soutien émotionnel" },
          { value: "material", label: "Aide matérielle" },
          { value: "medical", label: "Ressources santé" },
          { value: "school", label: "École / développement" }
        ],
        offerTypes: [
          { value: "listening", label: "Écoute et encouragement" },
          { value: "materials", label: "Dons de vêtements / couches / nourriture" },
          { value: "referral", label: "Partage de contacts fiables" },
          { value: "transport", label: "Aide au déplacement" }
        ],
        urgencyOptions: [
          { value: "standard", label: "Standard" },
          { value: "priority", label: "Prioritaire" },
          { value: "urgent", label: "Urgent" }
        ],
        contactOptions: [
          { value: "private", label: "En privé" },
          { value: "public", label: "Dans la communauté" }
        ],
        availabilityOptions: [
          { value: "today", label: "Aujourd'hui" },
          { value: "thisWeek", label: "Cette semaine" },
          { value: "flexible", label: "Flexible" }
        ],
        resourceItems: [
          { title: "Groupes de soutien entre mamans", description: "Orientez la personne vers un groupe thématique adapté à son besoin." },
          { title: "Centres de santé et hôpitaux", description: "Gardez une liste de lieux de soins ou de conseils fiables." },
          { title: "Contacts d'urgence et références", description: "Partagez uniquement des professionnels et services vérifiés." }
        ]
      };

  const sortedRequests = [...communityRequests].sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || ""))).slice(0, 6);
  const sortedOffers = [...communityOffers].sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || ""))).slice(0, 6);

  const handleSaveCommunityRequest = () => {
    if (!communityRequestForm.supportType || !communityRequestForm.details.trim()) {
      return;
    }

    setCommunityRequests((previous) => ([{
      id: createToolEntryId("support-request"),
      ...communityRequestForm,
      createdAt: new Date().toISOString(),
    }, ...previous]));
    setCommunityRequestForm({
      supportType: "",
      urgency: "standard",
      location: "",
      details: "",
      contactPreference: "private"
    });
  };

  const handleSaveCommunityOffer = () => {
    if (!communityOfferForm.helpType || !communityOfferForm.details.trim()) {
      return;
    }

    setCommunityOffers((previous) => ([{
      id: createToolEntryId("support-offer"),
      ...communityOfferForm,
      createdAt: new Date().toISOString(),
    }, ...previous]));
    setCommunityOfferForm({
      helpType: "",
      availability: "thisWeek",
      location: "",
      details: ""
    });
  };

  const handleDownloadSupportSummary = () => {
    if (typeof onDownloadFile !== "function") {
      return;
    }

    const content = [
      language === "ht" ? "Rezime soutyen kominotè" : "Résumé soutien communautaire",
      "",
      `${communityUi.recentRequests}: ${communityRequests.length}`,
      ...communityRequests.map((entry) => `${formatToolDate(String(entry.createdAt || "").slice(0, 10), language)} | ${communityUi.supportTypes.find((option) => option.value === entry.supportType)?.label || entry.supportType} | ${entry.location || "--"} | ${entry.details}`),
      "",
      `${communityUi.recentOffers}: ${communityOffers.length}`,
      ...communityOffers.map((entry) => `${formatToolDate(String(entry.createdAt || "").slice(0, 10), language)} | ${communityUi.offerTypes.find((option) => option.value === entry.helpType)?.label || entry.helpType} | ${entry.location || "--"} | ${entry.details}`),
    ].join("\n");

    onDownloadFile("soutien-communautaire.txt", content);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleDownloadSupportSummary}>
          <Download className="mr-2 h-4 w-4" />
          {communityUi.export}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-rose-200 bg-gradient-to-br from-rose-50 to-white">
          <CardHeader>
            <CardTitle>{communityUi.requestTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">{communityUi.supportType}</label>
              <select
                value={communityRequestForm.supportType}
                onChange={(e) => setCommunityRequestForm((previous) => ({ ...previous, supportType: e.target.value }))}
                className="w-full rounded-xl border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B2335]"
              >
                <option value="">{communityUi.supportType}</option>
                {communityUi.supportTypes.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">{communityUi.urgency}</label>
                <select
                  value={communityRequestForm.urgency}
                  onChange={(e) => setCommunityRequestForm((previous) => ({ ...previous, urgency: e.target.value }))}
                  className="w-full rounded-xl border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B2335]"
                >
                  {communityUi.urgencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">{communityUi.contactPreference}</label>
                <select
                  value={communityRequestForm.contactPreference}
                  onChange={(e) => setCommunityRequestForm((previous) => ({ ...previous, contactPreference: e.target.value }))}
                  className="w-full rounded-xl border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B2335]"
                >
                  {communityUi.contactOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">{communityUi.location}</label>
              <Input
                value={communityRequestForm.location}
                onChange={(e) => setCommunityRequestForm((previous) => ({ ...previous, location: e.target.value }))}
                placeholder={language === "ht" ? "Eg: Delma, Jakmèl" : "Ex: Delmas, Jacmel"}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">{communityUi.details}</label>
              <Textarea
                value={communityRequestForm.details}
                onChange={(e) => setCommunityRequestForm((previous) => ({ ...previous, details: e.target.value }))}
                placeholder={communityUi.requestPlaceholder}
                rows={4}
              />
            </div>
            <Button onClick={handleSaveCommunityRequest} disabled={!communityRequestForm.supportType || !communityRequestForm.details.trim()}>
              {communityUi.saveRequest}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader>
            <CardTitle>{communityUi.offerTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">{communityUi.supportType}</label>
              <select
                value={communityOfferForm.helpType}
                onChange={(e) => setCommunityOfferForm((previous) => ({ ...previous, helpType: e.target.value }))}
                className="w-full rounded-xl border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B2335]"
              >
                <option value="">{communityUi.offerTitle}</option>
                {communityUi.offerTypes.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">{communityUi.availability}</label>
                <select
                  value={communityOfferForm.availability}
                  onChange={(e) => setCommunityOfferForm((previous) => ({ ...previous, availability: e.target.value }))}
                  className="w-full rounded-xl border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B2335]"
                >
                  {communityUi.availabilityOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">{communityUi.location}</label>
                <Input
                  value={communityOfferForm.location}
                  onChange={(e) => setCommunityOfferForm((previous) => ({ ...previous, location: e.target.value }))}
                  placeholder={language === "ht" ? "Eg: Okap, Pòtoprens" : "Ex: Cap-Haïtien, Port-au-Prince"}
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">{communityUi.details}</label>
              <Textarea
                value={communityOfferForm.details}
                onChange={(e) => setCommunityOfferForm((previous) => ({ ...previous, details: e.target.value }))}
                placeholder={communityUi.offerPlaceholder}
                rows={4}
              />
            </div>
            <Button onClick={handleSaveCommunityOffer} disabled={!communityOfferForm.helpType || !communityOfferForm.details.trim()}>
              {communityUi.saveOffer}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{communityUi.recentRequests}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sortedRequests.length ? sortedRequests.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium text-slate-800">{communityUi.supportTypes.find((option) => option.value === entry.supportType)?.label || entry.supportType}</div>
                    <div className="rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-700">{communityUi.urgencyOptions.find((option) => option.value === entry.urgency)?.label || entry.urgency}</div>
                  </div>
                  <div className="mt-2 text-sm text-slate-600">{entry.details}</div>
                  <div className="mt-2 text-xs text-slate-500">{entry.location || "--"} · {formatToolDate(String(entry.createdAt || "").slice(0, 10), language)}</div>
                </div>
              )) : (
                <div className="text-sm text-slate-500">{communityUi.noRequests}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{communityUi.recentOffers}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sortedOffers.length ? sortedOffers.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium text-slate-800">{communityUi.offerTypes.find((option) => option.value === entry.helpType)?.label || entry.helpType}</div>
                    <div className="rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-700">{communityUi.availabilityOptions.find((option) => option.value === entry.availability)?.label || entry.availability}</div>
                  </div>
                  <div className="mt-2 text-sm text-slate-600">{entry.details}</div>
                  <div className="mt-2 text-xs text-slate-500">{entry.location || "--"} · {formatToolDate(String(entry.createdAt || "").slice(0, 10), language)}</div>
                </div>
              )) : (
                <div className="text-sm text-slate-500">{communityUi.noOffers}</div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
          <CardHeader>
            <CardTitle>{communityUi.resources}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {communityUi.resourceItems.map((resource) => (
              <div key={resource.title} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="font-medium text-slate-800">{resource.title}</div>
                <div className="mt-1 text-sm text-slate-600">{resource.description}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
