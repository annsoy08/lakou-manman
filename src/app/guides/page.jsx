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
    title: "Guide nouvo manman",
    description: "Sa pou prepare pou premye 3 mwa yo. Yon guide konplè pou ede ou nan premye jou ak tibebe a.",
    type: "PDF",
    category: t("newMom"),
    downloadUrl: null,
  },
  {
    id: "2",
    title: "Checklist sak tibebe",
    description: "Lis pratik pou soti ak tibebe san bliye anyen. Tout sa ou bezwen nan sak la.",
    type: "Checklist",
    category: t("practical"),
    downloadUrl: null,
  },
  {
    id: "3",
    title: "Routine dòmi tibebe",
    description: "Yon modèl senp pou ede kreye abitid dòmi. Etap pa etap pou yon nuit pi kalm.",
    type: "Guide",
    category: t("sleep"),
    downloadUrl: null,
  },
  {
    id: "4",
    title: "Alimentation tibebe 0-12 mwa",
    description: "Ki sa pou bay tibebe manje selon laj li. Tete, fòmil, ak premye manje solid.",
    type: "PDF",
    category: t("feeding"),
    downloadUrl: null,
  },
  {
    id: "5",
    title: "Swen kòdonbilik",
    description: "Kijan pou pran swen kòdonbilik tibebe a jiskaske li tonbe. Konsèy ijyèn ak sekirite.",
    type: "Article",
    category: t("health"),
    downloadUrl: null,
  },
];

const typeIcons = {
  PDF: FileText,
  Checklist: FileText,
  Guide: BookOpen,
  Article: ExternalLink,
};

const typeColors = {
  PDF: "bg-rose-50 text-rose-700",
  Checklist: "bg-emerald-50 text-emerald-700",
  Guide: "bg-sky-50 text-sky-700",
  Article: "bg-pink-50 text-pink-700",
};

export default function GuidesPage() {
  const { t } = useLanguage();
  const [guides, setGuides] = useState(getDefaultGuides(t));

  useEffect(() => {
    async function load() {
      try {
        const data = await getGuides();
        if (data.length > 0) setGuides(data);
      } catch (err) {
        console.error("Error loading guides:", err);
      }
    }
    load();
  }, []);

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
                <div className="flex items-center justify-between">
                  <Badge className={`rounded-full ${color} hover:opacity-90`}>
                    <Icon className="mr-1 h-3 w-3" />
                    {guide.type}
                  </Badge>
                  {guide.category && (
                    <Badge variant="outline" className="rounded-full">
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
                    <Button variant="outline" className="mt-4 rounded-2xl">
                      <Download className="mr-2 h-4 w-4" /> {t("download")}
                    </Button>
                  </a>
                ) : (
                  <Button variant="outline" className="mt-4 rounded-2xl" disabled>
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
        <CardContent className="relative p-10 text-center">
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
