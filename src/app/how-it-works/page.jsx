"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Users, MessageCircle, Heart, ShoppingBag, Stethoscope } from "lucide-react";

export default function HowItWorksPage() {
  const { t } = useLanguage();

  const steps = [
    { icon: UserPlus, title: t("step1Title") || "Créez votre compte", description: t("step1Desc") || "Inscrivez-vous gratuitement en quelques secondes." },
    { icon: Users, title: t("step2Title") || "Rejoignez des groupes", description: t("step2Desc") || "Trouvez et rejoignez des groupes de mamans près de chez vous." },
    { icon: MessageCircle, title: t("step3Title") || "Partagez et échangez", description: t("step3Desc") || "Posez vos questions et partagez vos expériences." },
    { icon: Stethoscope, title: t("step4Title") || "Consultez un expert santé", description: t("step4Desc") || "Accédez à des conseils de pédiatres et d'autres professionnels selon vos besoins." },
    { icon: ShoppingBag, title: t("step5Title") || "Achetez et vendez", description: t("step5Desc") || "Trouvez des articles pour bébé dans la boutique." },
    { icon: Heart, title: t("step6Title") || "Soutenez la communauté", description: t("step6Desc") || "Aidez d'autres mamans avec vos conseils et expériences." },
  ];

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">{t("howItWorks") || "Comment ça marche"}</h1>
          <p className="text-slate-600">{t("howItWorksDesc") || "Découvrez comment utiliser Lakou Manman en 6 étapes simples"}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <Card key={i} className="text-center">
                <CardContent className="p-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-rose-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <div className="text-sm font-bold text-rose-500 mb-1">{t("step") || "Étape"} {i + 1}</div>
                  <h3 className="font-semibold text-slate-800 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-600">{step.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
