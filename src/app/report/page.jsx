"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Send } from "lucide-react";

export default function ReportPage() {
  const { language } = useLanguage();
  const [submitted, setSubmitted] = useState(false);
  const content = language === "ht"
    ? {
        title: "Siyale yon pwoblèm",
        description: "Ede nou amelyore platfòm nan lè ou esplike pwoblèm ou rankontre a.",
        typeLabel: "Kalite pwoblèm",
        selectType: "Chwazi...",
        types: {
          bug: "Pwoblèm teknik",
          content: "Kontni ki pa apwopriye",
          user: "Konpòtman abi",
          other: "Lòt",
        },
        subjectLabel: "Sijè",
        subjectPlaceholder: "Dekri pwoblèm nan an kout",
        descriptionLabel: "Deskripsyon",
        descriptionPlaceholder: "Bay plis detay sou pwoblèm nan...",
        submitLabel: "Voye siyalisyon an",
        successTitle: "Siyalisyon an voye",
        successDescription: "Mèsi pou siyalisyon ou. Ekip nou an ap egzamine demann ou a."
      }
    : {
        title: "Signaler un problème",
        description: "Aidez-nous à améliorer la plateforme en décrivant le problème rencontré.",
        typeLabel: "Type de problème",
        selectType: "Sélectionnez...",
        types: {
          bug: "Bug technique",
          content: "Contenu inapproprié",
          user: "Comportement abusif",
          other: "Autre",
        },
        subjectLabel: "Sujet",
        subjectPlaceholder: "Décrivez brièvement le problème",
        descriptionLabel: "Description",
        descriptionPlaceholder: "Donnez plus de détails...",
        submitLabel: "Envoyer le signalement",
        successTitle: "Signalement envoyé",
        successDescription: "Merci pour votre signalement. Notre équipe va examiner votre demande."
      };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">{content.successTitle}</h2>
            <p className="text-slate-600">{content.successDescription}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-slate-800 mb-2">{content.title}</h1>
          <p className="text-slate-600">{content.description}</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">{content.typeLabel}</label>
                <select className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" required>
                  <option value="">{content.selectType}</option>
                  <option>{content.types.bug}</option>
                  <option>{content.types.content}</option>
                  <option>{content.types.user}</option>
                  <option>{content.types.other}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{content.subjectLabel}</label>
                <Input placeholder={content.subjectPlaceholder} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{content.descriptionLabel}</label>
                <Textarea placeholder={content.descriptionPlaceholder} rows={5} required />
              </div>
              <Button type="submit" className="w-full">{content.submitLabel}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
