export function getPediatrePageConfig(language, t) {
  const isHt = language === "ht";

  return {
    theme: {
      pageClassName: "min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-white p-4",
      avatarFallbackClassName: "bg-gradient-to-br from-emerald-400 to-cyan-500 text-2xl text-white",
      heroBadgeClassName: "mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700",
      metaIconClassName: "h-4 w-4 text-emerald-600",
      primaryButtonClassName: "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600",
      fullPrimaryButtonClassName: "w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600",
      quickActionPrimaryButtonClassName: "w-full bg-emerald-600 hover:bg-emerald-700",
      selectedProfileCardClassName: "rounded-xl border border-emerald-300 bg-emerald-50 p-4 shadow-sm transition-all",
      unselectedProfileCardClassName: "rounded-xl border border-slate-200 bg-white p-4 transition-all",
      featuredBadgeClassName: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
      sectionIconClassName: "h-5 w-5 text-emerald-600",
      videoEmptyStateClassName: "rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-6 text-sm text-slate-600",
      videoCardPreviewClassName: "flex h-32 items-center justify-center bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 transition-transform group-hover:scale-[1.02]",
      articleIconWrapperClassName: "flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-100 to-cyan-100",
      successMessageClassName: "rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700",
      infoAccentTextClassName: "font-medium text-emerald-700",
    },
    ui: {
      initialsFallback: "PED",
      heroBadge: isHt ? "Pedyatri" : "Pédiatrie",
      heroTitle: isHt ? "Espas pedyatri Lakou Manman" : "Espace pédiatrie Lakou Manman",
      heroDescription: isHt
        ? "Jwenn pwofil pedyat ki pibliye yo, videyo itil yo, ak konsèy ki ede w pran bon desizyon pou tibebe ak timoun yo."
        : "Retrouvez les profils de pédiatres publiés, leurs vidéos utiles, et des conseils qui aident les familles à prendre les bons repères pour les bébés et les enfants.",
      selectedProfileLabel: isHt ? "Pedyat chwazi a" : "Pédiatre sélectionné",
      themesTitle: isHt ? "Sijè ki pi souvan poze kestyon" : "Questions fréquentes en pédiatrie",
      firstStepsTitle: isHt ? "Premye repè yo" : "Premiers repères",
      topics: isHt
        ? [
            "Lafyèv, tous, dyare ak siy dezidratasyon",
            "Alimantasyon tibebe ak kestyon sou kwasans",
            "Dòmi, devlopman ak kestyon sou konpòtman timoun yo",
            "Siy alèt ki mande yon swen rapid",
          ]
        : [
            "Fièvre, toux, diarrhée et signes de déshydratation",
            "Alimentation du bébé et questions de croissance",
            "Sommeil, développement et comportement de l'enfant",
            "Signes d'alerte qui demandent une prise en charge rapide",
          ],
      firstSteps: isHt
        ? [
            "Obsève sentòm yo ak depi kilè yo te kòmanse",
            "Veye sou lafyèv, respirasyon ak nivo enèji timoun nan",
            "Chèche yon konsèy pwofesyonèl si gen dout oswa siy gravite",
            "Pa ret tann si timoun nan parèt twò fèb oswa li pa bwè ditou",
          ]
        : [
            "Observer les symptômes et depuis quand ils ont commencé",
            "Surveiller la fièvre, la respiration et l'énergie de l'enfant",
            "Demander un avis professionnel en cas de doute ou de signe de gravité",
            "Ne pas attendre si l'enfant devient très faible ou refuse de boire",
          ],
      profileListTitle: isHt ? "Pedyat ki disponib yo" : "Pédiatres disponibles",
      profileListDescription: isHt
        ? "Chwazi pwofil pedyat ou vle mete an avan sou paj la."
        : "Choisissez le profil pédiatre que vous souhaitez mettre en avant sur la page.",
      profileFallbackTitle: isHt ? "Espas pedyatri a ap pare" : "L'espace pédiatrie se prépare",
      profileFallbackDescription: isHt
        ? "Nou ap mete pwofil pedyat verifye yo disponib sou espas sa a."
        : "Nous mettons progressivement à disposition les profils pédiatres vérifiés dans cet espace.",
      allLocations: isHt ? "Tout kote yo" : "Tous les lieux",
      selectedCard: isHt ? "Pwofil chwazi a" : "Profil sélectionné",
      chooseCard: isHt ? "Chwazi pwofil sa a" : "Choisir ce profil",
      featuredVideosTitle: isHt ? "Videyo pou gade" : "Vidéos à regarder",
      featuredVideosDescription: isHt
        ? "Videyo prezantasyon ak sansibilizasyon pedyat yo pataje pou fanmi yo."
        : "Vidéos de présentation et de sensibilisation partagées pour les familles.",
      noVideos: isHt ? "Pa gen videyo disponib pou kounye a." : "Aucune vidéo n'est disponible pour le moment.",
      resourcesTitle: isHt ? "Atik ak resous pedyatrik" : "Articles et ressources pédiatriques",
      resourcesDescription: isHt
        ? "Konsèy verifye sou kestyon ki tounen souvan lakay paran yo."
        : "Des conseils validés sur les questions qui reviennent souvent chez les parents.",
      emptyArticles: isHt ? "Atik pedyatrik yo ap disponib byento." : "Les articles pédiatriques seront disponibles bientôt.",
      contactTitle: isHt ? "Poze yon kesyon" : "Poser une question",
      contactDescription: isHt
        ? "Voye kestyon ou a bay ekip medikal la. Repons yo pa ranplase yon swen ijans."
        : "Envoyez votre question à l'équipe médicale. Les réponses ne remplacent pas une prise en charge d'urgence.",
      questionDisclaimerText: t("emergencyNote"),
      importantDisclaimerText: t("medicalDisclaimer"),
      disclaimerText: t("medicalDisclaimer"),
      quickActionsTitle: isHt ? "Aksyon rapid" : "Actions rapides",
      infoCardTitle: isHt ? "Enfòmasyon sou pwofil la" : "Informations sur le profil",
      infoCardDescription: isHt
        ? "Sa itil pou konnen kijan pwofil la ka ede w pi vit."
        : "L'essentiel pour savoir comment ce profil peut vous aider rapidement.",
      publicProfile: isHt ? "Pwofil piblik" : "Profil public",
      available: isHt ? "Wi" : "Oui",
      unavailable: isHt ? "Non" : "Non",
      videoLabel: isHt ? "Videyo" : "Vidéo",
      bookLabel: isHt ? "Pran randevou" : "Prendre rendez-vous",
      languagesLabel: isHt ? "Lang" : "Langues",
      experienceLabel: isHt ? "Eksperyans" : "Expérience",
      watchVideoLabel: isHt ? "Gade videyo a" : "Voir la vidéo",
      requestAppointment: isHt ? "Mande yon randevou" : "Demander un rendez-vous",
      askTeam: isHt ? "Poze kestyon ou" : "Poser votre question",
      openDashboard: isHt ? "Louvri dashboard medsen an" : "Ouvrir le dashboard médecin",
      importantTitle: isHt ? "Enpòtan" : "Important",
    },
    defaultArticles: [
      {
        id: "1",
        title: t("tipFeverTitle"),
        text: t("tipFeverText"),
        validated: true,
      },
      {
        id: "2",
        title: t("tipDehydrationTitle"),
        text: t("tipDehydrationText"),
        validated: true,
      },
      {
        id: "3",
        title: t("tipEmergencyTitle"),
        text: t("tipEmergencyText"),
        validated: true,
      },
    ],
  };
}

