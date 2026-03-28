"use client";

import { useEffect, useState } from "react";
import { getGuides } from "@/lib/firestore";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Download, FileText, ExternalLink } from "lucide-react";

const getDefaultGuides = (t) => [
  {
    id: "1",
    title: t("guideNewMomTitle"),
    description: t("guideNewMomDesc"),
    type: t("pdf"),
    category: t("newMom"),
    downloadUrl: null,
  },
  {
    id: "2",
    title: t("guideChecklistBabyTitle"),
    description: t("guideChecklistBabyDesc"),
    type: t("checklist"),
    category: t("practical"),
    downloadUrl: null,
  },
  {
    id: "3",
    title: t("guideSleepRoutineTitle"),
    description: t("guideSleepRoutineDesc"),
    type: t("guide"),
    category: t("sleep"),
    downloadUrl: null,
  },
  {
    id: "4",
    title: t("guideFeedingTitle"),
    description: t("guideFeedingDesc"),
    type: t("pdf"),
    category: t("feeding"),
    downloadUrl: null,
  },
  {
    id: "5",
    title: t("guideBathSafetyTitle"),
    description: t("guideBathSafetyDesc"),
    type: t("article"),
    category: t("health"),
    downloadUrl: null,
  },
  {
    id: "6",
    title: t("guideChildRoutineTitle"),
    description: t("guideChildRoutineDesc"),
    type: t("guide"),
    category: t("practical"),
    downloadUrl: null,
  },
  {
    id: "7",
    title: t("guideTeenDialogueTitle"),
    description: t("guideTeenDialogueDesc"),
    type: t("article"),
    category: t("health"),
    downloadUrl: null,
  },
];

const mergeGuides = (defaultGuides, firestoreGuides = []) => {
  const mergedGuides = [...defaultGuides];
  const seen = new Set(
    defaultGuides.map((guide) => `${String(guide.title || "").trim().toLowerCase()}::${String(guide.type || "").trim().toLowerCase()}`)
  );

  firestoreGuides.forEach((guide) => {
    const key = `${String(guide.title || "").trim().toLowerCase()}::${String(guide.type || "").trim().toLowerCase()}`;
    if (!seen.has(key)) {
      mergedGuides.push(guide);
      seen.add(key);
    }
  });

  return mergedGuides;
};

const typeIcons = {
  "PDF": FileText,
  "Checklist": FileText,
  "Guide": BookOpen,
  "Article": ExternalLink,
  // Also handle translated values
  "pdf": FileText,
  "checklist": FileText,
  "guide": BookOpen,
  "article": ExternalLink,
};

const typeColors = {
  "PDF": "bg-rose-50 text-rose-700",
  "Checklist": "bg-emerald-50 text-emerald-700",
  "Guide": "bg-sky-50 text-sky-700",
  "Article": "bg-pink-50 text-pink-700",
  // Also handle translated values
  "pdf": "bg-rose-50 text-rose-700",
  "checklist": "bg-emerald-50 text-emerald-700",
  "guide": "bg-sky-50 text-sky-700",
  "article": "bg-pink-50 text-pink-700",
};

export default function GuidesPage() {
  const { t } = useLanguage();
  const [guides, setGuides] = useState(getDefaultGuides(t));

  useEffect(() => {
    async function load() {
      const defaultGuides = getDefaultGuides(t);
      try {
        const data = await getGuides();
        if (data.length > 0) {
          setGuides(mergeGuides(defaultGuides, data));
          return;
        }

        setGuides(defaultGuides);
      } catch (err) {
        console.error("Error loading guides:", err);
        setGuides(defaultGuides);
      }
    }
    load();
  }, [t]);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-200">
          <BookOpen className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{t("guidesTitle")}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {t("guidesDesc")}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {guides.map((guide) => {
          const Icon = typeIcons[guide.type] || BookOpen;
          const color = typeColors[guide.type] || "bg-slate-50 text-slate-700";
          return (
            <Card key={guide.id} className="rounded-[2rem] border-0 shadow-sm card-hover">
              <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Badge className={`w-fit max-w-full rounded-full ${color} hover:opacity-90`}>
                    <Icon className="mr-1 h-3 w-3" />
                    {t(guide.type)}
                  </Badge>
                  {guide.category && (
                    <Badge variant="outline" className="w-fit max-w-full rounded-full">
                      {guide.category}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg">{guide.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-slate-500">{guide.description}</p>
                {guide.downloadUrl ? (
                  <a href={guide.downloadUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="mt-4 w-full rounded-2xl sm:w-auto">
                      <Download className="mr-2 h-4 w-4" /> {t("download")}
                    </Button>
                  </a>
                ) : (
                  <Button variant="outline" className="mt-4 w-full rounded-2xl sm:w-auto" disabled>
                    {t("downloadSoon")}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Premium teaser */}
      <Card className="relative overflow-hidden rounded-[2.5rem] border-0 shadow-md">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-50 via-white to-pink-50" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-pink-300 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-rose-300 blur-3xl" />
        </div>
        <CardContent className="relative p-6 text-center sm:p-10">
          <div className="mx-auto mb-4 flex h-16 w-16 animate-float items-center justify-center rounded-2xl bg-gradient-to-br from-[#9B2335] to-[#6B1525] shadow-lg shadow-rose-200">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <h2 className="font-display text-2xl font-bold">{t("premiumContent")}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500">
            {t("premiumDesc")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
