"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  MessageCircle, 
  Users, 
  Shield, 
  ShoppingBag, 
  Heart,
  ChevronRight,
  HelpCircle,
  BookOpen,
  Video
} from "lucide-react";

export default function HelpPage() {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [showMonCashHelp, setShowMonCashHelp] = useState(false);
  const monCashHelp = language === "ht"
    ? {
        title: "Kijan peman MonCash mache",
        description: "Men etap prensipal yo pou peye yon atik ak MonCash sou Lakou Manman.",
        steps: [
          "Chwazi atik ou vle achte a nan boutique la.",
          "Antre nimewo MonCash ou nan fenèt peman an.",
          "Chwazi retrè oswa livrezon. Si se livrezon, sistèm nan ka sèvi ak GPS pou estime distans la ak frè yo.",
          "Ou resevwa yon SMS oswa yon konfimasyon pou valide tranzaksyon an.",
          "Apre validasyon an, peman an anrejistre epi ou ka resevwa detay acha a."
        ],
        note: "Toujou verifye nimewo a ak kantite lajan an avan ou konfime peman an.",
        close: "Fèmen",
      }
    : {
        title: "Comment fonctionne le paiement MonCash",
        description: "Voici les étapes principales pour payer un article avec MonCash sur Lakou Manman.",
        steps: [
          "Choisissez l'article que vous souhaitez acheter dans la boutique.",
          "Entrez votre numéro MonCash dans la fenêtre de paiement.",
          "Choisissez le retrait ou la livraison. En cas de livraison, le système peut utiliser le GPS pour estimer la distance et les frais.",
          "Vous recevez ensuite un SMS ou une confirmation pour valider la transaction.",
          "Après validation, le paiement est enregistré et vous pouvez recevoir les détails de l'achat."
        ],
        note: "Vérifiez toujours le numéro et le montant avant de confirmer votre paiement.",
        close: "Fermer",
      };

  const quickLinks = language === "ht"
    ? [
        { badge: "Popilè", label: "Kijan pou mwen kreye yon kont", href: "/register" },
        { badge: "Resan", label: "Kijan peman MonCash mache", action: "moncash-help" },
        { badge: "Ijan", label: "Mwen pa ka konekte", href: "/contact" }
      ]
    : [
        { badge: "Populaire", label: "Comment créer un compte", href: "/register" },
        { badge: "Récent", label: "Comment fonctionne le paiement MonCash", action: "moncash-help" },
        { badge: "Urgent", label: "Je n'arrive pas à me connecter", href: "/contact" }
      ];

  const supportActions = language === "ht"
    ? {
        email: "Sipò pa imèl",
        chat: "Kontakte nou",
        phone: "Sipò pa telefòn",
        browse: "Louvri"
      }
    : {
        email: "Support par email",
        chat: "Nous contacter",
        phone: "Support téléphonique",
        browse: "Ouvrir"
      };

  const helpCategories = [
    {
      icon: Users,
      title: t("gettingStarted") || "Commencer",
      description: t("gettingStartedDesc") || "Guide pour débuter sur Lakou Manman",
      articles: [
        {
          label: language === "ht" ? "Kreye kont ou" : "Créer votre compte",
          href: "/register"
        },
        {
          label: language === "ht" ? "Ranpli pwofil ou" : "Compléter votre profil",
          href: "/profile"
        },
        {
          label: language === "ht" ? "Dekouvri platfòm nan" : "Naviguer sur la plateforme",
          href: "/about"
        },
        {
          label: language === "ht" ? "Antre nan gwoup yo" : "Rejoindre des groupes",
          href: "/groups"
        }
      ],
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: MessageCircle,
      title: t("community") || "Communauté",
      description: t("communityHelpDesc") || "Questions sur les groupes et interactions",
      articles: [
        {
          label: language === "ht" ? "Pibliye nan gwoup yo" : "Publier dans les groupes",
          href: "/groups"
        },
        {
          label: language === "ht" ? "Kòmante ak renmen" : "Commenter et liker",
          href: "/feed"
        },
        {
          label: language === "ht" ? "Siyale yon kontni" : "Signaler un contenu",
          href: "/report"
        },
        {
          label: language === "ht" ? "Règleman gwoup yo" : "Modération des groupes",
          href: "/guidelines"
        }
      ],
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: ShoppingBag,
      title: t("boutique") || "Boutique",
      description: t("boutiqueHelpDesc") || "Aide pour l'achat et la vente",
      articles: [
        {
          label: language === "ht" ? "Achte yon atik" : "Acheter un article",
          href: "/boutique"
        },
        {
          label: language === "ht" ? "Vann yon pwodui" : "Vendre un produit",
          href: "/boutique"
        },
        {
          label: language === "ht" ? "Kijan peman MonCash mache" : "Comment fonctionne le paiement MonCash",
          action: "moncash-help"
        },
        {
          label: language === "ht" ? "Livrezon ak retrè" : "Livraison et retrait",
          href: "/boutique"
        }
      ],
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: Heart,
      title: t("pediatre") || "Pédiatre",
      description: t("pediatreHelpDesc") || "Consultations et services médicaux",
      articles: [
        {
          label: language === "ht" ? "Pran randevou" : "Prendre rendez-vous",
          href: "/pediatre"
        },
        {
          label: language === "ht" ? "Konsiltasyon videyo" : "Consultation vidéo",
          href: "/pediatre"
        },
        {
          label: language === "ht" ? "Kontakte pedyat la" : "Contacter le pédiatre",
          href: "/contact"
        },
        {
          label: language === "ht" ? "Pri ak disponiblite" : "Tarifs et disponibilités",
          href: "/pediatre"
        }
      ],
      color: "from-red-500 to-orange-500"
    },
    {
      icon: Shield,
      title: t("safety") || "Sécurité",
      description: t("safetyHelpDesc") || "Protection et confidentialité",
      articles: [
        {
          label: language === "ht" ? "Paramèt konfidansyalite" : "Paramètres de confidentialité",
          href: "/privacy"
        },
        {
          label: language === "ht" ? "Siyale yon pwoblèm" : "Signaler un problème",
          href: "/report"
        },
        {
          label: language === "ht" ? "Bloke yon itilizatè" : "Bloquer un utilisateur",
          href: "/guidelines#block-user"
        },
        {
          label: language === "ht" ? "Done pèsonèl" : "Données personnelles",
          href: "/privacy"
        }
      ],
      color: "from-indigo-500 to-purple-500"
    },
    {
      icon: Video,
      title: t("tools") || "Outils",
      description: t("toolsHelpDesc") || "Utiliser les outils pratiques",
      articles: [
        {
          label: language === "ht" ? "Kalkilatris gwosès" : "Calculateur grossesse",
          href: "/outils"
        },
        {
          label: language === "ht" ? "Swivi kwasans tibebe" : "Suivi croissance bébé",
          href: "/outils"
        },
        {
          label: language === "ht" ? "Tanperati ak sante" : "Température et santé",
          href: "/outils"
        },
        {
          label: language === "ht" ? "Kalandriye vaksen ak ijans" : "Calendrier vaccinal et urgences",
          href: "/outils"
        }
      ],
      color: "from-yellow-500 to-orange-500"
    }
  ];

  const filteredCategories = helpCategories.filter(category =>
    category.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.articles.some((article) => article.label.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            {t("helpCenter") || "Centre d'aide"}
          </h1>
          <p className="text-slate-600 mb-6">
            {t("helpDescription") || "Trouvez des réponses à vos questions"}
          </p>
          
          {/* Search */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              placeholder={t("searchHelp") || "Rechercher de l'aide..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Quick Help */}
        <Card className="mb-8 bg-gradient-to-r from-pink-100 to-purple-100 border-pink-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <HelpCircle className="h-6 w-6 text-pink-600" />
              <h2 className="text-lg font-semibold text-slate-800">
                {t("quickHelp") || "Aide rapide"}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickLinks.map((item) => (
                item.action === "moncash-help" ? (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setShowMonCashHelp(true)}
                    className="flex items-center gap-2 rounded-xl bg-white px-3 py-3 text-left transition hover:shadow-sm hover:-translate-y-0.5"
                  >
                    <Badge variant="outline" className="bg-white">
                      {item.badge}
                    </Badge>
                    <span className="text-sm text-slate-600">{item.label}</span>
                  </button>
                ) : (
                  <Link key={item.label} href={item.href} className="flex items-center gap-2 rounded-xl bg-white px-3 py-3 transition hover:shadow-sm hover:-translate-y-0.5">
                    <Badge variant="outline" className="bg-white">
                      {item.badge}
                    </Badge>
                    <span className="text-sm text-slate-600">{item.label}</span>
                  </Link>
                )
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Help Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((category, index) => {
            const Icon = category.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 bg-gradient-to-r ${category.color} rounded-lg flex items-center justify-center`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{category.title}</CardTitle>
                      <p className="text-sm text-slate-600">{category.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {category.articles.map((article, articleIndex) => (
                      article.action === "moncash-help" ? (
                        <button
                          key={articleIndex}
                          type="button"
                          onClick={() => setShowMonCashHelp(true)}
                          className="flex items-center gap-2 text-left text-sm text-slate-600 hover:text-slate-900"
                        >
                          <ChevronRight className="h-4 w-4" />
                          <span>{article.label}</span>
                        </button>
                      ) : (
                        <Link key={articleIndex} href={article.href} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
                          <ChevronRight className="h-4 w-4" />
                          <span>{article.label}</span>
                        </Link>
                      )
                    ))}
                  </div>
                  <Link href={category.articles[0]?.href || "/help"} className="mt-4 inline-flex text-sm font-medium text-pink-600 hover:text-pink-700">
                    {supportActions.browse}
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Contact Support */}
        <Card className="mt-8">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <BookOpen className="h-6 w-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-800">
                {t("stillNeedHelp") || "Besoin d'aide supplémentaire ?"}
              </h3>
            </div>
            <p className="text-slate-600 mb-4">
              {t("supportTeam") || "Notre équipe de support est là pour vous aider"}
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a href="mailto:contact@lakou-manman.com" className="inline-flex">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {supportActions.email}
                </Badge>
              </a>
              <Link href="/contact" className="inline-flex">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {supportActions.chat}
                </Badge>
              </Link>
              <a href="tel:+50932589391" className="inline-flex">
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  {supportActions.phone}
                </Badge>
              </a>
            </div>
          </CardContent>
        </Card>

        {showMonCashHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-800">{monCashHelp.title}</h2>
                  <p className="mt-2 text-sm text-slate-600">{monCashHelp.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMonCashHelp(false)}
                  className="rounded-full px-3 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>
              <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                <ol className="space-y-2 text-sm text-orange-800">
                  {monCashHelp.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <p className="mt-4 text-xs font-medium text-orange-700">{monCashHelp.note}</p>
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowMonCashHelp(false)}
                  className="rounded-xl bg-gradient-to-r from-[#9B2335] to-[#7B1A2C] px-4 py-2 text-sm font-medium text-white"
                >
                  {monCashHelp.close}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