export function getGynecologyPageConfig(language, t) {
  const isHt = language === "ht";

  return {
    theme: {
      pageClassName: "min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-white p-4",
      avatarFallbackClassName: "bg-gradient-to-br from-rose-400 to-pink-500 text-2xl text-white",
      heroBadgeClassName: "mb-3 inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-1.5 text-sm font-medium text-rose-700",
      metaIconClassName: "h-4 w-4 text-rose-600",
      primaryButtonClassName: "bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600",
      fullPrimaryButtonClassName: "w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600",
      quickActionPrimaryButtonClassName: "w-full bg-rose-600 hover:bg-rose-700",
      selectedProfileCardClassName: "rounded-xl border border-rose-300 bg-rose-50 p-4 shadow-sm transition-all",
      unselectedProfileCardClassName: "rounded-xl border border-slate-200 bg-white p-4 transition-all",
      featuredBadgeClassName: "bg-rose-100 text-rose-700 hover:bg-rose-100",
      sectionIconClassName: "h-5 w-5 text-rose-600",
      videoEmptyStateClassName: "rounded-2xl border border-dashed border-rose-200 bg-rose-50/60 p-6 text-sm text-slate-600",
      videoCardPreviewClassName: "flex h-32 items-center justify-center bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 transition-transform group-hover:scale-[1.02]",
      articleIconWrapperClassName: "flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-100 to-pink-100",
      successMessageClassName: "rounded-xl bg-rose-50 p-3 text-sm text-rose-700",
      infoAccentTextClassName: "font-medium text-rose-700",
    },
    ui: {
      initialsFallback: "GYN",
      heroBadge: isHt ? "Jinekoloji" : "Gynécologie",
      heroTitle: isHt ? "Espas jinekoloji Lakou Manman" : "Espace gynécologie Lakou Manman",
      heroDescription: isHt
        ? "Jwenn pwofil jinekològ ki pibliye yo, resous itil sou swivi fanm, gwosès ak apre akouchman, ansanm ak kestyon ou ka voye bay ekip la."
        : "Retrouvez les profils publiés, des ressources utiles sur le suivi des femmes, la grossesse et le post-partum, ainsi qu'un espace pour poser vos questions à l'équipe.",
      selectedProfileLabel: isHt ? "Jinekològ chwazi a" : "Gynécologue sélectionné",
      themesTitle: isHt ? "Tèm moun poze kestyon sou yo" : "Thèmes souvent recherchés",
      firstStepsTitle: isHt ? "Premye repè yo" : "Premiers repères",
      topics: isHt
        ? [
            "Sik règ, doulè basen ak kestyon jinekolojik yo",
            "Gwosès, siy alèt ak kestyon sou swivi",
            "Post-partum, rekiperasyon ak kestyon sou kò a",
            "Kontrasepsyon ak prevansyon selon bezwen chak fanm",
          ]
        : [
            "Cycle menstruel, douleurs pelviennes et questions gynécologiques",
            "Grossesse, signes d'alerte et repères de suivi",
            "Post-partum, récupération et questions fréquentes",
            "Contraception et prévention selon les besoins de chaque femme",
          ],
      firstSteps: isHt
        ? [
            "Obsève sa k ap pase a ak depi kilè li te kòmanse",
            "Note siy alèt tankou doulè fò, senyen oswa malèz ki pèsiste",
            "Mande yon konsèy pwofesyonèl si ou pa fin sèten oswa si w ansent",
            "Pa ret tann si sentòm yo vin pi fò oswa yo pa nòmal",
          ]
        : [
            "Observer les symptômes et depuis quand ils ont commencé",
            "Noter les signes d'alerte comme une douleur forte, un saignement ou un malaise persistant",
            "Demander un avis professionnel en cas de doute, surtout pendant la grossesse",
            "Ne pas attendre si les symptômes s'intensifient ou semblent inhabituels",
          ],
      profileListTitle: isHt ? "Pwofil ki disponib yo" : "Profils disponibles",
      profileListDescription: isHt
        ? "Chwazi pwofil jinekoloji ou vle mete an avan sou paj la."
        : "Choisissez le profil gynécologie que vous souhaitez mettre en avant sur la page.",
      profileFallbackTitle: isHt ? "Espas jinekoloji a ap pare" : "L'espace gynécologie se prépare",
      profileFallbackDescription: isHt
        ? "Nou ap mete pwofil verifye yo disponib ti kras pa ti kras nan espas sa a."
        : "Nous mettons progressivement à disposition les profils vérifiés dans cet espace.",
      allLocations: isHt ? "Tout kote yo" : "Tous les lieux",
      selectedCard: isHt ? "Pwofil chwazi a" : "Profil sélectionné",
      chooseCard: isHt ? "Chwazi pwofil sa a" : "Choisir ce profil",
      featuredVideosTitle: isHt ? "Videyo pou gade" : "Vidéos à regarder",
      featuredVideosDescription: isHt
        ? "Videyo prezantasyon oswa sansibilizasyon sou kestyon jinekoloji ak gwosès."
        : "Vidéos de présentation ou de sensibilisation autour de la gynécologie et de la grossesse.",
      noVideos: isHt ? "Pa gen videyo disponib pou kounye a." : "Aucune vidéo n'est disponible pour le moment.",
      resourcesTitle: isHt ? "Atik ak resous" : "Articles et ressources",
      resourcesDescription: isHt
        ? "Kontni verifye sou kestyon ki tounen souvan nan swivi fanm yo."
        : "Des contenus utiles sur les questions qui reviennent souvent dans le suivi des femmes.",
      emptyArticles: isHt ? "Atik jinekoloji yo ap disponib byento." : "Les articles de gynécologie seront disponibles bientôt.",
      contactTitle: isHt ? "Poze yon kestyon" : "Poser une question",
      contactDescription: isHt
        ? "Voye kestyon jeneral ou a bay ekip la. Repons yo pa ranplase yon swen ijans."
        : "Envoyez votre question générale à l'équipe. Les réponses ne remplacent pas une prise en charge d'urgence.",
      disclaimerText: isHt
        ? "Enfòmasyon ki la yo se repè jeneral sèlman. Pou doulè fò, senyen, malèz oswa nenpòt ijans, chèche swen touswit."
        : "Les informations ici sont générales. En cas de douleur importante, saignement, malaise ou urgence, cherchez rapidement une prise en charge adaptée.",
      quickActionsTitle: isHt ? "Aksyon rapid" : "Actions rapides",
      infoCardTitle: isHt ? "Enfòmasyon sou pwofil la" : "Informations sur le profil",
      infoCardDescription: isHt
        ? "Sa itil pou konnen kijan pwofil la ka ede w pi vit."
        : "L'essentiel pour savoir comment ce profil peut vous aider rapidement.",
      publicProfile: isHt ? "Pwofil piblik" : "Profil public",
      available: isHt ? "Wi" : "Oui",
      unavailable: isHt ? "Non" : "Non",
      videoLabel: isHt ? "Videyo" : "Vidéo",
      bookLabel: isHt ? "Pran randevou" : "Prendre rendez-vous",
      languagesLabel: isHt ? "Lang" : "Langues",
      experienceLabel: isHt ? "Eksperyans" : "Expérience",
      watchVideoLabel: isHt ? "Gade videyo a" : "Voir la vidéo",
      requestAppointment: isHt ? "Mande yon randevou" : "Demander un rendez-vous",
      askTeam: isHt ? "Poze kestyon ou" : "Poser votre question",
      openDashboard: isHt ? "Louvri dashboard medsen an" : "Ouvrir le dashboard médecin",
      importantTitle: isHt ? "Enpòtan" : "Important",
    },
    defaultArticles: isHt
      ? [
          {
            id: "gyne-default-1",
            title: "Konprann sik règ la",
            excerpt: "Repè senp pou konprann sik la ak kèk chanjman ki ka nòmal oswa mande plis atansyon.",
            category: "Sik",
            validated: true,
          },
          {
            id: "gyne-default-2",
            title: "Siy alèt pandan gwosès",
            excerpt: "Kilè li enpòtan pou konsilte rapidman pandan gwosès la pou pa rete ak dout.",
            category: "Gwosès",
            validated: true,
          },
          {
            id: "gyne-default-3",
            title: "Swen apre akouchman",
            excerpt: "Post-partum lan vini ak kestyon sou rekiperasyon, doulè, senyen ak kestyon emosyonèl yo.",
            category: "Post-partum",
            validated: true,
          },
        ]
      : [
          {
            id: "gyne-default-1",
            title: "Comprendre son cycle menstruel",
            excerpt: "Des repères simples pour mieux comprendre le cycle et reconnaître quand un avis est utile.",
            category: "Cycle",
            validated: true,
          },
          {
            id: "gyne-default-2",
            title: "Signes d'alerte pendant la grossesse",
            excerpt: "Quand il devient important de consulter rapidement pendant la grossesse pour ne pas rester seule avec un doute.",
            category: "Grossesse",
            validated: true,
          },
          {
            id: "gyne-default-3",
            title: "Bien vivre le post-partum",
            excerpt: "Le post-partum soulève souvent des questions sur la récupération, les douleurs, les saignements et l'équilibre émotionnel.",
            category: "Post-partum",
            validated: true,
          },
        ],
  };
}

