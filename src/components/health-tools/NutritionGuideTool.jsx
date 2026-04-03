"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NutritionGuideTool({ language, downloadLabel, onDownloadFile }) {
  const nutritionUi = language === "ht"
    ? {
        ageLabel: "Laj timoun nan",
        agePlaceholder: "Chwazi yon gwoup laj",
        feedingLabel: "Kalite alimantasyon",
        feedingPlaceholder: "Chwazi kalite alimantasyon an",
        goalLabel: "Sa ou bezwen jodi a",
        goalPlaceholder: "Chwazi objektif la",
        ageGroups: [
          { value: "0-6", label: "0-6 mwa" },
          { value: "6-12", label: "6-12 mwa" },
          { value: "1-3", label: "1-3 an" },
          { value: "4-6", label: "4-6 an" }
        ],
        feedingTypes: [
          { value: "breastfeeding", label: "Tete sèlman" },
          { value: "formula", label: "Lèt fòmil" },
          { value: "mixed", label: "Tete + lèt fòmil" },
          { value: "solids", label: "Divèsifikasyon / manje solid" }
        ],
        goals: [
          { value: "routine", label: "Woutin manje" },
          { value: "weight", label: "Pran pwa" },
          { value: "digestion", label: "Dijesyon / konstipasyon" },
          { value: "hydration", label: "Idratasyon" }
        ],
        summary: "Rekòmandasyon pèsonalize",
        foods: "Sa ou ka bay",
        avoid: "Sa pou evite",
        tips: "Konsèy rapid",
        alert: "Lè pou pale ak yon pedyat",
        empty: "Chwazi laj, kalite alimantasyon ak objektif pou wè gid la."
      }
    : {
        ageLabel: "Âge de l'enfant",
        agePlaceholder: "Choisissez une tranche d'âge",
        feedingLabel: "Type d'alimentation",
        feedingPlaceholder: "Choisissez le type d'alimentation",
        goalLabel: "Besoin du moment",
        goalPlaceholder: "Choisissez un objectif",
        ageGroups: [
          { value: "0-6", label: "0-6 mois" },
          { value: "6-12", label: "6-12 mois" },
          { value: "1-3", label: "1-3 ans" },
          { value: "4-6", label: "4-6 ans" }
        ],
        feedingTypes: [
          { value: "breastfeeding", label: "Allaitement maternel" },
          { value: "formula", label: "Lait infantile" },
          { value: "mixed", label: "Mixte" },
          { value: "solids", label: "Diversification / solides" }
        ],
        goals: [
          { value: "routine", label: "Routine repas" },
          { value: "weight", label: "Prise de poids" },
          { value: "digestion", label: "Digestion / constipation" },
          { value: "hydration", label: "Hydratation" }
        ],
        summary: "Recommandations personnalisées",
        foods: "Aliments conseillés",
        avoid: "À éviter",
        tips: "Conseils rapides",
        alert: "Quand consulter un pédiatre",
        empty: "Choisissez l'âge, le type d'alimentation et le besoin pour afficher le guide."
      };

  const [ageGroup, setAgeGroup] = useState("");
  const [feedingType, setFeedingType] = useState("");
  const [goal, setGoal] = useState("");

  const guideByAge = {
    "0-6": language === "ht"
      ? {
          foods: ["Tete sou demann", "Lèt fòmil si pedyat la konseye sa", "Po ti kantite lèt men souvan"],
          avoid: ["Dlo anvan 6 mwa san avi medikal", "Ji", "Lwil oswa te"],
          tips: ["Swiv kantite pipi tibebe a", "Obsève si li pran pwa byen", "Fè l ròt apre manje"],
          alert: "Si tibebe a pa pran pwa, pa vle tete, oswa li parèt dezidrate."
        }
      : {
          foods: ["Allaitement à la demande", "Lait infantile si recommandé", "Petites quantités fréquentes"],
          avoid: ["Eau avant 6 mois sans avis médical", "Jus", "Tisanes ou huiles"],
          tips: ["Surveillez les couches mouillées", "Vérifiez la prise de poids", "Faites faire le rot après les repas"],
          alert: "Consultez si bébé prend mal du poids, refuse de téter ou semble déshydraté."
        },
    "6-12": language === "ht"
      ? {
          foods: ["Labouyi sereyal fè", "Legim kraze", "Fwi kraze", "Pwoteyin mou tankou ze byen kwit oswa pwa kraze"],
          avoid: ["Sèl twòp", "Sik", "Siwo myèl anvan 1 an", "Moso manje ki ka bloke gòj la"],
          tips: ["Entwodui youn nouvo manje alafwa", "Kenbe lèt kòm baz alimantasyon an", "Obsève alèji posib"],
          alert: "Si timoun nan vomi souvan, gen dyare, oswa li pa aksepte okenn manje solid."
        }
      : {
          foods: ["Bouillies enrichies", "Purées de légumes", "Compotes sans sucre", "Protéines molles comme œuf bien cuit ou purée de pois"],
          avoid: ["Trop de sel", "Sucre ajouté", "Miel avant 1 an", "Morceaux à risque d'étouffement"],
          tips: ["Introduisez un aliment à la fois", "Gardez le lait comme base principale", "Surveillez les réactions allergiques"],
          alert: "Consultez si l'enfant vomit souvent, a de la diarrhée ou refuse totalement les solides."
        },
    "1-3": language === "ht"
      ? {
          foods: ["3 ti repa + 1 a 2 goute", "Legim, fwi, ze, pwa, diri, bannann, lèt oswa yogout"],
          avoid: ["Bwason dous", "Twòp fri", "Ti sirèt souvan"],
          tips: ["Ofri dlo pandan jounen an", "Pa fòse manje", "Fè yon orè regilye"],
          alert: "Si timoun nan pèdi pwa, fatige anpil oswa manje trè limite."
        }
      : {
          foods: ["3 petits repas + 1 à 2 collations", "Légumes, fruits, œufs, haricots, riz, banane, lait ou yaourt"],
          avoid: ["Boissons sucrées", "Trop de fritures", "Grignotage sucré fréquent"],
          tips: ["Proposez de l'eau dans la journée", "Ne forcez pas à manger", "Gardez des horaires réguliers"],
          alert: "Consultez si l'enfant perd du poids, paraît très fatigué ou mange extrêmement peu."
        },
    "4-6": language === "ht"
      ? {
          foods: ["Repa familyal ekilibre", "Pwoteyin chak jou", "Fwi ak legim varye", "Bon dejene chak maten"],
          avoid: ["Soda", "Twòp chips ak bonbon", "Repas sote souvan"],
          tips: ["Fè timoun nan patisipe nan chwa manje yo", "Bay bon egzanp lakay", "Kenbe aktivite fizik"],
          alert: "Si gen gwo chanjman apeti, doulè vant repete oswa ralantisman kwasans."
        }
      : {
          foods: ["Repas familiaux équilibrés", "Protéines chaque jour", "Fruits et légumes variés", "Petit-déjeuner quotidien"],
          avoid: ["Sodas", "Excès de chips et biscuits", "Repas sautés régulièrement"],
          tips: ["Impliquez l'enfant dans le choix des aliments", "Donnez l'exemple à la maison", "Maintenez une activité physique"],
          alert: "Consultez si l'appétit change brutalement, en cas de douleurs abdominales répétées ou de ralentissement de croissance."
        }
  };

  const goalAdjustments = {
    routine: language === "ht"
      ? ["Kenbe menm lè pou repa yo chak jou", "Privilèjye manje senp ak natirèl"]
      : ["Gardez des horaires de repas stables", "Privilégiez des repas simples et naturels"],
    weight: language === "ht"
      ? ["Ajoute manje ki bay enèji tankou zaboka, patat, bannann", "Mete pwoteyin souvan nan repa yo"]
      : ["Ajoutez des aliments énergétiques comme avocat, patate, banane", "Intégrez des protéines régulièrement"],
    digestion: language === "ht"
      ? ["Bay plis dlo selon laj la", "Privilèjye fwi ak legim ki gen fib"]
      : ["Augmentez l'eau selon l'âge", "Privilégiez fruits et légumes riches en fibres"],
    hydration: language === "ht"
      ? ["Ofri dlo souvan", "Siveye si bouch la sèch oswa pipi a ra"]
      : ["Proposez de l'eau souvent", "Surveillez bouche sèche ou urines rares"]
  };

  const recommendation = ageGroup
    ? {
        ...guideByAge[ageGroup],
        tips: [...(guideByAge[ageGroup]?.tips || []), ...(goalAdjustments[goal] || [])]
      }
    : null;

  const handleDownloadNutritionGuide = () => {
    if (!recommendation || typeof onDownloadFile !== "function") {
      return;
    }

    const content = [
      language === "ht" ? "Gid nitrisyon timoun" : "Guide nutrition enfant",
      "",
      `${nutritionUi.ageLabel}: ${nutritionUi.ageGroups.find((option) => option.value === ageGroup)?.label || "--"}`,
      `${nutritionUi.feedingLabel}: ${nutritionUi.feedingTypes.find((option) => option.value === feedingType)?.label || "--"}`,
      `${nutritionUi.goalLabel}: ${nutritionUi.goals.find((option) => option.value === goal)?.label || "--"}`,
      "",
      `${nutritionUi.foods}: ${recommendation.foods.join(", ")}`,
      `${nutritionUi.avoid}: ${recommendation.avoid.join(", ")}`,
      `${nutritionUi.tips}: ${recommendation.tips.join(", ")}`,
      `${nutritionUi.alert}: ${recommendation.alert}`,
    ].join("\n");

    onDownloadFile(`guide-nutrition-${ageGroup || "enfant"}.txt`, content);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium">{nutritionUi.ageLabel}</label>
          <select
            value={ageGroup}
            onChange={(e) => setAgeGroup(e.target.value)}
            className="w-full rounded-xl border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B2335]"
          >
            <option value="">{nutritionUi.agePlaceholder}</option>
            {nutritionUi.ageGroups.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">{nutritionUi.feedingLabel}</label>
          <select
            value={feedingType}
            onChange={(e) => setFeedingType(e.target.value)}
            className="w-full rounded-xl border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B2335]"
          >
            <option value="">{nutritionUi.feedingPlaceholder}</option>
            {nutritionUi.feedingTypes.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">{nutritionUi.goalLabel}</label>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full rounded-xl border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B2335]"
          >
            <option value="">{nutritionUi.goalPlaceholder}</option>
            {nutritionUi.goals.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      {!recommendation ? (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-6 text-sm text-yellow-800">
            {nutritionUi.empty}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleDownloadNutritionGuide}>
              <Download className="mr-2 h-4 w-4" />
              {downloadLabel}
            </Button>
          </div>
          <Card className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
            <CardContent className="p-6">
              <h3 className="mb-4 font-semibold">{nutritionUi.summary}</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <h4 className="mb-2 font-medium text-slate-800">{nutritionUi.foods}</h4>
                  <ul className="space-y-1 text-sm text-slate-600">
                    {recommendation.foods.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="mb-2 font-medium text-slate-800">{nutritionUi.avoid}</h4>
                  <ul className="space-y-1 text-sm text-slate-600">
                    {recommendation.avoid.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h4 className="mb-2 font-medium text-slate-800">{nutritionUi.tips}</h4>
              <ul className="space-y-1 text-sm text-slate-600">
                {recommendation.tips.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <h4 className="mb-2 font-medium text-red-800">{nutritionUi.alert}</h4>
              <p className="text-sm text-red-700">{recommendation.alert}</p>
              {feedingType ? (
                <p className="mt-3 text-sm text-red-700">
                  {language === "ht"
                    ? `Kalite alimantasyon chwazi a: ${nutritionUi.feedingTypes.find((option) => option.value === feedingType)?.label}`
                    : `Type d'alimentation choisi : ${nutritionUi.feedingTypes.find((option) => option.value === feedingType)?.label}`}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
