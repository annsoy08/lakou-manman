"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";

export default function TestimonialsPage() {
  const { t } = useLanguage();

  const testimonials = [
    { name: "Marie D.", location: "Port-au-Prince", text: t("testimonial1") || "Lakou Manman m'a aidée à trouver un groupe de mamans près de chez moi. Je ne me sens plus seule !", stars: 5 },
    { name: "Sophie P.", location: "Cap-Haïtien", text: t("testimonial2") || "La consultation avec le pédiatre en ligne m'a sauvé un voyage inutile aux urgences. Merci !", stars: 5 },
    { name: "Nathalie J.", location: "Miami", text: t("testimonial3") || "Même depuis la diaspora, je peux rester connectée avec les mamans en Haïti. C'est magnifique.", stars: 5 },
    { name: "Isabelle L.", location: "Pétion-Ville", text: t("testimonial4") || "La boutique m'a permis de vendre les vêtements que mon bébé ne portait plus. Très pratique !", stars: 4 },
    { name: "Carla M.", location: "Montréal", text: t("testimonial5") || "Les outils de suivi de grossesse sont incroyables. Je recommande à toutes les futures mamans.", stars: 5 },
    { name: "Roseline B.", location: "Les Cayes", text: t("testimonial6") || "Le guide de nutrition pour bébé m'a beaucoup aidée. Contenu validé et fiable.", stars: 5 },
  ];

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">{t("testimonials") || "Témoignages"}</h1>
          <p className="text-slate-600">{t("testimonialsDesc") || "Ce que les mamans disent de Lakou Manman"}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((item, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Quote className="h-8 w-8 text-rose-200 mb-3" />
                <p className="text-sm text-slate-700 mb-4 italic">{item.text}</p>
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: item.stars }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                <div className="font-semibold text-slate-800">{item.name}</div>
                <div className="text-xs text-slate-500">{item.location}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
