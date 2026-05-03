"use client";

import CommunitySupportTool from "@/components/health-tools/CommunitySupportTool";
import { useLanguage } from "@/contexts/LanguageContext";
import { HeartHandshake } from "lucide-react";

function downloadTextFile(filename, content) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = filename;
  window.document.body.appendChild(link);
  link.click();
  window.document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export default function SoutienPage() {
  const { language } = useLanguage();

  const ui = language === "ht"
    ? {
        title: "Soutyen Kominotè",
        subtitle: "Mande oswa bay èd nan kominote Lakou Manman an.",
      }
    : {
        title: "Soutien Communautaire",
        subtitle: "Demandez ou proposez de l'aide au sein de la communauté Lakou Manman.",
      };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-2 py-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200">
          <HeartHandshake className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-800">
            {ui.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{ui.subtitle}</p>
        </div>
      </div>

      <CommunitySupportTool language={language} onDownloadFile={downloadTextFile} />
    </div>
  );
}
