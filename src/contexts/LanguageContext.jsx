"use client";

import { createContext, useContext, useState, useEffect } from "react";

const translations = {
  fr: {
    // Navigation
    home: "Accueil",
    feed: "Communauté",
    groups: "Groupes",
    doctor: "Pédiatre",
    tools: "Outils",
    guides: "Guides",
    boutique: "Boutique",
    messages: "Messages",
    favorites: "Favoris",
    notifications: "Notifications",
    profile: "Profil",
    login: "Connexion",
    register: "S'inscrire",
    logout: "Déconnexion",
    
    // Boutique
    sellItem: "Vendre un article",
    searchPlaceholder: "Rechercher un article...",
    filters: "Filtres",
    clearFilters: "Effacer les filtres",
    sortBy: "Trier par",
    priceLowToHigh: "Prix croissant",
    priceHighToLow: "Prix décroissant",
    newest: "Plus récent",
    localOnly: "Uniquement local",
    marketplace: "Place du marché",
    myFavorites: "Mes favoris",
    addToFavorites: "Ajouter aux favoris",
    removeFromFavorites: "Retirer des favoris",
    postFirstItem: "Soyez la première à publier un article !",
    clearAll: "Effacer tout",
    applyFilters: "Appliquer les filtres",
    reset: "Réinitialiser",
    allLocations: "Toutes les lieux",
    
    // Categories
    vetements: "Vêtements",
    jouets: "Jouets",
    mobilier: "Mobilier",
    livres: "Livres",
    poussettes: "Poussettes & Sièges",
    transport: "Transport",
    autres: "Autres",
    
    // Messages
    conversations: "Conversations",
    sendMessage: "Envoyer",
    typeMessage: "Tapez votre message...",
    noMessages: "Aucun message",
    startConversation: "Commencer une conversation",
    
    // Reviews
    reviews: "Avis",
    rating: "Note",
    writeReview: "Donner votre avis",
    yourReview: "Votre avis",
    noReviews: "Aucun avis",
    beFirstToReview: "Soyez le premier à donner votre avis !",
    
    // Notifications
    markAllAsRead: "Tout marquer comme lu",
    noNotifications: "Aucune notification",
    
    // Admin
    adminPanel: "Administration",
    managePosts: "Gérer les publications",
    manageUsers: "Gérer les utilisateurs",
    statistics: "Statistiques",
    
    // Site texts
    title: "Lakou Manman — Communauté de mères haïtiennes",
    description: "Une plateforme interactive où les mères haïtiennes trouvent conseils, soutien et partagent leurs expériences.",
    welcomeBanner: "Bienvenue dans Lakou Manman — Communauté de mères haïtiennes du monde entier",
    aboutTitle: "À propos de Lakou Manman",
    mission: "Une communauté de mères haïtiennes du monde entier pour partager, apprendre et se soutenir mutuellement.",
    siteDescription: "Une plateforme interactive où les mères haïtiennes trouvent conseils, soutien et partagent leurs expériences — avec une communauté engagée, des ressources pratiques, du contenu de confiance, et l'ambition de devenir le véritable réseau social des mères.",
    
    // Home page features
    communityTitle: "Communauté",
    communityDesc: "Posez vos questions, partagez vos expériences et trouvez du soutien auprès des autres mamans haïtiennes.",
    supportGroupsTitle: "Groupes d'entraide",
    supportGroupsDesc: "Rejoignez des groupes pour discuter de sujets précis et obtenir des conseils d'experts.",
    pediatricAdviceTitle: "Conseils pédiatriques",
    pediatricAdviceDesc: "Trouvez des recommandations de médecins pour la santé et le bien-être de votre bébé.",
    educationalResourcesTitle: "Ressources éducatives",
    educationalResourcesDesc: "Accédez à nos guides et articles sur la santé maternelle et infantile.",
    practicalToolsTitle: "Outils pratiques",
    practicalToolsDesc: "Calculettes de grossesse, suivi alimentaire et autres outils pour les mamans.",
    localResourcesTitle: "Services locaux",
    localResourcesDesc: "Découvrez les services de santé et d'accompagnement près de chez vous.",
    
    // Common
    loading: "Chargement...",
    save: "Sauvegarder",
    cancel: "Annuler",
    delete: "Supprimer",
    edit: "Modifier",
    confirm: "Confirmer",
    back: "Retour",
    next: "Suivant",
    submit: "Envoyer",
    required: "Obligatoire",
    optional: "Optionnel",
    
    // Home page buttons
    createAccount: "Créer mon compte",
    seeCommunity: "Voir la communauté",
    
    // Stats
    statMothers: "mères dans la communauté",
    statSupport: "espace questions & soutien",
    statCities: "villes de la diaspora actives",
    statGroups: "groupes communautaires",
    
    // Section titles
    featuresTitle: "Ce que Lakou Manman vous offre",
    featuresSubtitle: "Tout ce dont une mère a besoin, en un seul lieu.",
    testimonialsTitle: "Ce que nos mamans disent",
    testimonialsSubtitle: "Découvrez les expériences de notre communauté",
    
    // CTA Section
    ctaTitle: "Rejoignez la communauté dès aujourd'hui",
    ctaDescription: "Inscrivez-vous gratuitement, créez votre profil et commencez à partager avec d'autres mamans.",
    ctaButton: "S'inscrire maintenant",
    ctaLogin: "J'ai déjà un compte",
    
    // Footer
    footerNavigation: "Navigation",
    footerInformation: "Information",
    footerMedicalDisclaimer: "Tout le contenu médical est à titre informatif uniquement.",
    footerMedicalAdvice: "Pour un avis médical, contactez directement un professionnel de santé.",
    footerMadeWith: "Fait avec ❤️ pour les mères haïtiennes du monde entier",
    
    // Feed page
    feedTitle: "Fil de la communauté",
    feedDescription: "Partagez, posez des questions et obtenez le soutien des autres mamans.",
    trendingTopics: "Sujets tendances",
    
    // Feed interactions
    searchPlaceholder: "Rechercher une question, un groupe ou un mot-clé...",
    allCities: "Toutes les villes",
    loadingPosts: "Chargement desposts...",
    noPosts: "Aucun post pour le moment. Commencez à partager !",
    city: "Ville",
    
    // Post form
    publishPost: "Publier un post",
    publishPostDesc: "Partagez votre question ou expérience avec la communauté.",
    questionTitle: "Titre de la question ou du sujet",
    category: "Catégorie",
    anonymous: "Anonyme",
    writePost: "Écrire le post...",
    publish: "Publier",
    
    // Post tags
    tagSleep: "Sommeil bébé",
    tagFeeding: "Alimentation",
    tagPostpartum: "Post-partum",
    tagCreole: "Mères dans la diaspora",
    tagWorkKids: "Travail et enfants",
    tagHealth: "Santé",
    tagEducation: "Éducation",
    tagCommunity: "Communauté",
    
    // Auth messages
    connectToPost: "Connectez-vous pour publier un post.",
    
    // Feed sidebar
    dailyQuestion: "Question du jour",
    dailyQuestionDesc: "Une question pour animer la communauté chaque jour.",
    activeGroups: "Groupes actifs",
    
    // Doctor page
    doctorTitle: "Espace Pédiatre",
    doctorDesc: "Contenu validé, questions générales, et informations médicales sérieuses pour les mamans.",
    pediatricAdvice: "Conseils pédiatriques",
    pediatricAdviceDesc: "Contenu validé par des professionnels de santé.",
    validated: "Validé",
    importantNote: "Remarque importante",
    medicalDisclaimer: "Cette section fournit des informations générales uniquement, pas de consultation personnalisée. Pour des urgences médicales ou des questions nécessitant un diagnostic personnel, consultez un service de santé directement.",
    askPediatrician: "Question au pédiatre",
    askPediatricianDesc: "Posez une question générale. Un professionnel y répondra dès que possible.",
    connectToAsk: "Connectez-vous pour poser une question.",
    questionSent: "Question envoyée ! Un professionnel répondra bientôt.",
    questionTopic: "Sujet de la question",
    writeQuestion: "Écrivez votre question générale ici...",
    sendQuestion: "Envoyer la question",
    sending: "Envoi...",
    emergencyNote: "Pour les urgences médicales ou les questions nécessitant un diagnostic personnel, consultez un service de santé directement.",
    
    // Medical tips
    tipFeverTitle: "La fièvre chez le bébé",
    tipFeverText: "Si le bébé a moins de 3 mois et de la fièvre, consultez un médecin rapidement. Pour les autres cas, observez le niveau d'énergie, l'hydratation et la respiration.",
    tipDehydrationTitle: "Signes de déshydratation",
    tipDehydrationText: "Bouche sèche, urines rares et somnolence excessive sont des signes qui nécessitent une attention.",
    tipEmergencyTitle: "Quand appeler le médecin",
    tipEmergencyText: "En cas de difficultés respiratoires, vomissements continus, convulsions ou si le bébé ne réagit pas normalement.",
    
    // Tools page
    toolsTitle: "Outils interactifs",
    toolsDesc: "Quiz, guides, petites expériences utiles qui aident les mamans à s'organiser.",
    sleepQuiz: "Quiz sommeil bébé",
    sleepQuizDesc: "Un outil simple mais très engageant pour évaluer les habitudes de sommeil.",
    seeMyResult: "Voir mon résultat",
    reset: "Réinitialiser",
    allLocations: "Toutes les lieux",
    upcomingTools: "Autres outils à venir",
    upcomingSteps: "Prochaines étapes",
    
    // Upcoming steps list
    upcomingStep1: "• Suivi alimentation et sommeil",
    upcomingStep2: "• Calendrier développement bébé",
    upcomingStep3: "• Checklist bébé interactif",
    upcomingStep4: "• Mini jeux pour enfants",
    
    // Guides page
    guidesTitle: "Guides & ressources",
    guidesDesc: "Contenu utile pour vous aider à chaque étape de la maternité. PDF, checklist, et articles pratiques.",
    download: "Télécharger",
    downloadSoon: "Bientôt disponible",
    premiumContent: "Contenu Premium à venir",
    premiumDesc: "Bientôt, nous aurons des guides avancés, checklist détaillées et ressources exclusives pour les mamans qui veulent aller plus loin. Restez connectés !",
    
    // Quiz questions
    quizQ1: "Combien de fois bébé se réveille-t-il la nuit ?",
    quizQ1Opt1: "0-1 fois",
    quizQ1Opt2: "2-3 fois", 
    quizQ1Opt3: "4 fois ou plus",
    quizQ2: "Bébé a-t-il des routines avant de dormir chaque soir ?",
    quizQ2Opt1: "Oui, presque toujours",
    quizQ2Opt2: "Parfois",
    quizQ2Opt3: "Non",
    quizQ3: "Que fait bébé avant de dormir ?",
    quizQ3Opt1: "Très calme",
    quizQ3Opt2: "Dépend",
    quizQ3Opt3: "Beaucoup d'excitation/écran/bruit",
    
    // Quiz results
    goodSleepBase: "Bonne base de sommeil",
    goodSleepText: "Semble déjà sur une bonne voie. Continuez avec des heures fixes, une lumière tamisée et une routine calme avant de dormir.",
    needsImprovement: "Besoin d'amélioration",
    needsImprovementText: "Quelques ajustements pourraient aider. Essayez une routine plus cohérente et moins de stimulation avant de dormir.",
    needsWork: "Beaucoup de travail à faire",
    needsWorkText: "Considérez une consultation professionnelle. Une routine stricte et un environnement de sommeil optimal sont importants.",
    
    // Tool ideas
    checklistBaby: "Checklist bébé",
    interactiveGuideNewMoms: "Guide interactif pour nouvelles mamans",
    feedingSleepTracking: "Suivi alimentation/sommeil",
    babyDevelopmentCalendar: "Calendrier développement bébé",
    checklistBabyHT: "Checklist sak tibebe",
    interactiveGuideNewMomsHT: "Gid entèraktif pou nouvo manman",
    feedingSleepTrackingHT: "Suivi tétée / dòmi",
    babyDevelopmentCalendarHT: "Kalendriye devlopman tibebe",
    
    // Upcoming features
    feedingSleepTrackingDesc: "Suivi alimentation et sommeil",
    babyDevelopmentCalendarDesc: "Calendrier développement bébé",
    interactiveChecklistBabyDesc: "Checklist bébé interactive",
    miniGamesKidsDesc: "Mini jeux pour enfants",
    
    // Upcoming features - Creole
    feedingSleepTrackingDescHT: "Suivi tétée ak dòmi",
    babyDevelopmentCalendarDescHT: "Kalendri devlopman tibebe",
    interactiveChecklistBabyDescHT: "Checklist sak tibebe entèraktif",
    miniGamesKidsDescHT: "Ti jwèt pou timoun",
    downloadSoon: "Bientôt disponible",
    premiumContent: "Contenu Premium à venir",
    premiumDesc: "Bientôt, nous aurons des guides avancés, checklist détaillées et ressources exclusives pour les mamans qui veulent aller plus loin. Restez connectés !",
    
    // Guide categories
    newMom: "Nouvelle maman",
    practical: "Pratique",
    sleep: "Sommeil",
    feeding: "Alimentation",
    health: "Santé",
    
    // Guide titles
    guideNewMomTitle: "Guide pour nouvelle maman",
    guideNewMomDesc: "Pour vous préparer pour les premiers 3 mois. Un guide complet pour vous aider dans les premiers jours et avec bébé.",
    guideChecklistBabyTitle: "Checklist bébé",
    guideChecklistBabyDesc: "Liste pratique pour sortir avec bébé sans oublier rien. Tout ce dont vous avez besoin dans le sac.",
    guideSleepRoutineTitle: "Routine sommeil bébé",
    guideSleepRoutineDesc: "Un modèle simple pour aider à créer des habitudes de sommeil. Étape par étape pour une nuit plus calme.",
    guideFeedingTitle: "Alimentation bébé 0-12 mois",
    guideFeedingDesc: "Que donner à bébé selon son âge. Allaitement, formule, et premier repas solide.",
    guideBathSafetyTitle: "Swen kòdonbilik",
    guideBathSafetyDesc: "Kijan pou pran swen kòdonbilik tibebe a jiskaske li tonbe. Konsèy ijyèn ak sekirite.",
    
    // Boutique page
    boutiqueTitle: "Boutique",
    boutiqueDesc: "Articles d'occasion pour bébé et maman. Vendez, achetez, ou échangez au sein de la communauté.",
    newest: "Plus récent",
    localOnly: "Uniquement local",
    marketplace: "Place du marché",
    myFavorites: "Mes favoris",
    addToFavorites: "Ajouter aux favoris",
    removeFromFavorites: "Retirer des favoris",
    postFirstItem: "Soyez la première à publier un article !",
    clearAll: "Effacer tout",
    applyFilters: "Appliquer les filtres",
    reset: "Réinitialiser",
    allLocations: "Toutes les lieux",
    noItems: "Aucun article pour le moment",
    loadingItems: "Chargement des articles...",
    startSellingFirstItem: "Vous pouvez commencer à vendre votre premier article !",
    connectToSellOrSeeMore: "Connectez-vous pour vendre des articles ou voir plus.",
    
    // Categories
    vetements: "Vêtements",
    jouets: "Jouets",
    mobilier: "Mobilier",
    livres: "Livres",
    poussettes: "Poussettes & Siège",
    transport: "Transport",
    autres: "Autres",
    
    // Boutique - Quality and Condition
    quality: "Qualité",
    condition: "État",
    new: "Neuf",
    likeNew: "Comme neuf", 
    good: "Bon état",
    used: "Usé",
    
    // Boutique - Actions
    add: "Ajouter",
    sell: "Vendre",
    buy: "Acheter",
    exchange: "Échanger",
    cancel: "Annuler",
    publish: "Publier",
    
    // Form labels
    itemName: "Nom de l'article",
    itemDescription: "Description",
    price: "Prix",
    location: "Lieu",
    contactInfo: "Contact (téléphone ou WhatsApp)",
    images: "Images (optionnel)",
    contactToSeller: "Contacter le vendeur",
    conversationError: "Erreur lors de la création de la conversation. Veuillez réessayer.",
    messageUser: "Message",
    viewProfile: "Voir le profil",
    contactMember: "Contacter le membre",
    sendMessage: "Envoyer un message",
    userProfile: "Profil de l'utilisateur",
    memberSince: "Membre depuis",
    noBio: "Aucune biographie",
    contact: "Contacter",
    activeMembers: "Membres actifs",
    viewAllMembers: "Voir tous les membres",
    buyNow: "Acheter maintenant",
    securePayment: "Paiement sécurisé",
    paymentProcessing: "Traitement du paiement",
    paymentInfo: "Les informations de paiement sont cryptées et sécurisées",
    confirmPayment: "Confirmer le paiement",
    paymentSuccessful: "Paiement réussi",
    thankYouForPurchase: "Merci pour votre achat !",
    processingPayment: "Traitement en cours...",
    payNow: "Payer maintenant",
    item: "Article",
    boutiqueItem: "Article de la boutique",
    
    // Form placeholders
    itemExample: "Ex: Poussette bébé, Vêtements 6 mois...",
    priceExample: "Ex: 500",
    descriptionExample: "Décrivez l'article — taille, couleur, état, etc...",
    locationExample: "Ex: Port-au-Prince, Delmas...",
    contactExample: "Ex: +509 3456 7890",
    
    // Image upload
    maxImagesAlert: "Vous pouvez ajouter un maximum de {{maxImages}} images.",
    imageTypeAlert: "Seules les images sont acceptées (JPG, PNG, WEBP).",
    imageSizeAlert: "L'image est trop volumineuse (maximum 5MB).",
    uploadError: "Erreur lors du téléchargement de l'image.",
    uploadingImages: "Téléchargement des images...",
    dragDropImages: "Glissez les images ici ou",
    chooseFiles: "Choisir les fichiers",
    imageFormats: "JPG, PNG, WEBP • Maximum 5MB • Maximum {{maxImages}} images",
    addAnotherImage: "Ajouter une autre image",
    
    // Messages page
    loginToSeeMessages: "Connectez-vous pour voir vos messages",
    loginToSeeMessagesDesc: "Inscrivez-vous ou connectez-vous pour accéder à vos messages.",
    loadingConversations: "Chargement des conversations...",
    today: "Aujourd'hui",
    yesterday: "Hier",
    noMessages: "Aucun message",
    user: "Utilisateur",
    conversation: "conversation",
    noMessagesInChat: "Aucun message dans cette conversation",
    sendFirstMessage: "Envoyez le premier message !",
    selectConversation: "Sélectionnez une conversation",
    selectConversationDesc: "Sélectionnez une conversation dans la liste à gauche pour commencer à discuter.",
    
    // Admin page
    loadingAdminPanel: "Chargement du panel admin...",
    adminPanel: "Panel Admin",
    adminPanelDesc: "Gérer le contenu, modérer les posts, et surveiller la communauté.",
    reportedPosts: "Posts signalés",
    openReports: "Rapports ouverts",
    users: "Utilisateurs",
    totalPosts: "Total des posts",
    reports: "Rapports",
    allPosts: "Tous les posts",
    noReportedPosts: "Aucun post signalé pour le moment.",
    anonymous: "Anonyme",
    reported: "Signalé",
    
    // Notifications page
    loginToSeeNotifications: "Connectez-vous pour voir vos notifications",
    loginToSeeNotificationsDesc: "Inscrivez-vous ou connectez-vous pour accéder à vos notifications.",
    notifications: "Notifications",
    unread: "non lu",
    markAllAsRead: "Marquer tout comme lu",
    clearAll: "Tout effacer",
    noNotifications: "Aucune notification",
    noNotificationsDesc: "Vous recevrez des notifications lorsque d'autres utilisateurs vous enverront des messages ou aimeront vos articles.",
    justNow: "À l'instant",
    minutesAgo: "minutes",
    hoursAgo: "heures",
    daysAgo: "jours",
    view: "Voir",
    
    // Favorites page
    loginToSeeFavorites: "Connectez-vous pour voir vos favoris",
    loginToSeeFavoritesDesc: "Inscrivez-vous ou connectez-vous pour accéder à vos articles favoris.",
    myFavorites: "Mes Favoris",
    returnToShop: "Retourner à la boutique",
    noFavorites: "Vous n'avez aucun favori",
    noFavoritesDesc: "Ajoutez des articles à vos favoris pour les retrouver rapidement ici.",
    discoverShop: "Découvrir la boutique",
    item: "article",
    liked: "aimé",
    viewDetails: "Voir les détails",
    
    // Profile page
    loadingProfile: "Chargement du profil...",
    myProfile: "Mon Profil",
    profileDesc: "Gérez les informations de votre profil.",
    uploadingPhoto: "Téléchargement de la photo...",
    newMom: "Nouvelle maman",
    editProfile: "Modifier le profil",
    editProfileDesc: "Modifiez vos informations pour que la communauté puisse vous voir.",
    profileUpdated: "Profil mis à jour !",
    nameOrPseudo: "Nom ou pseudo",
    city: "Ville",
    country: "Pays",
    childrenAges: "Âges des enfants",
    childrenAgesExample: "Ex: 6 mois, 3 ans",
    bio: "Bio",
    bioPlaceholder: "Racontez un peu sur vous-même...",
    save: "Enregistrer",
    saving: "Enregistrement",
    
    // Registration and Login pages
    password: "Mot de passe",
    createAccount: "Créer votre compte",
    joinCommunity: "Rejoignez la communauté Lakou Manman",
    passwordsNotMatch: "Les mots de passe ne correspondent pas.",
    passwordMinLength: "Le mot de passe doit contenir au moins 6 caractères.",
    emailAlreadyInUse: "Cet email est déjà utilisé.",
    passwordTooWeak: "Le mot de passe est trop faible.",
    genericError: "Une erreur s'est produite. Essayez à nouveau.",
    nameExample: "Ex: Michaëlle",
    emailExample: "manman@example.com",
    passwordPlaceholder: "Au moins 6 caractères",
    confirmPassword: "Confirmer le mot de passe",
    confirmPasswordPlaceholder: "Le même mot de passe",
    cityExample: "Ex: Montréal",
    countryExample: "Ex: Canada",
    creatingAccount: "Création du compte",
    createMyAccount: "Créer mon compte",
    alreadyHaveAccount: "Vous avez déjà un compte ?",
    welcomeBack: "Bon retour",
    loginToAccount: "Connectez-vous à votre compte Lakou Manman",
    forgotPassword: "Mot de passe oublié ?",
    loggingIn: "Connexion",
    noAccount: "Vous n'avez pas de compte ?",
    
    // Theme page
    changeTheme: "Changer la couleur de fond",
    chooseTheme: "Choisir la couleur de fond",
    rosePale: "Rose pâle",
    grenadinFonce: "Grenadin foncé",
    peche: "Pêche",
    bleFonce: "Ble foncé",
    cielBleu: "Ciel bleu",
    orange: "Orange",
    soleil: "Soleil",
    
    // Groups page
    groupsTitle: "Groupes de mamans",
    groupsDescription: "Petites communautés thématiques pour créer plus de liens et discussions approfondies.",
    joiningGroup: "Rejoindre...",
    joinGroup: "Rejoindre le groupe",
    alreadyMember: "Déjà membre",
    members: "membres",
    posts: "posts",
    seePosts: "Voir les posts",
    
    // Group names
    groupNewborn: "Nouveau-né",
    groupNewbornDesc: "Espace pour questions et expériences sur les premiers mois de bébé.",
    groupPostpartum: "Post-partum", 
    groupPostpartumDesc: "Soutien pour les mamans après l'accouchement : corps, émotions, adaptation.",
    groupDiaspora: "Diaspora",
    groupDiasporaDesc: "Connectez-vous avec les mamans haïtiennes du monde entier.",
    groupFeeding: "Alimentation",
    groupFeedingDesc: "Conseils sur l'alimentation du bébé, allaitement, et nutrition.",
    groupWorkFamily: "Travail & famille",
    groupWorkFamilyDesc: "Équilibre travail et responsabilités de maman.",
    groupGriefLoss: "Deuil et perte",
    groupGriefLossDesc: "Un espace de soutien pour les mamans qui ont perdu leur bébé ou leur enfant. Partagez, trouvez du réconfort et guérissez ensemble.",
    groupDefaultDescription: "Espace pour questions, expériences et soutien entre mamans.",
    loadingGroup: "Chargement du groupe",
    noPostsInGroup: "Aucun post dans ce groupe pour le moment. Commencez à partager !",
    groupInformation: "Informations du groupe",
    mothers: "mères",
    discussions: "discussions",
  },
  ht: {
    // Navigation
    home: "Akèy",
    feed: "Kominote",
    groups: "Gwoup",
    doctor: "Pedyat",
    tools: "Zouti",
    guides: "Gid",
    boutique: "Boutik",
    messages: "Mesaj",
    favorites: "Favori",
    notifications: "Notifikasyon",
    profile: "Pwofil",
    login: "Konekte",
    register: "Enskri",
    logout: "Dekonekte",
    
    // Site texts
    title: "Lakou Manman — Kominote manman ayisyèn",
    description: "Yon platfòm entèraktif pou manman ayisyèn jwenn konsèy, sipò, epi pataje eksperyans yo.",
    welcomeBanner: "Byenvi nan Lakou Manman — Kominote manman ayisyèn toupatou nan mond lan",
    aboutTitle: "Apwou de Lakou Manman",
    mission: "Kominote manman ayisyèn toupatou nan mond lan pou pataje, aprann, epi sipòte youn lòt.",
    siteDescription: "Yon platfòm entèraktif pou manman ayisyèn jwenn konsèy, sipò, epi pataje eksperyans yo — ak kominote, resous pratik, kontni validé, ak yon vizyon pou tounen yon vrè rezo sosyal pou manman.",
    
    // Home page features
    communityTitle: "Kominote aktif",
    communityDesc: "Poze kestyon, pataje eksperyans ou, epi jwenn sipò nan men lòt manman ayisyèn.",
    supportGroupsTitle: "Gwoup sipò",
    supportGroupsDesc: "Rejwenn gwoup tematik pou diskite sou defi espesifik ak jwenn konsey ekspe.",
    pediatricAdviceTitle: "Konsèy pedyat",
    pediatricAdviceDesc: "Jwenn rekomandasyon pou medeyen ak klinik pou byenfè timal bebe ou.",
    educationalResourcesTitle: "Resous edikatif",
    educationalResourcesDesc: "Jwenn aksè ak liv, gid ak atik sou lasante manman ak ti bebe.",
    practicalToolsTitle: "Zouti pratik",
    practicalToolsDesc: "Kalkilatris dat akouchman manman, suivi manje, ak lòt zouti itil.",
    localResourcesTitle: "Resous lokal",
    localResourcesDesc: "Jwenn enfòmasyon sou sèvis manman ak ti bebe tou prèw.",
    
    // Boutique
    boutiqueTitle: "Boutik",
    boutiqueDesc: "Atik d'okazyon pou bebe ak manman. Vann, achte, oswa echanje nan kominote a.",
    sellItem: "Vann yon atik",
    searchPlaceholder: "Chèche yon atik...",
    filters: "Filtre",
    allCategories: "Toutes kategori yo",
    allConditions: "Toutes kondisyon yo",
    price: "Pri",
    location: "Lokasyon",
    condition: "Kondisyon",
    new: "Nèf",
    likeNew: "Tankou nèf",
    good: "Bon eta",
    used: "Itilize",
    contact: "Kontakte",
    contactToSeller: "Kontakte vannè",
    conversationError: "Erè pandan kreyasyon konvèsasyon an. Reesaye.",
    messageUser: "Mesaje",
    viewProfile: "Gade pwofil la",
    contactMember: "Kontakte manm lan",
    sendMessage: "Voye mesaj",
    userProfile: "Pwofil itilizatè a",
    memberSince: "Manm depi",
    noBio: "Pa gen biyografi",
    contact: "Kontakte",
    activeMembers: "Manm aktif",
    viewAllMembers: "Gade tout manm yo",
    buyNow: "Achte kounye a",
    securePayment: "Payman sekirize",
    paymentProcessing: "Trajman payman an",
    paymentInfo: "Enfòmasyon payman yo kripte ak sekirize",
    confirmPayment: "Konfime payman an",
    paymentSuccessful: "Payman reyisi",
    thankYouForPurchase: "Mèsi pou acha ou !",
    processingPayment: "Ap trajte...",
    payNow: "Peye kounye a",
    item: "Atik",
    boutiqueItem: "Atik boutik la",
    addToFavorites: "Ajoute nan favori",
    removeFromFavorites: "Retire nan favori",
    noItems: "Pa gen atik pou kounye a",
    loadingItems: "Ap chaje atik yo...",
    startSellingFirstItem: "Ou ka kòmanse vann premye atik ou a!",
    connectToSellOrSeeMore: "Konekte pou vann atik oswa wè plis.",
    postFirstItem: "Dwe premye moun ki pibliye yon atik !",
    clearAll: "efase tout",
    applyFilters: "Applike filtre yo",
    reset: "Reyinisye",
    allLocations: "Tout lye yo",
    
    // Categories
    vetements: "Rad",
    jouets: "Jwèt",
    mobilier: "Mèb",
    livres: "Liv",
    poussettes: "Pousèt & chèz tibebe",
    transport: "Transpò",
    autres: "Lòt",
    
    // Boutique - Quality and Condition
    quality: "Kalite",
    condition: "Eta",
    new: "Nèf",
    likeNew: "Tankou nèf",
    good: "Bon eta",
    used: "Itilize",
    
    // Boutique - Actions
    sell: "Vann",
    buy: "Achte",
    exchange: "Echanje",
    
    // Form labels
    itemName: "Non atik la",
    itemDescription: "Deskripsyon",
    price: "Pri",
    location: "Lye",
    contactInfo: "Kontak (telefòn oswa WhatsApp)",
    images: "Imaj (opsyonèl)",
    
    // Form placeholders
    itemExample: "Ex: Pousèt tibebe, Rad 6 mwa...",
    priceExample: "Ex: 500",
    descriptionExample: "Dekri atik la — tay, koulè, eta, elatriye...",
    locationExample: "Ex: Pòtoprens, Delma...",
    contactExample: "Ex: +509 3456 7890",
    
    // Image upload
    maxImagesAlert: "Ou ka ajoute maksimòm {{maxImages}} imaj.",
    imageTypeAlert: "Seules les images sont acceptées (JPG, PNG, WEBP).",
    imageSizeAlert: "Imaj la twò gran (maksimòm 5MB).",
    uploadError: "Erè pandan upload imaj la.",
    uploadingImages: "Ap chaje imaj yo...",
    dragDropImages: "Glisye imaj yo isit la oswa",
    chooseFiles: "Chwazi fichye yo",
    imageFormats: "JPG, PNG, WEBP • Maksimòm 5MB • Maksimòm {{maxImages}} imaj",
    addAnotherImage: "Ajoute yon lòt imaj",
    
    // Messages page
    loginToSeeMessages: "Konekte ou pou wè mesaj yo",
    loginToSeeMessagesDesc: "Enskri oswa konekte pou aksede nan mesaj ou yo.",
    loadingConversations: "Ap chaje konvèsasyon yo...",
    today: "Jodi a",
    yesterday: "Yè",
    noMessages: "Pa gen mesaj",
    user: "Itilizatè",
    conversation: "konvèsasyon",
    noMessagesInChat: "Pa gen mesaj nan konvèsasyon sa",
    sendFirstMessage: "Voye premye mesaj ou !",
    selectConversation: "Chwazi yon konvèsasyon",
    selectConversationDesc: "Chwazi yon konvèsasyon nan lis la a goch pou kòmanse mesaje.",
    
    // Admin page
    loadingAdminPanel: "Ap chaje panel admin...",
    adminPanel: "Panel Admin",
    adminPanelDesc: "Jere kontni, modere pòs, ak sivèye kominote a.",
    reportedPosts: "Pòs rapòte",
    openReports: "Rapò ouvè",
    users: "Itilizatè",
    totalPosts: "Total pòs",
    reports: "Rapò",
    allPosts: "Tout pòs",
    noReportedPosts: "Pa gen pòs rapòte pou kounye a.",
    anonymous: "Anonim",
    reported: "Rapòte",
    
    // Notifications page
    loginToSeeNotifications: "Konekte ou pou wè notifikasyon ou yo",
    loginToSeeNotificationsDesc: "Enskri oswa konekte pou aksede nan notifikasyon ou yo.",
    notifications: "Notifikasyon",
    unread: "pa li",
    markAllAsRead: "Make tout kòm li",
    clearAll: "Efase tout",
    noNotifications: "Pa gen notifikasyon",
    noNotificationsDesc: "Ou pral resevwa notifikasyon lè lòt itilizate voye mesaj pou ou oswa renmen atik ou yo.",
    justNow: "Lontan",
    minutesAgo: "min",
    hoursAgo: "h",
    daysAgo: "j",
    view: "Wè",
    
    // Favorites page
    loginToSeeFavorites: "Konekte ou pou wè favori ou yo",
    loginToSeeFavoritesDesc: "Enskri oswa konekte pou aksede nan atik ou yo amelye.",
    myFavorites: "Favori Mwen",
    returnToShop: "Retounen boutik la",
    noFavorites: "Ou pa gen favori ankò",
    noFavoritesDesc: "Ajoute atik nan favori ou yo pou jwenn yo rapidman isit la.",
    discoverShop: "Dekouvri boutik la",
    item: "atik",
    liked: "amye",
    viewDetails: "Wè detay",
    
    // Profile page
    loadingProfile: "Ap chaje pwofil...",
    myProfile: "Pwofil Mwen",
    profileDesc: "Jere enfòmasyon pwofil ou.",
    uploadingPhoto: "Ap telechaje foto...",
    newMom: "Nouvo manman",
    editProfile: "Edite pwofil",
    editProfileDesc: "Modifye enfòmasyon ou pou kominote a wè.",
    profileUpdated: "Pwofil ou anrejistre !",
    nameOrPseudo: "Non oswa pseudo",
    city: "Vil",
    country: "Peyi",
    childrenAges: "Laj pitit yo",
    childrenAgesExample: "Ex: 6 mwa, 3 an",
    bio: "Ti prezantasyon",
    bioPlaceholder: "Rakonte ti kras sou tèt ou...",
    save: "Anrejistre",
    saving: "Ap anrejistre",
    
    // Registration and Login pages
    password: "Modpas",
    createAccount: "Kreye kont ou",
    joinCommunity: "Rejwenn kominote Lakou Manman an",
    passwordsNotMatch: "Modpas yo pa menm.",
    passwordMinLength: "Modpas la dwe gen omwen 6 karaktè.",
    emailAlreadyInUse: "Imèl sa a deja itilize.",
    passwordTooWeak: "Modpas la twò fèb.",
    genericError: "Yon erè rive. Eseye ankò.",
    nameExample: "Ex: Michaëlle",
    emailExample: "manman@example.com",
    passwordPlaceholder: "Omwen 6 karaktè",
    confirmPassword: "Konfime modpas",
    confirmPasswordPlaceholder: "Menm modpas la",
    cityExample: "Ex: Monreyal",
    countryExample: "Ex: Kanada",
    creatingAccount: "Ap kreye kont",
    createMyAccount: "Kreye kont mwen",
    alreadyHaveAccount: "Ou gen yon kont deja?",
    welcomeBack: "Byenvini anko",
    loginToAccount: "Konekte nan kont Lakou Manman ou",
    forgotPassword: "Bliye modpas?",
    loggingIn: "Ap konekte",
    noAccount: "Ou pa gen kont?",
    invalidCredentials: "Imèl oswa modpas pa kòrèk.",
    
    // Theme page
    changeTheme: "Chanje koulè fon",
    chooseTheme: "Chwazi koulè fon ou",
    rosePale: "Roz pal",
    grenadinFonce: "Grenadin fonse",
    peche: "Pèch",
    bleFonce: "Ble fonse",
    cielBleu: "Syèl ble",
    orange: "Oranj",
    soleil: "Solèy",
    
    // Messages
    conversations: "Konvèsasyon",
    sendMessage: "Voye mesaj",
    typeMessage: "Tape mesaj ou...",
    noMessages: "Pa gen mesaj",
    startConversation: "Kòmanse yon konvèsasyon",
    
    // Reviews
    reviews: "Evalyasyon",
    rating: "Nòt",
    writeReview: "Ekri yon evalyasyon",
    yourReview: "Evalyasyon ou",
    noReviews: "Pa gen evalyasyon pou kounye a",
    beFirstToReview: "Dwe premye moun ki bay evalyasyon ou !",
    
    // Notifications
    markAllAsRead: "Make tout yo li",
    noNotifications: "Pa gen notifikasyon",
    
    // Admin
    adminPanel: "Panno Admin",
    managePosts: "Jere piblikasyon yo",
    manageUsers: "Jere itilizatè yo",
    statistics: "Statistik",
    
    // Common
    loading: "Ap chaje...",
    save: "Anrejistre",
    cancel: "Anile",
    delete: "Siprime",
    edit: "Modifye",
    confirm: "Konfime",
    back: "Retounen",
    next: "Pwochen",
    submit: "Valide",
    required: "Obligatwa",
    optional: "Opsyonèl",
    
    // Home page buttons
    createAccount: "Kreye kont mwen",
    seeCommunity: "Wè kominote a",
    
    // Stats
    statMothers: "manman nan kominote a",
    statSupport: "espas kestyon & sipò",
    statCities: "vil diaspora aktif",
    statGroups: "gwoup kominotè",
    
    // Section titles
    featuresTitle: "Sa Lakou Manman ofri ou",
    featuresSubtitle: "Tout sa yon manman bezwen, nan yon sèl kote.",
    testimonialsTitle: "Sa manman nan yo di",
    testimonialsSubtitle: "Dekouvri eksperyans kominote a",
    
    // CTA Section
    ctaTitle: "Rejwenn kominote a jodi a",
    ctaDescription: "Anrejistre gratis, kreye pwofil ou, epi kòmanse pataje ak lòt manman yo.",
    ctaButton: "Enskri kounye a",
    ctaLogin: "Mwen gen yon kont deja",
    
    // Footer
    footerNavigation: "Navigasyon",
    footerInformation: "Enfòmasyon",
    footerMedicalDisclaimer: "Tout kontni medikal yo bay la se sèlman pou enfòmasyon.",
    footerMedicalAdvice: "Pou ijans medikal, kontakte yon pwofesyonèl lasante dirèkteman.",
    footerMadeWith: "Fèt ak ❤️ pou manman ayisyèn toupatou nan mond lan",
    
    // Feed page
    feedTitle: "Fil kominote a",
    feedDescription: "Pataje, poze kestyon, epi jwenn sipò nan men lòt manman yo.",
    trendingTopics: "Sijè tandans",
    
    // Feed interactions
    searchPlaceholder: "Chèche kestyon, gwoup oswa mo kle...",
    allCities: "Tout kote",
    loadingPosts: "Ap chaje pòs yo...",
    noPosts: "Pa gen pòs pou kounye a. Kòmanse pataje!",
    city: "Ville",
    
    // Post form
    publishPost: "Pibliye yon pòs",
    publishPostDesc: "Pataje kestyon ou oswa eksperyans ou ak kominote a.",
    questionTitle: "Tit kestyon oswa sijè a",
    category: "Kategori",
    anonymous: "Anonim",
    writePost: "Ekri pòs la...",
    publish: "Pibliye",
    
    // Post tags
    tagSleep: "Sommeil tibebe",
    tagFeeding: "Alimantasyon",
    tagPostpartum: "Post-partum",
    tagCreole: "Manman nan diaspora",
    tagWorkKids: "Travay ak timoun",
    tagHealth: "Lasante",
    tagEducation: "Edikasyon",
    tagCommunity: "Kominote",
    
    // Auth messages
    connectToPost: "Konekte pou pibliye yon pòs.",
    
    // Feed sidebar
    dailyQuestion: "Kesyon jounen an",
    dailyQuestionDesc: "Yon kestyon pou fè kominote a vivan chak jou.",
    activeGroups: "Gwoup aktif",
    
    // Doctor page
    doctorTitle: "Mande Pediat la",
    doctorDesc: "Kontni validé, kestyon jeneral, ak enfòmasyon serye pou manman yo.",
    pediatricAdvice: "Konsèy pediat la",
    pediatricAdviceDesc: "Kontni validé pa pwofesyonèl lasante.",
    validated: "Validé",
    importantNote: "Remak enpòtan",
    medicalDisclaimer: "Remak enpòtan: Seksyon sa a bay enfòmasyon jeneral sèlman, pa konsiltasyon pèsonalize. Pou ijans medikal oswa kestyon ki mande dyagnostik pèsonèl, ale nan yon sèvis lasante dirèkteman.",
    askPediatrician: "Kesyon pou pediat la",
    askPediatricianDesc: "Poze yon kestyon jeneral. Yon pwofesyonèl ap reponn lè li disponib.",
    connectToAsk: "Konekte pou poze yon kestyon.",
    questionSent: "Kestyon ou voye! Yon pwofesyonèl ap reponn byento.",
    questionTopic: "Tèm kestyon an",
    writeQuestion: "Ekri kestyon jeneral ou isit la...",
    sendQuestion: "Voye kestyon an",
    sending: "Ap voye...",
    emergencyNote: "Pou ijans medikal oswa kestyon ki mande dyagnostik pèsonèl, ale nan yon sèvis lasante dirèkteman.",
    
    // Medical tips
    tipFeverTitle: "Lafyèv lakay tibebe",
    tipFeverText: "Si tibebe a gen mwens pase 3 mwa ak lafyèv, chèche swen medikal vit. Pou rès ka yo, obsève nivo enèji, bweson, ak respire.",
    tipDehydrationTitle: "Siy dezidratasyon",
    tipDehydrationText: "Bouch sèk, pipi ki ra, ak somnolans twòp se siy ki mande atansyon.",
    tipEmergencyTitle: "Kilè pou rele doktè",
    tipEmergencyText: "Lè gen difikilte pou respire, vomisan san kanpe, kriz, oswa tibebe a pa reponn nòmalman.",
    
    // Tools page
    toolsTitle: "Zouti entèraktif",
    toolsDesc: "Quiz, guides, ti ekspéryans itil ki fè manman yo retounen.",
    sleepQuiz: "Quiz dòmi tibebe",
    sleepQuizDesc: "Yon zouti senp men trè angažan pou evalye woutin dòmi.",
    seeMyResult: "Wè rezilta mwen",
    reset: "Rekòmanse",
    upcomingTools: "Lòt zouti k ap vini",
    upcomingSteps: "Pwochen etap",
    
    // Upcoming steps list
    upcomingStep1: "• Suivi tétée ak dòmi",
    upcomingStep2: "• Kalendriye devlopman tibebe",
    upcomingStep3: "• Checklist sak tibebe entèraktif",
    upcomingStep4: "• Ti jwèt pou timoun",
    
    // Guides page
    guidesTitle: "Gid & resous",
    guidesDesc: "Kontni itil pou ede ou nan chak etap kòm manman. PDF, checklist, ak atik pratik.",
    download: "Telechaje",
    downloadSoon: "Byento disponib",
    premiumContent: "Kontni Premium k ap vini",
    premiumDesc: "Byento, w ap ka jwenn guides avanse, checklist detaye, ak resous eksklizif pou manman ki vle ale pi lwen. Rete konekte !",
    
    // Quiz questions
    quizQ1: "Konbyen fwa tibebe w reveye an mwayèn lannuit?",
    quizQ1Opt1: "0-1 fwa",
    quizQ1Opt2: "2-3 fwa", 
    quizQ1Opt3: "4 fwa oswa plis",
    quizQ2: "Eske tibebe a gen manm lè dòmi chak swa?",
    quizQ2Opt1: "Wi, prèske toujou",
    quizQ2Opt2: "Pafwa",
    quizQ2Opt3: "Non",
    quizQ3: "Ki sa tibebe a fè anvan dòmi?",
    quizQ3Opt1: "Woutin kalm",
    quizQ3Opt2: "Sa depann",
    quizQ3Opt3: "Anpil eksitasyon / ekran / bri",
    
    // Quiz results
    goodSleepBase: "Bon baz dòmi",
    goodSleepText: "Woutin nan sanble deja sou bon chimen. Kontinye ak lè fiks, limyè ba, ak rityèl kalm avan dòmi.",
    needsImprovement: "Bezwen amelyore",
    needsImprovementText: "Kèk ajistman ka ede. Esaye yon ritin plis koyèran ak mwens stimilasyon avan dòmi.",
    needsWork: "Anpil travay pou fè",
    needsWorkText: "Konsidere yon konsiltasyon pwofesyonèl. Yon ritin strik ak yon anviwònman dòmi optimal enpòtan.",
    
    // Tool ideas
    checklistBaby: "Checklist sak tibebe",
    interactiveGuideNewMoms: "Gid entèraktif pou nouvo manman",
    feedingSleepTracking: "Suivi tétée / sommeil",
    babyDevelopmentCalendar: "Kalendriye devlopman tibebe",
    members: "manm",
    posts: "pòs",
    seePosts: "Gade posts",
    
    // Groups page
    groupsTitle: "Gwoup manman",
    groupsDescription: "Piti kominote tematik pou kreye plis lyen ak diskisyon pi pwofond.",
    joiningGroup: "Ap rejwenn...",
    joinGroup: "Rejwenn gwoup la",
    alreadyMember: "Deja manm",
    
    // Group names
    groupNewborn: "Nouvo ne",
    groupNewbornDesc: "Espas pou kestyon ak eksperyans sou premye mwa tibebe yo.",
    groupPostpartum: "Post-partum", 
    groupPostpartumDesc: "Sipò pou manman apre akouchman: kò, emosyon, adaptasyon.",
    groupDiaspora: "Diaspò",
    groupDiasporaDesc: "Konekte ak manman ayisyen nan mond lan.",
    groupFeeding: "Alimantasyon",
    groupFeedingDesc: "Konsèy sou alimantasyon tibebe, aletman, ak nitrisyon.",
    groupWorkFamily: "Travay ak fanmi",
    groupWorkFamilyDesc: "Ekilibre travay ak responsablite manman.",
    groupGriefLoss: "Dèy ak pèt",
    groupGriefLossDesc: "Yon espas sipò pou manman ki pèdi bebe oswa timoun yo. Pataje, jwenn konfò ak geri ansanm.",
    groupDefaultDescription: "Espas pou kestyon, eksperyans, ak sipò ant manman yo.",
    loadingGroup: "Ap chaje gwoup la",
    noPostsInGroup: "Pa gen pòs nan gwoup sa a ankò. Kòmanse pataje!",
    groupInformation: "Enfòmasyon gwoup",
    mothers: "manman",
    discussions: "diskisyon", 
  }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState("fr");

  useEffect(() => {
    // Load saved language from localStorage
    const savedLanguage = localStorage.getItem("language");
    if (savedLanguage && (savedLanguage === "fr" || savedLanguage === "ht")) {
      setLanguage(savedLanguage);
    }
  }, []);

  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
