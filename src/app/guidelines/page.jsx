"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Shield, Users, AlertTriangle, CheckCircle } from "lucide-react";

export default function GuidelinesPage() {
  const { language } = useLanguage();

  const content = language === "ht"
    ? {
        title: "Gid kominotè",
        description: "Règ ak bon pratik nou yo pou kenbe kominote a an sekirite, akeyan ak itil.",
        rules: [
          { icon: Heart, title: "Respè youn pou lòt", description: "Trete chak manm avèk respè, dousè ak bon konpòtman.", color: "text-pink-500" },
          { icon: Shield, title: "Sekirite timoun yo", description: "Pa janm pataje enfòmasyon sansib sou pitit ou oswa sou lòt timoun.", color: "text-blue-500" },
          { icon: Users, title: "Enklizyon", description: "Akeyi tout manman san diskriminasyon, jijman oswa eksklizyon.", color: "text-purple-500" },
          { icon: CheckCircle, title: "Verite ak konfyans", description: "Pataje enfòmasyon ki serye, klè ak verifyab lè sa posib.", color: "text-green-500" },
          { icon: AlertTriangle, title: "Pa fè spam", description: "Evite piblisite agresif, move lyen oswa kontni ki pa itil kominote a.", color: "text-orange-500" },
        ],
        actionsTitle: "Pwoteje tèt ou ak kominote a",
        actions: [
          {
            id: "block-user",
            title: "Bloke yon itilizatè",
            description: "Si yon moun ap deranje ou, ap voye mesaj ki pa apwopriye oswa ap fè abi, ou ka sispann tout kontak avè l.",
            steps: [
              "Ale sou pwofil itilizatè a oswa nan konvèsasyon an.",
              "Sèvi ak zouti sekirite ki disponib oswa kontakte ekip sipò a si blokaj dirèk la poko disponib.",
              "Kenbe prèv yo epi voye yon siyalisyon si konpòtman an grav."
            ]
          },
          {
            id: "report-user",
            title: "Siyale yon kontni oswa yon manm",
            description: "Siyale nenpòt kontni danjere, abi oswa konpòtman ki vyole règ kominote a.",
            steps: [
              "Louvri paj siyalisyon an.",
              "Chwazi kalite pwoblèm nan epi dekri sa ki pase a ak detay.",
              "Ekip nou an ap revize siyalisyon an epi pran mezi si sa nesesè."
            ]
          }
        ]
      }
    : {
        title: "Directives communautaires",
        description: "Nos règles et bonnes pratiques pour garder une communauté sûre, bienveillante et utile.",
        rules: [
          { icon: Heart, title: "Respect mutuel", description: "Traitez chaque membre avec respect, bienveillance et courtoisie.", color: "text-pink-500" },
          { icon: Shield, title: "Sécurité des enfants", description: "Ne partagez jamais d'informations sensibles sur vos enfants ou ceux des autres.", color: "text-blue-500" },
          { icon: Users, title: "Inclusion", description: "Accueillez toutes les mamans sans discrimination, jugement ou exclusion.", color: "text-purple-500" },
          { icon: CheckCircle, title: "Authenticité", description: "Partagez des informations fiables, claires et vérifiables lorsque c'est possible.", color: "text-green-500" },
          { icon: AlertTriangle, title: "Pas de spam", description: "Évitez les promotions agressives, les liens douteux et le contenu inutile à la communauté.", color: "text-orange-500" },
        ],
        actionsTitle: "Se protéger et protéger la communauté",
        actions: [
          {
            id: "block-user",
            title: "Bloquer un utilisateur",
            description: "Si une personne vous dérange, envoie des messages inappropriés ou adopte un comportement abusif, vous devez pouvoir interrompre le contact.",
            steps: [
              "Ouvrez le profil de la personne ou la conversation concernée.",
              "Utilisez les outils de sécurité disponibles ou contactez l'équipe si le blocage direct n'est pas encore proposé.",
              "Conservez les éléments utiles et envoyez un signalement si la situation est grave."
            ]
          },
          {
            id: "report-user",
            title: "Signaler un contenu ou un membre",
            description: "Signalez tout contenu dangereux, abusif ou contraire aux règles de la communauté.",
            steps: [
              "Ouvrez la page de signalement.",
              "Choisissez le type de problème puis décrivez clairement la situation.",
              "Notre équipe examinera le dossier et prendra des mesures si nécessaire."
            ]
          }
        ]
      };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="mb-2 text-3xl font-bold text-slate-800">{content.title}</h1>
          <p className="text-slate-600">{content.description}</p>
        </div>

        <div className="space-y-4">
          {content.rules.map((rule, index) => {
            const Icon = rule.icon;

            return (
              <Card key={index}>
                <CardContent className="flex items-start gap-4 p-5">
                  <div className="mt-1">
                    <Icon className={`h-6 w-6 ${rule.color}`} />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-slate-800">{rule.title}</h3>
                    <p className="text-sm text-slate-600">{rule.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{content.actionsTitle}</CardTitle>
            </CardHeader>
          </Card>

          {content.actions.map((action) => (
            <Card key={action.id} id={action.id}>
              <CardContent className="p-5">
                <h3 className="mb-2 font-semibold text-slate-800">{action.title}</h3>
                <p className="mb-4 text-sm text-slate-600">{action.description}</p>
                <ol className="space-y-2 text-sm text-slate-700">
                  {action.steps.map((step) => (
                    <li key={step} className="rounded-xl bg-slate-50 px-3 py-2">
                      {step}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