export function getPsychologyPageConfig(language, t) {
  const isHt = language === "ht";

  return {
    theme: {
      pageClassName: "min-h-screen bg-gradient-to-br from-violet-50 via-fuchsia-50 to-white p-4",
      avatarFallbackClassName: "bg-gradient-to-br from-violet-400 to-fuchsia-500 text-2xl text-white",
      heroBadgeClassName: "mb-3 inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-1.5 text-sm font-medium text-violet-700",
      metaIconClassName: "h-4 w-4 text-violet-600",
      primaryButtonClassName: "bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600",
      fullPrimaryButtonClassName: "w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600",
      quickActionPrimaryButtonClassName: "w-full bg-violet-600 hover:bg-violet-700",
      selectedProfileCardClassName: "rounded-xl border border-violet-300 bg-violet-50 p-4 shadow-sm transition-all",
      unselectedProfileCardClassName: "rounded-xl border border-slate-200 bg-white p-4 transition-all",
      featuredBadgeClassName: "bg-violet-100 text-violet-700 hover:bg-violet-100",
      sectionIconClassName: "h-5 w-5 text-violet-600",
      videoEmptyStateClassName: "rounded-2xl border border-dashed border-violet-200 bg-violet-50/60 p-6 text-sm text-slate-600",
      videoCardPreviewClassName: "flex h-32 items-center justify-center bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 transition-transform group-hover:scale-[1.02]",
      articleIconWrapperClassName: "flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-100 to-fuchsia-100",
      successMessageClassName: "rounded-xl bg-violet-50 p-3 text-sm text-violet-700",
      infoAccentTextClassName: "font-medium text-violet-700",
    },
    ui: {
      initialsFallback: "PSY",
      heroBadge: isHt ? "Sikoloji" : "Psychologie",
      heroTitle: isHt ? "Espas sikoloji Lakou Manman" : "Espace psychologie Lakou Manman",
      heroDescription: isHt
        ? "Jwenn pwofil piblik yo, resous sou estrès, chaj mantal, adolesans ak byennèt, ansanm ak yon espas kestyon jeneral."
        : "Retrouvez les profils publics, des ressources autour du stress, de la charge mentale, de l'adolescence et du bien-être, ainsi qu'un espace de questions générales.",
      selectedProfileLabel: isHt ? "Pwofil sipò chwazi a" : "Profil de soutien sélectionné",
      themesTitle: isHt ? "Tèm yo abòde souvan" : "Thèmes souvent abordés",
      firstStepsTitle: isHt ? "Premye repè yo" : "Premiers repères",
      topics: isHt
        ? [
            "Estrès, chaj mantal ak fatig emosyonèl",
            "Paran, relasyon nan fanmi ak adolesans",
            "Bezwen sipò lè lavi a vin twò lou",
            "Kijan pou jwenn bon kestyon pou poze oswa bon pòt pou frape",
          ]
        : [
            "Stress, charge mentale et fatigue émotionnelle",
            "Parentalité, relations familiales et adolescence",
            "Besoin de soutien quand le quotidien devient trop lourd",
            "Repères simples pour savoir vers qui se tourner",
          ],
      firstSteps: isHt
        ? [
            "Mete mo sou sa w ap viv la san w pa minimize li",
            "Obsève si sa ap dire, si sa ap vin pi fò oswa si sa bloke lavi chak jou",
            "Chèche yon espas kote w ka pale ak konfyans",
            "Pou ijans oswa risk imedya, chèche èd touswit"
          ]
        : [
            "Mettre des mots sur ce que vous vivez sans le minimiser",
            "Observer si cela dure, s'intensifie ou bloque le quotidien",
            "Chercher un espace où parler en confiance",
            "En cas d'urgence ou de danger immédiat, demander de l'aide sans attendre",
          ],
      profileListTitle: isHt ? "Pwofil ki disponib yo" : "Profils disponibles",
      profileListDescription: isHt
        ? "Chwazi pwofil sipò oswa sikoloji ou vle mete an avan sou paj la."
        : "Choisissez le profil de soutien ou de psychologie à mettre en avant sur la page.",
      profileFallbackTitle: isHt ? "Espas sikoloji a ap pare" : "L'espace psychologie se prépare",
      profileFallbackDescription: isHt
        ? "Nou ap mete pwofil verifye yo disponib ti kras pa ti kras nan espas sa a."
        : "Nous mettons progressivement à disposition les profils vérifiés dans cet espace.",
      allLocations: isHt ? "Tout fòma yo" : "Tous les formats",
      selectedCard: isHt ? "Pwofil chwazi a" : "Profil sélectionné",
      chooseCard: isHt ? "Chwazi pwofil sa a" : "Choisir ce profil",
      featuredVideosTitle: isHt ? "Videyo pou gade" : "Vidéos à regarder",
      featuredVideosDescription: isHt
        ? "Kontni videyo sou byennèt, sipò emosyonèl ak kestyon fanmi yo."
        : "Contenus vidéo autour du bien-être, du soutien émotionnel et des questions familiales.",
      noVideos: isHt ? "Pa gen videyo disponib pou kounye a." : "Aucune vidéo n'est disponible pour le moment.",
      resourcesTitle: isHt ? "Atik ak resous" : "Articles et ressources",
      resourcesDescription: isHt
        ? "Resous ki ede w pran premye repè yo anvan ou chèche plis sipò si sa nesesè."
        : "Des ressources qui aident à poser les premiers repères avant de chercher davantage de soutien si nécessaire.",
      emptyArticles: isHt ? "Atik sikoloji yo ap disponib byento." : "Les articles de psychologie seront disponibles bientôt.",
      contactTitle: isHt ? "Poze yon kestyon" : "Poser une question",
      contactDescription: isHt
        ? "Voye kestyon jeneral ou a. Espas la pa ranplase yon swen ijans oswa yon swivi pèsonalize."
        : "Envoyez votre question générale. Cet espace ne remplace pas une urgence ni un accompagnement personnalisé.",
      disclaimerText: isHt
        ? "Sipò ki prezante la a pa ranplase yon evalyasyon medikal oswa yon sèvis ijans. Si sitiyasyon an grav oswa gen risk pou tèt ou oswa yon lòt moun, chèche èd touswit."
        : "Le soutien présenté ici ne remplace pas une évaluation médicale ou un dispositif d'urgence. Si la situation est grave ou s'il existe un risque immédiat pour vous ou pour quelqu'un d'autre, cherchez de l'aide tout de suite.",
      quickActionsTitle: isHt ? "Aksyon rapid" : "Actions rapides",
      infoCardTitle: isHt ? "Enfòmasyon sou pwofil la" : "Informations sur le profil",
      infoCardDescription: isHt
        ? "Sa itil pou konnen kijan pwofil la ka ede w pi vit."
        : "L'essentiel pour savoir comment ce profil peut vous aider rapidement.",
      publicProfile: isHt ? "Pwofil piblik" : "Profil public",
      available: isHt ? "Wi" : "Oui",
      unavailable: isHt ? "Non" : "Non",
      videoLabel: isHt ? "Videyo" : "Vidéo",
      bookLabel: isHt ? "Pran kontak" : "Prendre contact",
      languagesLabel: isHt ? "Lang" : "Langues",
      experienceLabel: isHt ? "Eksperyans" : "Approche",
      watchVideoLabel: isHt ? "Gade videyo a" : "Voir la vidéo",
      requestAppointment: isHt ? "Mande sipò" : "Demander un échange",
      askTeam: isHt ? "Poze kestyon ou" : "Poser votre question",
      openDashboard: isHt ? "Louvri dashboard medsen an" : "Ouvrir le dashboard médecin",
      importantTitle: isHt ? "Enpòtan" : "Important",
    },
    defaultArticles: isHt
      ? [
          {
            id: "psy-default-1",
            title: "Konprann chaj mantal la",
            excerpt: "Lè tout bagay sanble chita sou do w, gen siy ki ka ede w remake sa pi vit.",
            category: "Byennèt",
            validated: true,
          },
          {
            id: "psy-default-2",
            title: "Pale ak yon adolesan san tansyon",
            excerpt: "Kèk repè senp pou fè kominikasyon an pi poze lakay ou.",
            category: "Adolesans",
            validated: true,
          },
          {
            id: "psy-default-3",
            title: "Lè estrès la pran twòp plas",
            excerpt: "Ki siy ki ka montre li tan pou jwenn plis sipò nan sa w ap viv la.",
            category: "Estrès",
            validated: true,
          },
        ]
      : [
          {
            id: "psy-default-1",
            title: "Comprendre la charge mentale",
            excerpt: "Quand tout semble reposer sur vous, certains signes peuvent aider à reconnaître plus tôt l'épuisement émotionnel.",
            category: "Bien-être",
            validated: true,
          },
          {
            id: "psy-default-2",
            title: "Mieux dialoguer avec un adolescent",
            excerpt: "Quelques repères simples pour apaiser les échanges et garder un cadre sécurisant à la maison.",
            category: "Adolescence",
            validated: true,
          },
          {
            id: "psy-default-3",
            title: "Quand le stress prend trop de place",
            excerpt: "Des repères pour reconnaître qu'il est peut-être temps de demander davantage de soutien.",
            category: "Stress",
            validated: true,
          },
        ],
  };
}
