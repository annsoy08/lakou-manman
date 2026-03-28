"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { deleteDoctorArticle, getDoctorArticles, getDoctorProfiles, getDoctorVideos, submitDoctorQuestion } from "@/lib/firestore";
import { buildSpecialtyDoctorProfiles, isSpecialtyVideo } from "@/lib/doctor-specialty-content";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ActionDialog from "@/components/ui/action-dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertTriangle, ArrowRight, Calendar, FileText, Heart, MapPin, MessageCircle, PlayCircle, Send, ShieldCheck, Sparkles, Stethoscope, Trash2, Video } from "lucide-react";

const getDefaultTips = (t) => [
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
];

const PEDIATRIC_KEYWORDS = ["pédi", "pedy", "pedi", "pediatric", "pédiatre", "pediatrician", "child", "enfant", "bébé", "bebe", "nouveau-né", "newborn", "timoun", "tibebe"];

const PEDIATRIC_BOOTSTRAP_TIMEOUT_MS = 12000;

function createPediatricTimeoutError(code = "pediatric_bootstrap_timeout") {
  const error = new Error(code);
  error.code = code;
  return error;
}

function withPediatricTimeout(promise, timeoutMs = PEDIATRIC_BOOTSTRAP_TIMEOUT_MS, timeoutCode = "pediatric_bootstrap_timeout") {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(createPediatricTimeoutError(timeoutCode));
    }, timeoutMs);

    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

function matchesPediatricContent(value = "") {
  const normalizedValue = String(value || "").trim().toLowerCase();
  return PEDIATRIC_KEYWORDS.some((keyword) => normalizedValue.includes(keyword));
}

function isPediatricProfile(profile = {}) {
  return [profile.specialty, profile.headline, profile.bio, profile.displayName].some(matchesPediatricContent);
}

function isPediatricArticle(article = {}, pediatricProfileIds = new Set()) {
  if (pediatricProfileIds.has(String(article?.authorId || "").trim())) {
    return true;
  }

  return [article.authorSpecialty, article.category, article.title, article.text, article.body, article.excerpt].some(matchesPediatricContent);
}

function getProfileLocation(profile = {}) {
  return [profile.city, profile.country].filter(Boolean).join(", ");
}

