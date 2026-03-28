"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";

export default function FaqPage() {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    { q: t("faq1Q") || "Comment créer un compte ?", a: t("faq1A") || "Cliquez sur 'S'inscrire', remplissez le formulaire avec votre email et mot de passe, puis validez." },
    { q: t("faq2Q") || "Comment rejoindre un groupe ?", a: t("faq2A") || "Allez dans l'onglet Groupes, cherchez un groupe qui vous intéresse et cliquez sur 'Rejoindre'." },
    { q: t("faq3Q") || "Comment contacter le pédiatre ?", a: t("faq3A") || "Rendez-vous sur la page Pédiatre et utilisez les boutons d'appel, WhatsApp ou le formulaire de contact." },
    { q: t("faq4Q") || "Comment vendre un article ?", a: t("faq4A") || "Dans la Boutique, cliquez sur 'Vendre un article', remplissez les détails et publiez." },
    { q: t("faq5Q") || "Comment payer avec MonCash ?", a: t("faq5A") || "Lors de l'achat, choisissez MonCash, entrez votre numéro de téléphone et confirmez le paiement." },
    { q: t("faq6Q") || "L'application est-elle gratuite ?", a: t("faq6A") || "Oui, l'inscription et l'utilisation de la plateforme sont entièrement gratuites." },
    { q: t("faq7Q") || "Comment changer la langue ?", a: t("faq7A") || "Utilisez le sélecteur de langue dans la barre de navigation pour passer du français au créole." },
    { q: t("faq8Q") || "Comment signaler un contenu ?", a: t("faq8A") || "Cliquez sur les trois points à côté d'un post et sélectionnez 'Signaler'." },
  ];

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <HelpCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-slate-800 mb-2">{t("faq") || "Questions fréquentes"}</h1>
          <p className="text-slate-600">{t("faqDesc") || "Trouvez des réponses aux questions les plus courantes"}</p>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <Card key={i} className="cursor-pointer" onClick={() => setOpenIndex(openIndex === i ? null : i)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-slate-800">{faq.q}</h3>
                  {openIndex === i ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                </div>
                {openIndex === i && (
                  <p className="mt-3 text-sm text-slate-600 border-t pt-3">{faq.a}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
