"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Users, Stethoscope, ShoppingBag, Wrench, BookOpen, Heart, Shield, Globe } from "lucide-react";

export default function FeaturesPage() {
  const { t } = useLanguage();

  const features = [
    { icon: MessageCircle, title: t("featureCommunity") || "Communauté active", description: t("featureCommunityDesc") || "Partagez vos expériences et obtenez du soutien.", color: "from-pink-500 to-rose-500" },
    { icon: Users, title: t("featureGroups") || "Groupes thématiques", description: t("featureGroupsDesc") || "Rejoignez des groupes par thème ou localisation.", color: "from-purple-500 to-indigo-500" },
    { icon: Stethoscope, title: t("featureDoctor") || "Accès experts santé", description: t("featureDoctorDesc") || "Consultez des pédiatres et d'autres professionnels qualifiés en ligne ou en personne.", color: "from-blue-500 to-cyan-500" },
    { icon: ShoppingBag, title: t("featureBoutique") || "Boutique en ligne", description: t("featureBoutiqueDesc") || "Achetez et vendez des articles pour bébé.", color: "from-green-500 to-emerald-500" },
    { icon: Wrench, title: t("featureTools") || "Outils pratiques", description: t("featureToolsDesc") || "Calculateurs, suivi de croissance et plus.", color: "from-orange-500 to-amber-500" },
    { icon: BookOpen, title: t("featureGuides") || "Guides et ressources", description: t("featureGuidesDesc") || "Contenus validés par des professionnels.", color: "from-teal-500 to-green-500" },
    { icon: Globe, title: t("featureMultilingual") || "Multilingue", description: t("featureMultilingualDesc") || "Disponible en français et créole haïtien.", color: "from-indigo-500 to-purple-500" },
    { icon: Shield, title: t("featureSafety") || "Sécurité", description: t("featureSafetyDesc") || "Plateforme modérée et sécurisée.", color: "from-red-500 to-pink-500" },
    { icon: Heart, title: t("featureSupport") || "Soutien mutuel", description: t("featureSupportDesc") || "Entraide entre mamans du monde entier.", color: "from-rose-500 to-pink-500" },
  ];

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">{t("features") || "Fonctionnalités"}</h1>
          <p className="text-slate-600">{t("featuresDesc") || "Tout ce que Lakou Manman offre aux mamans"}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <Card key={i} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 bg-gradient-to-br ${f.color} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-600">{f.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
