"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cookie, Shield, Settings } from "lucide-react";

export default function CookiesPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">{t("cookiePolicy") || "Politique cookies"}</h1>
          <p className="text-slate-600">{t("cookieDesc") || "Comment nous utilisons les cookies"}</p>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Cookie className="h-5 w-5" />{t("whatAreCookies") || "Que sont les cookies ?"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">{t("whatAreCookiesDesc") || "Les cookies sont de petits fichiers stockés sur votre appareil pour améliorer votre expérience."}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" />{t("howWeUseCookies") || "Comment nous utilisons les cookies"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">{t("howWeUseCookiesDesc") || "Nous utilisons des cookies pour sauvegarder vos préférences de langue et de thème, et pour améliorer la sécurité."}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />{t("manageCookies") || "Gérer vos cookies"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">{t("manageCookiesDesc") || "Vous pouvez gérer vos préférences de cookies dans les paramètres de votre navigateur."}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