function getProfileLanguages(profile = {}) {
  if (Array.isArray(profile.languages)) {
    return profile.languages.filter(Boolean);
  }

  return String(profile.languages || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getProfileInitials(profile = {}) {
  const source = String(profile.displayName || "").trim();

  if (!source) {
    return "PED";
  }

  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((entry) => entry[0] || "")
    .join("")
    .toUpperCase();
}

function getPediatreUi(language) {
  return language === "ht"
    ? {
        heroBadge: "Pedyatri",
        heroTitle: "Espas pedyatri Lakou Manman",
        heroDescription: "Jwenn pwofil pedyat ki pibliye yo, videyo itil yo, ak konsèy ki ede w pran bon desizyon pou tibebe ak timoun yo.",
        selectedPediatrician: "Pedyat chwazi a",
        themesTitle: "Sijè ki pi souvan poze kestyon",
        firstStepsTitle: "Premye repè yo",
        topics: [
          "Lafyèv, tous, dyare ak siy dezidratasyon",
          "Alimantasyon tibebe ak kestyon sou kwasans",
          "Dòmi, devlopman ak kestyon sou konpòtman timoun yo",
          "Siy alèt ki mande yon swen rapid",
        ],
        firstSteps: [
          "Obsève sentòm yo ak depi kilè yo te kòmanse",
          "Veye sou lafyèv, respirasyon ak nivo enèji timoun nan",
          "Chèche yon konsèy pwofesyonèl si gen dout oswa siy gravite",
          "Pa ret tann si timoun nan parèt twò fèb oswa li pa bwè ditou",
        ],
        pediatriciansTitle: "Pedyat ki disponib yo",
        pediatriciansDescription: "Chwazi pwofil pedyat ou vle mete an avan sou paj la.",
        allLocations: "Tout kote yo",
        selectedCard: "Pwofil chwazi a",
        chooseCard: "Chwazi pwofil sa a",
        featuredVideosTitle: "Videyo pou gade",
        featuredVideosDescription: "Videyo prezantasyon ak sansibilizasyon pedyat yo pataje pou fanmi yo.",
        noVideos: "Pa gen videyo disponib pou kounye a.",
        resourcesTitle: "Atik ak resous pedyatrik",
        resourcesDescription: "Konsèy verifye sou kestyon ki tounen souvan lakay paran yo.",
        emptyArticles: "Atik pedyatrik yo ap disponib byento.",
        locationLabel: "Kote",
        experienceLabel: "Eksperyans",
        languagesLabel: "Lang",
        videoLabel: "Videyo",
        watchVideoLabel: "Gade videyo a",
        requestAppointment: "Mande yon randevou",
        askTeam: "Poze kestyon ou",
        quickActionsTitle: "Aksyon rapid",
        infoCardTitle: "Enfòmasyon sou pwofil la",
        infoCardDescription: "Sa itil pou konnen kijan pwofil la ka ede w pi vit.",
        publicProfile: "Pwofil piblik",
        available: "Wi",
        unavailable: "Non",
        contactTitle: "Poze yon kesyon",
        contactDescription: "Voye kestyon ou a bay ekip medikal la. Repons yo pa ranplase yon swen ijans.",
        emptyExperts: "Pwofil pedyat yo ap disponib byento.",
        openDashboard: "Louvri dashboard medsen an",
        bookLabel: "Pran randevou",
        importantTitle: "Enpòtan",
        profileFallbackTitle: "Espas pedyatri a ap pare",
        profileFallbackDescription: "Nou ap mete pwofil pedyat verifye yo disponib sou espas sa a.",
      }
    : {
        heroBadge: "Pédiatrie",
        heroTitle: "Espace pédiatrie Lakou Manman",
        heroDescription: "Retrouvez les profils de pédiatres publiés, leurs vidéos utiles, et des conseils qui aident les familles à prendre les bons repères pour les bébés et les enfants.",
        selectedPediatrician: "Pédiatre sélectionné",
        themesTitle: "Questions fréquentes en pédiatrie",
        firstStepsTitle: "Premiers repères",
        topics: [
          "Fièvre, toux, diarrhée et signes de déshydratation",
          "Alimentation du bébé et questions de croissance",
          "Sommeil, développement et comportement de l'enfant",
          "Signes d'alerte qui demandent une prise en charge rapide",
        ],
        firstSteps: [
          "Observer les symptômes et depuis quand ils ont commencé",
          "Surveiller la fièvre, la respiration et l'énergie de l'enfant",
          "Demander un avis professionnel en cas de doute ou de signe de gravité",
          "Ne pas attendre si l'enfant devient très faible ou refuse de boire",
        ],
        pediatriciansTitle: "Pédiatres disponibles",
        pediatriciansDescription: "Choisissez le profil pédiatre que vous souhaitez mettre en avant sur la page.",
        allLocations: "Tous les lieux",
        selectedCard: "Profil sélectionné",
        chooseCard: "Choisir ce profil",
        featuredVideosTitle: "Vidéos à regarder",
        featuredVideosDescription: "Vidéos de présentation et de sensibilisation partagées pour les familles.",
        noVideos: "Aucune vidéo n'est disponible pour le moment.",
        resourcesTitle: "Articles et ressources pédiatriques",
        resourcesDescription: "Des conseils validés sur les questions qui reviennent souvent chez les parents.",
        emptyArticles: "Les articles pédiatriques seront disponibles bientôt.",
        locationLabel: "Lieu",
        experienceLabel: "Expérience",
        languagesLabel: "Langues",
        videoLabel: "Vidéo",
        watchVideoLabel: "Voir la vidéo",
        requestAppointment: "Demander un rendez-vous",
        askTeam: "Poser votre question",
        quickActionsTitle: "Actions rapides",
        infoCardTitle: "Informations sur le profil",
        infoCardDescription: "L'essentiel pour savoir comment ce profil peut vous aider rapidement.",
        publicProfile: "Profil public",
        available: "Oui",
        unavailable: "Non",
        contactTitle: "Poser une question",
        contactDescription: "Envoyez votre question à l'équipe médicale. Les réponses ne remplacent pas une prise en charge d'urgence.",
        emptyExperts: "Les profils pédiatres seront disponibles bientôt.",
        openDashboard: "Ouvrir le dashboard médecin",
        bookLabel: "Prendre rendez-vous",
        importantTitle: "Important",
        profileFallbackTitle: "L'espace pédiatrie se prépare",
        profileFallbackDescription: "Nous mettons progressivement à disposition les profils pédiatres vérifiés dans cet espace.",
      };
}

export default function PediatricianPage() {
  const { user, userProfile, canManageDoctorContent, isAdmin } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const ui = getPediatreUi(language);
  const [articles, setArticles] = useState(getDefaultTips(t));
  const [videos, setVideos] = useState([]);
  const [doctorProfiles, setDoctorProfiles] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [questionTitle, setQuestionTitle] = useState("");
  const [questionBody, setQuestionBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [articleDeletingId, setArticleDeletingId] = useState("");
  const [pendingDeleteArticle, setPendingDeleteArticle] = useState(null);
  const [moderationFeedback, setModerationFeedback] = useState({ tone: "success", message: "" });
  const loadErrorLabel = language === "ht"
    ? "Nou pa t ka chaje espas pedyatri a kounye a."
    : "L'espace pédiatrie n'a pas pu être chargé pour le moment.";
  const loadTimeoutLabel = language === "ht"
    ? "Chajman espas pedyatri a pran twòp tan. Verifye koneksyon an epi eseye ankò."
    : "Le chargement de l'espace pédiatrie a dépassé le délai prévu. Vérifiez la connexion puis réessayez.";
  const deleteDialogTitle = language === "ht"
    ? "Efase atik sa a"
    : "Supprimer cet article";
  const deleteArticleConfirmLabel = language === "ht"
    ? "Èske ou vle efase atik sa a vre?"
    : "Voulez-vous vraiment supprimer cet article ?";
  const articleDeletedLabel = language === "ht"
    ? "Atik la efase."
    : "L'article a été supprimé.";
  const deleteDialogMessage = pendingDeleteArticle && pendingDeleteArticle.title
    ? `${deleteArticleConfirmLabel}\n\n${pendingDeleteArticle.title}`
    : deleteArticleConfirmLabel;

  useEffect(() => {
    setArticles(getDefaultTips(t));
  }, [t]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadError("");
      try {
        const [articleData, profileData, videoData] = await withPediatricTimeout(
          Promise.all([
            getDoctorArticles({ publishedOnly: true }),
            getDoctorProfiles({ publishedOnly: true }),
            getDoctorVideos({ publishedOnly: true }),
          ]),
          PEDIATRIC_BOOTSTRAP_TIMEOUT_MS,
          "pediatric_bootstrap_timeout"
        );

        const visibleProfiles = buildSpecialtyDoctorProfiles(profileData, "pediatre");
        const pediatricProfileIds = new Set(
          visibleProfiles.flatMap((profile) => [
            String(profile.id || "").trim(),
            String(profile.editorUserId || "").trim(),
          ]).filter(Boolean)
        );
        const pediatricArticles = articleData.filter((article) => isPediatricArticle(article, pediatricProfileIds));
        const pediatricVideos = videoData.filter((video) => isSpecialtyVideo("pediatre", video, pediatricProfileIds));

        if (cancelled) {
          return;
        }

        if (pediatricArticles.length > 0) {
          setArticles(pediatricArticles);
        }

        setVideos(pediatricVideos);
        setDoctorProfiles(visibleProfiles);
      } catch (error) {
        console.error("Error loading pediatric content:", error);
        if (cancelled) {
          return;
        }

        setArticles(getDefaultTips(t));
        setVideos([]);
        setDoctorProfiles([]);
        setLoadError(error?.code === "pediatric_bootstrap_timeout" ? loadTimeoutLabel : loadErrorLabel);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [loadErrorLabel, loadTimeoutLabel, t]);

  const locationOptions = useMemo(() => {
    const locations = doctorProfiles
      .map((profile) => getProfileLocation(profile))
      .filter(Boolean);

    return ["all", ...new Set(locations)];
  }, [doctorProfiles]);

  const filteredProfiles = useMemo(() => {
    if (selectedLocation === "all") {
      return doctorProfiles;
    }

    return doctorProfiles.filter((profile) => getProfileLocation(profile) === selectedLocation);
  }, [doctorProfiles, selectedLocation]);

  useEffect(() => {
    if (!filteredProfiles.length && doctorProfiles.length && selectedLocation !== "all") {
      setSelectedLocation("all");
      return;
    }

    const availableProfiles = filteredProfiles.length > 0 ? filteredProfiles : doctorProfiles;

    if (!availableProfiles.length) {
      setSelectedProfileId("");
      return;
    }

    if (!availableProfiles.some((profile) => profile.id === selectedProfileId)) {
      setSelectedProfileId(availableProfiles[0].id);
    }
  }, [doctorProfiles, filteredProfiles, selectedLocation, selectedProfileId]);

  const selectedProfile = useMemo(() => {
    return filteredProfiles.find((profile) => profile.id === selectedProfileId)
      || doctorProfiles.find((profile) => profile.id === selectedProfileId)
      || filteredProfiles[0]
      || doctorProfiles[0]
      || null;
  }, [doctorProfiles, filteredProfiles, selectedProfileId]);

  const visibleProfilePool = useMemo(
    () => (filteredProfiles.length > 0 ? filteredProfiles : doctorProfiles),
    [doctorProfiles, filteredProfiles]
  );

  const featuredVideos = useMemo(() => {
    const profileIdSet = new Set(
      visibleProfilePool.flatMap((profile) => [
        String(profile.id || "").trim(),
        String(profile.editorUserId || "").trim(),
      ]).filter(Boolean)
    );
    const libraryVideos = profileIdSet.size > 0
      ? videos.filter((video) => profileIdSet.has(String(video.authorId || "").trim()))
      : videos;
    const legacyVideos = visibleProfilePool
      .filter((profile) => typeof profile?.videoUrl === "string" && profile.videoUrl.trim())
      .map((profile) => ({
        id: `profile-${String(profile.id || profile.editorUserId || profile.displayName || "video")}`,
        title: profile.videoTitle || profile.displayName || "",
        url: profile.videoUrl,
        description: profile.headline || profile.specialty || "",
        category: profile.specialty || "",
        authorId: String(profile.editorUserId || profile.id || "").trim(),
        authorName: profile.displayName || "",
      }));
    const mergedVideos = [...libraryVideos];
    const seenUrls = new Set(libraryVideos.map((video) => String(video.url || "").trim()));

    legacyVideos.forEach((video) => {
      const normalizedUrl = String(video.url || "").trim();
      if (!normalizedUrl || seenUrls.has(normalizedUrl)) {
        return;
      }
      seenUrls.add(normalizedUrl);
      mergedVideos.push(video);
    });

    return mergedVideos;
  }, [videos, visibleProfilePool]);

  const selectedProfileFeaturedVideo = useMemo(() => {
    if (!selectedProfile) {
      return null;
    }

    const selectedAuthorIds = new Set([
      String(selectedProfile.id || "").trim(),
      String(selectedProfile.editorUserId || "").trim(),
    ].filter(Boolean));

    const matchingVideo = featuredVideos.find((video) => selectedAuthorIds.has(String(video.authorId || "").trim()));
    if (matchingVideo) {
      return matchingVideo;
    }

    if (typeof selectedProfile?.videoUrl === "string" && selectedProfile.videoUrl.trim()) {
      return {
        id: `selected-profile-${String(selectedProfile.id || selectedProfile.editorUserId || "video")}`,
        title: selectedProfile.videoTitle || selectedProfile.displayName || "",
        url: selectedProfile.videoUrl,
        description: selectedProfile.headline || selectedProfile.specialty || "",
        authorId: String(selectedProfile.editorUserId || selectedProfile.id || "").trim(),
        authorName: selectedProfile.displayName || "",
      };
    }

    return null;
  }, [featuredVideos, selectedProfile]);

  async function handleSubmitQuestion(event) {
    event.preventDefault();

    if (!user || !questionTitle.trim() || !questionBody.trim()) {
      return;
    }

    setSending(true);

    try {
      await submitDoctorQuestion({
        userId: user.uid,
        authorName: userProfile?.name || user.displayName || "Anonim",
        title: questionTitle.trim(),
        body: questionBody.trim(),
      });
      setQuestionTitle("");
      setQuestionBody("");
      setSent(true);
      window.setTimeout(() => setSent(false), 4000);
    } catch (error) {
      console.error("Submit pediatric question error:", error);
    } finally {
      setSending(false);
    }
  }

  function handleBookAppointment() {
    if (selectedProfile?.bookingUrl) {
      if (selectedProfile.bookingUrl.startsWith("#")) {
        document.getElementById(selectedProfile.bookingUrl.slice(1))?.scrollIntoView({ behavior: "smooth" });
        return;
      }

      window.open(selectedProfile.bookingUrl, "_blank", "noreferrer");
      return;
    }

    document.getElementById("contact-form")?.scrollIntoView({ behavior: "smooth" });
  }

  function handleOpenQuestionForm() {
    document.getElementById("contact-form")?.scrollIntoView({ behavior: "smooth" });
  }

  function requestDeletePublicArticle(article = {}) {
    const normalizedArticleId = String(article?.id || "").trim();

    if (!normalizedArticleId) {
      return;
    }

    setPendingDeleteArticle({
      id: normalizedArticleId,
      title: String(article?.title || "").trim(),
    });
  }

  async function handleDeletePublicArticle(articleId) {
    const normalizedArticleId = String(articleId || "").trim();

    if (!user?.uid || !normalizedArticleId) {
      return;
    }

    setArticleDeletingId(normalizedArticleId);
    setModerationFeedback({ tone: "success", message: "" });

    try {
      await deleteDoctorArticle(normalizedArticleId);
      setArticles((currentArticles) => currentArticles.filter((article) => String(article?.id || "").trim() !== normalizedArticleId));
      setModerationFeedback({ tone: "success", message: articleDeletedLabel });
      setPendingDeleteArticle(null);
    } catch (error) {
      console.error("Error deleting pediatric public article:", error);
      setModerationFeedback({ tone: "error", message: String(error?.message || "delete_error") });
    } finally {
      setArticleDeletingId("");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-white p-4">
      <div className="mx-auto max-w-7xl">
        {loadError ? (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {loadError}
          </div>
        ) : null}

        {moderationFeedback.message ? (
          <div className={moderationFeedback.tone === "error"
            ? "mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            : "mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"}>
            {moderationFeedback.message}
          </div>
        ) : null}

        <Card className="mb-8 health-card-strong">
          <CardContent className="p-6 sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center lg:gap-8">
              <div className="flex justify-center lg:justify-start">
                <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                  <AvatarImage src={selectedProfile?.photo || ""} />
                  <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-cyan-500 text-2xl text-white">
                    {getProfileInitials(selectedProfile || {})}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="min-w-0">
                <div className="mb-4">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700">
                    <Heart className="h-4 w-4" />
                    {ui.heroBadge}
                  </div>
                  <h1 className="mb-2 text-3xl font-bold text-slate-800">
                    {selectedProfile?.displayName || ui.heroTitle}
                  </h1>
                  <p className="mb-1 text-xl text-slate-600">
                    {selectedProfile?.specialty || ui.selectedPediatrician}
                  </p>
                  {selectedProfile?.headline ? (
                    <p className="text-slate-600">{selectedProfile.headline}</p>
                  ) : null}
                  <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
                    {selectedProfile?.bio || ui.heroDescription}
                  </p>
                </div>

                <div className="mb-4 flex flex-wrap gap-4 text-sm text-slate-600">
                  {selectedProfile?.yearsOfExperience ? (
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span>{selectedProfile.yearsOfExperience}</span>
                    </div>
                  ) : null}
                  {getProfileLocation(selectedProfile || {}) ? (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-emerald-600" />
                      <span>{getProfileLocation(selectedProfile || {})}</span>
                    </div>
                  ) : null}
                  {getProfileLanguages(selectedProfile || {}).length > 0 ? (
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-emerald-600" />
                      <span>{getProfileLanguages(selectedProfile || {}).join(" • ")}</span>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600" onClick={handleBookAppointment}>
                    <Calendar className="mr-2 h-4 w-4" />
                    {selectedProfile?.bookingUrl ? ui.requestAppointment : ui.askTeam}
                  </Button>
                  {selectedProfileFeaturedVideo?.url ? (
                    <Button variant="outline" onClick={() => window.open(selectedProfileFeaturedVideo.url, "_blank", "noreferrer")}>
                      <Video className="mr-2 h-4 w-4" />
                      {ui.watchVideoLabel}
                    </Button>
                  ) : null}
                  {canManageDoctorContent ? (
                    <Button variant="outline" onClick={() => router.push("/pediatre-dashboard")}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      {ui.openDashboard}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="health-card">
            <CardHeader>
              <CardTitle>{ui.themesTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ui.topics.map((item) => (
                <div key={item} className="health-muted-tile">
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="health-card">
            <CardHeader>
              <CardTitle>{ui.firstStepsTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ui.firstSteps.map((item) => (
                <div key={item} className="health-muted-tile">
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8 health-card">
          <CardHeader>
            <CardTitle>{ui.pediatriciansTitle}</CardTitle>
            <CardDescription>{ui.pediatriciansDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            {doctorProfiles.length === 0 ? (
              <div className="health-empty-state">
                <div className="font-medium text-slate-900">{ui.profileFallbackTitle}</div>
                <div className="mt-2">{ui.profileFallbackDescription}</div>
              </div>
            ) : (
              <>
                <div className="mb-5 flex flex-wrap gap-2">
                  {locationOptions.map((location) => (
                    <Button
                      key={location}
                      variant={selectedLocation === location ? "default" : "outline"}
                      className={selectedLocation === location ? "bg-gradient-to-r from-emerald-500 to-cyan-500" : ""}
                      onClick={() => setSelectedLocation(location)}
                    >
                      {location === "all" ? ui.allLocations : location}
                    </Button>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredProfiles.map((profile) => (
                    <div
                      key={profile.id}
                      className={profile.id === selectedProfile?.id
                        ? "rounded-xl border border-emerald-300 bg-emerald-50 p-4 shadow-sm transition-all"
                        : "rounded-xl border border-slate-200 bg-white p-4 transition-all"}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-800">{profile.displayName}</div>
                          <div className="text-sm text-slate-600">{profile.specialty || ui.selectedPediatrician}</div>
                        </div>
                        {profile.featured ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{t("validated")}</Badge>
                        ) : null}
                      </div>
                      <div className="mt-3 space-y-1 text-sm text-slate-600">
                        {profile.headline ? <div>{profile.headline}</div> : null}
                        {getProfileLocation(profile) ? <div>{getProfileLocation(profile)}</div> : null}
                        {profile.yearsOfExperience ? <div>{ui.experienceLabel}: {profile.yearsOfExperience}</div> : null}
                      </div>
                      <Button
                        className="mt-4 w-full"
                        variant={profile.id === selectedProfile?.id ? "secondary" : "outline"}
                        onClick={() => setSelectedProfileId(profile.id)}
                      >
                        {profile.id === selectedProfile?.id ? ui.selectedCard : ui.chooseCard}
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <Card className="health-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-emerald-600" />
                  {ui.featuredVideosTitle}
                </CardTitle>
                <CardDescription>{ui.featuredVideosDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                {featuredVideos.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-6 text-sm text-slate-600">
                    {ui.noVideos}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {featuredVideos.map((video) => (
                      <a key={String(video.id) + "-video"} href={video.url} target="_blank" rel="noreferrer" className="group cursor-pointer">
                        <div className="relative mb-3 overflow-hidden rounded-lg">
                          <div className="flex h-32 items-center justify-center bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 transition-transform group-hover:scale-[1.02]">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-emerald-600">
                              <PlayCircle className="h-6 w-6" />
                            </div>
                          </div>
                        </div>
                        <h3 className="mb-1 line-clamp-2 text-sm font-semibold">{video.title || video.authorName}</h3>
                        <p className="mb-2 line-clamp-2 text-xs text-slate-600">{video.description || video.category || ""}</p>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{video.authorName || video.authorSpecialty || ""}</span>
                          <span>{ui.watchVideoLabel}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="health-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-600" />
                  {ui.resourcesTitle}
                </CardTitle>
                <CardDescription>{ui.resourcesDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {articles.length === 0 ? (
                    <div className="health-empty-state">
                      {ui.emptyArticles}
                    </div>
                  ) : articles.map((article) => {
                    const canDeleteArticle = Boolean(String(article?.authorId || "").trim())
                      && (isAdmin || String(article?.authorId || "").trim() === String(user?.uid || "").trim());

                    return (
                      <div key={article.id} className="flex gap-4 rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50">
                        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-100 to-cyan-100">
                          <FileText className="h-8 w-8 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">{article.title}</h3>
                            {article.validated ? (
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                <ShieldCheck className="mr-1 h-3 w-3" />
                                {t("validated")}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mb-2 line-clamp-3 text-sm text-slate-600">{article.excerpt || article.text || article.body}</p>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                            {article.category ? (
                              <Badge variant="outline" className="text-xs">
                                {article.category}
                              </Badge>
                            ) : null}
                            {article.authorSpecialty ? <span>{article.authorSpecialty}</span> : null}
                          </div>
                          {canDeleteArticle ? (
                            <div className="mt-3">
                              <Button
                                type="button"
                                variant="outline"
                                className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                onClick={() => requestDeletePublicArticle(article)}
                                disabled={articleDeletingId === article.id}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {articleDeletingId === article.id ? t("delete") + "..." : t("delete")}
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card id="contact-form" className="health-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-emerald-600" />
                  {ui.contactTitle}
                </CardTitle>
                <CardDescription>{ui.contactDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                {!user ? (
                  <p className="text-sm text-slate-600">{t("connectToAsk")}</p>
                ) : (
                  <form onSubmit={handleSubmitQuestion} className="space-y-4">
                    {sent ? (
                      <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
                        {t("questionSent")}
                      </div>
                    ) : null}
                    <Input
                      placeholder={t("questionTopic")}
                      value={questionTitle}
                      onChange={(event) => setQuestionTitle(event.target.value)}
                    />
                    <Textarea
                      placeholder={t("writeQuestion")}
                      value={questionBody}
                      onChange={(event) => setQuestionBody(event.target.value)}
                      className="min-h-[170px]"
                    />
                    <Button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600" disabled={sending || !questionTitle.trim() || !questionBody.trim()}>
                      <Send className="mr-2 h-4 w-4" />
                      {sending ? t("sending") + "..." : t("sendQuestion")}
                    </Button>
                    <p className="text-xs leading-5 text-slate-500">{t("emergencyNote")}</p>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="health-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-600" />
                  {ui.quickActionsTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleOpenQuestionForm}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {ui.askTeam}
                </Button>
                <Button variant="outline" className="w-full" onClick={handleBookAppointment}>
                  <Calendar className="mr-2 h-4 w-4" />
                  {selectedProfile?.bookingUrl ? ui.requestAppointment : ui.contactTitle}
                </Button>
                {selectedProfileFeaturedVideo?.url ? (
                  <Button variant="outline" className="w-full" onClick={() => window.open(selectedProfileFeaturedVideo.url, "_blank", "noreferrer")}>
                    <Video className="mr-2 h-4 w-4" />
                    {ui.watchVideoLabel}
                  </Button>
                ) : null}
                {canManageDoctorContent ? (
                  <Button variant="outline" className="w-full" onClick={() => router.push("/pediatre-dashboard")}>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    {ui.openDashboard}
                  </Button>
                ) : null}
              </CardContent>
            </Card>

            <Card className="health-card">
              <CardHeader>
                <CardTitle>{ui.infoCardTitle}</CardTitle>
                <CardDescription>{ui.infoCardDescription}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
                  <span>{ui.publicProfile}</span>
                  <span className="font-medium text-emerald-700">{selectedProfile?.published === false ? ui.unavailable : ui.available}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
                  <span>{ui.videoLabel}</span>
                  <span className="font-medium text-emerald-700">{selectedProfileFeaturedVideo?.url ? ui.available : ui.unavailable}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
                  <span>{ui.bookLabel}</span>
                  <span className="font-medium text-emerald-700">{selectedProfile?.bookingUrl ? ui.available : ui.unavailable}</span>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  <div className="font-medium text-slate-900">{ui.languagesLabel}</div>
                  <div className="mt-1">{getProfileLanguages(selectedProfile || {}).length > 0 ? getProfileLanguages(selectedProfile || {}).join(" • ") : "-"}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-amber-200 bg-amber-50 shadow-sm">
              <CardContent className="flex gap-3 p-5 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <div className="font-semibold">{ui.importantTitle}</div>
                  <div className="mt-1 leading-6">
                    {t("medicalDisclaimer")}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <ActionDialog
          open={Boolean(pendingDeleteArticle?.id)}
          tone="danger"
          title={deleteDialogTitle}
          message={deleteDialogMessage}
          confirmLabel={t("delete")}
          cancelLabel={t("cancel")}
          closeLabel={t("close")}
          loadingLabel={t("loading")}
          loading={articleDeletingId === pendingDeleteArticle?.id}
          onClose={() => {
            if (articleDeletingId) {
              return;
            }

            setPendingDeleteArticle(null);
          }}
          onConfirm={() => handleDeletePublicArticle(pendingDeleteArticle?.id)}
        />
      </div>
    </div>
  );
}
