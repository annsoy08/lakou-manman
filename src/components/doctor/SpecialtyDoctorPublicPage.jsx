"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { createDoctorAppointment, deleteDoctorArticle, getDoctorArticles, getDoctorProfiles, getDoctorVideos, getPatientAppointments, submitDoctorQuestion } from "@/lib/firestore";
import {
  buildSpecialtyDoctorProfiles,
  getProfileInitials,
  getProfileLanguages,
  getProfileLocation,
  isSpecialtyArticle,
  isSpecialtyVideo,
} from "@/lib/doctor-specialty-content";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ActionDialog from "@/components/ui/action-dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Download,
  ExternalLink,
  FileText,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  PlayCircle,
  Send,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  Video,
} from "lucide-react";

const SPECIALTY_DOCTOR_BOOTSTRAP_TIMEOUT_MS = 12000;

function createSpecialtyDoctorTimeoutError(code = "specialty_doctor_bootstrap_timeout") {
  const error = new Error(code);
  error.code = code;
  return error;
}

function withSpecialtyDoctorTimeout(
  promise,
  timeoutMs = SPECIALTY_DOCTOR_BOOTSTRAP_TIMEOUT_MS,
  timeoutCode = "specialty_doctor_bootstrap_timeout"
) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(createSpecialtyDoctorTimeoutError(timeoutCode));
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

export default function SpecialtyDoctorPublicPage({
  specialtyKey,
  dashboardPath,
  ui,
  theme,
  defaultArticles = [],
  defaultArticleIcon,
  extraQuickActions = [],
}) {
  const { user, userProfile, canManageDoctorContent, isAdmin } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [articles, setArticles] = useState(defaultArticles);
  const [videos, setVideos] = useState([]);
  const [doctorProfiles, setDoctorProfiles] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [questionTitle, setQuestionTitle] = useState("");
  const [questionBody, setQuestionBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [apptDate, setApptDate] = useState("");
  const [apptTime, setApptTime] = useState("");
  const [apptMotif, setApptMotif] = useState("");
  const [apptSending, setApptSending] = useState(false);
  const [apptSent, setApptSent] = useState(false);
  const [patientAppointments, setPatientAppointments] = useState([]);
  const [activeJitsiUrl, setActiveJitsiUrl] = useState("");
  const [loadError, setLoadError] = useState("");
  const [articleDeletingId, setArticleDeletingId] = useState("");
  const [pendingDeleteArticle, setPendingDeleteArticle] = useState(null);
  const [moderationFeedback, setModerationFeedback] = useState({ tone: "success", message: "" });
  const loadErrorLabel = language === "ht"
    ? "Nou pa t ka chaje kontni medikal sa a kounye a."
    : "Ce contenu médical n'a pas pu être chargé pour le moment.";
  const loadTimeoutLabel = language === "ht"
    ? "Chajman kontni medikal la pran twòp tan. Verifye koneksyon an epi eseye ankò."
    : "Le chargement du contenu médical a dépassé le délai prévu. Vérifiez la connexion puis réessayez.";
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
  const questionDisclaimerText = ui.questionDisclaimerText || ui.disclaimerText || "";
  const importantDisclaimerText = ui.importantDisclaimerText || ui.disclaimerText || "";

  useEffect(() => {
    setArticles(defaultArticles);
  }, [defaultArticles]);

  useEffect(() => {
    setVideos([]);
  }, [specialtyKey]);

  useEffect(() => {
    if (!user?.uid) {
      setPatientAppointments([]);
      return;
    }

    let cancelled = false;

    getPatientAppointments(user.uid).then((appts) => {
      if (!cancelled) {
        setPatientAppointments(Array.isArray(appts) ? appts : []);
      }
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadError("");
      try {
        const [articleData, profileData, videoData] = await Promise.all([
          withSpecialtyDoctorTimeout(getDoctorArticles({ publishedOnly: true })),
          withSpecialtyDoctorTimeout(getDoctorProfiles({ publishedOnly: true })),
          withSpecialtyDoctorTimeout(getDoctorVideos({ publishedOnly: true })),
        ]);

        const visibleProfiles = buildSpecialtyDoctorProfiles(profileData, specialtyKey);
        const specialtyProfileIds = new Set(
          visibleProfiles.flatMap((profile) => [
            String(profile.id || "").trim(),
            String(profile.editorUserId || "").trim(),
          ]).filter(Boolean)
        );
        const specialtyArticles = articleData.filter((article) => isSpecialtyArticle(specialtyKey, article, specialtyProfileIds));
        const specialtyVideos = videoData.filter((video) => isSpecialtyVideo(specialtyKey, video, specialtyProfileIds));

        if (cancelled) {
          return;
        }

        setDoctorProfiles(visibleProfiles);
        setVideos(specialtyVideos);
        if (specialtyArticles.length > 0) {
          setArticles(specialtyArticles);
        }
      } catch (error) {
        console.error("Error loading specialty doctor content:", error);
        if (cancelled) {
          return;
        }

        setDoctorProfiles([]);
        setArticles(defaultArticles);
        setVideos([]);
        setLoadError(error?.code === "specialty_doctor_bootstrap_timeout" ? loadTimeoutLabel : loadErrorLabel);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [defaultArticles, loadErrorLabel, loadTimeoutLabel, specialtyKey]);

  const locationOptions = useMemo(() => {
    const locations = doctorProfiles.map((profile) => getProfileLocation(profile)).filter(Boolean);
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
      console.error("Submit specialty doctor question error:", error);
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

    document.getElementById("appointment-form")?.scrollIntoView({ behavior: "smooth" });
  }

  async function handleSubmitAppointment(event) {
    event.preventDefault();

    if (!user || !apptDate.trim() || !apptMotif.trim()) {
      return;
    }

    setApptSending(true);

    try {
      await createDoctorAppointment({
        doctorProfileId: String(selectedProfile?.id || "").trim(),
        doctorId: String(selectedProfile?.editorUserId || "").trim(),
        doctorName: String(selectedProfile?.displayName || "").trim(),
        patientId: user.uid,
        patientName: userProfile?.name || user.displayName || "Anonim",
        preferredDate: apptDate.trim(),
        preferredTime: apptTime.trim(),
        motif: apptMotif.trim(),
      });
      setApptDate("");
      setApptTime("");
      setApptMotif("");
      setApptSent(true);
      window.setTimeout(() => setApptSent(false), 5000);
    } catch (error) {
      console.error("Submit doctor appointment error:", error);
    } finally {
      setApptSending(false);
    }
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
      console.error("Error deleting specialty public article:", error);
      setModerationFeedback({ tone: "error", message: String(error?.message || "delete_error") });
    } finally {
      setArticleDeletingId("");
    }
  }

  const confirmedPatientAppointments = patientAppointments.filter((a) => a.status === "confirmed" && a.meetingUrl);

  return (
    <div className={theme.pageClassName}>
      {activeJitsiUrl ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex shrink-0 items-center justify-between gap-3 bg-slate-900 px-4 py-3">
            <div className="flex items-center gap-2 text-white">
              <Video className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-medium">
                {language === "ht" ? "Konsiltasyon vityèl" : "Consultation virtuelle"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={activeJitsiUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500 bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {language === "ht" ? "Nouvo tab" : "Nouvel onglet"}
              </a>
              <button
                type="button"
                onClick={() => setActiveJitsiUrl("")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-600 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
              >
                {language === "ht" ? "Fèmen" : "Fermer"}
              </button>
            </div>
          </div>
          <iframe
            src={activeJitsiUrl}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            allowFullScreen
            className="flex-1 w-full border-0"
            title="Consultation virtuelle Jitsi"
          />
        </div>
      ) : null}
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
                  <AvatarFallback className={theme.avatarFallbackClassName}>
                    {getProfileInitials(selectedProfile || {}, ui.initialsFallback)}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="min-w-0">
                <div className="mb-4">
                  <div className={theme.heroBadgeClassName}>
                    <Heart className="h-4 w-4" />
                    {ui.heroBadge}
                  </div>
                  <h1 className="mb-2 text-3xl font-bold text-slate-800">
                    {selectedProfile?.displayName || ui.heroTitle}
                  </h1>
                  <p className="mb-1 text-xl text-slate-600">
                    {selectedProfile?.specialty || ui.selectedProfileLabel}
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
                      <ShieldCheck className={theme.metaIconClassName} />
                      <span>{selectedProfile.yearsOfExperience}</span>
                    </div>
                  ) : null}
                  {getProfileLocation(selectedProfile || {}) ? (
                    <div className="flex items-center gap-2">
                      <MapPin className={theme.metaIconClassName} />
                      <span>{getProfileLocation(selectedProfile || {})}</span>
                    </div>
                  ) : null}
                  {getProfileLanguages(selectedProfile || {}).length > 0 ? (
                    <div className="flex items-center gap-2">
                      <Stethoscope className={theme.metaIconClassName} />
                      <span>{getProfileLanguages(selectedProfile || {}).join(" • ")}</span>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button className={theme.primaryButtonClassName} onClick={handleOpenQuestionForm}>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    {ui.askTeam}
                  </Button>
                  {selectedProfileFeaturedVideo?.url ? (
                    <Button variant="outline" onClick={() => window.open(selectedProfileFeaturedVideo.url, "_blank", "noreferrer")}>
                      <Video className="mr-2 h-4 w-4" />
                      {ui.watchVideoLabel}
                    </Button>
                  ) : null}
                  {canManageDoctorContent ? (
                    <Button variant="outline" onClick={() => router.push(dashboardPath)}>
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
            <CardTitle>{ui.profileListTitle}</CardTitle>
            <CardDescription>{ui.profileListDescription}</CardDescription>
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
                      className={selectedLocation === location ? theme.primaryButtonClassName : ""}
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
                      className={profile.id === selectedProfile?.id ? theme.selectedProfileCardClassName : theme.unselectedProfileCardClassName}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-800">{profile.displayName}</div>
                          <div className="text-sm text-slate-600">{profile.specialty || ui.selectedProfileLabel}</div>
                        </div>
                        {profile.featured ? (
                          <Badge className={theme.featuredBadgeClassName}>{t("validated")}</Badge>
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
                  <Video className={theme.sectionIconClassName} />
                  {ui.featuredVideosTitle}
                </CardTitle>
                <CardDescription>{ui.featuredVideosDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                {featuredVideos.length === 0 ? (
                  <div className={theme.videoEmptyStateClassName}>
                    {ui.noVideos}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {featuredVideos.map((video) => (
                      <a key={String(video.id) + "-video"} href={video.url} target="_blank" rel="noreferrer" className="group cursor-pointer">
                        <div className="relative mb-3 overflow-hidden rounded-lg">
                          <div className={theme.videoCardPreviewClassName}>
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-700">
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
                  <FileText className={theme.sectionIconClassName} />
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
                        <div className={theme.articleIconWrapperClassName}>
                          {defaultArticleIcon || <FileText className={theme.sectionIconClassName} />}
                        </div>
                        <div className="flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">{article.title}</h3>
                            {article.validated ? (
                              <Badge className={theme.featuredBadgeClassName}>
                                <ShieldCheck className="mr-1 h-3 w-3" />
                                {t("validated")}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mb-2 line-clamp-3 text-sm text-slate-600">{article.excerpt || article.description || article.text || article.body}</p>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                            {article.category ? (
                              <Badge variant="outline" className="text-xs">
                                {article.category}
                              </Badge>
                            ) : null}
                            {article.authorSpecialty ? <span>{article.authorSpecialty}</span> : null}
                          </div>
                          {article.pdfUrl ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <a
                                href={article.pdfUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                              >
                                <ExternalLink className="h-3 w-3" />
                                {language === "ht" ? "Gade PDF a" : "Prévisualiser le PDF"}
                              </a>
                              <a
                                href={article.pdfUrl}
                                download={article.pdfName || "article.pdf"}
                                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                              >
                                <Download className="h-3 w-3" />
                                {language === "ht" ? "Telechaje PDF a" : "Télécharger le PDF"}
                              </a>
                            </div>
                          ) : null}
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

            <Card id="appointment-form" className="health-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className={theme.sectionIconClassName} />
                  {language === "ht" ? "Mande yon konsiltasyon vityèl" : "Demander une consultation virtuelle"}
                </CardTitle>
                <CardDescription>
                  {language === "ht"
                    ? "Chwazi yon dat ak lè ou prefere. Doktè a pral konfime randevou an epi voye yon lyen videyo pou ou."
                    : "Choisissez une date et une heure préférées. Le médecin confirmera le rendez-vous et vous enverra un lien vidéo."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!user ? (
                  <p className="text-sm text-slate-600">{language === "ht" ? "Konekte pou mande yon randevou." : "Connectez-vous pour demander un rendez-vous."}</p>
                ) : (
                  <form onSubmit={handleSubmitAppointment} className="space-y-4">
                    {apptSent ? (
                      <div className={theme.successMessageClassName}>
                        {language === "ht"
                          ? "Demann ou an voye! Doktè a pral kontakte ou rapidman."
                          : "Demande envoyée ! Le médecin vous contactera bientôt."}
                      </div>
                    ) : null}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">
                          {language === "ht" ? "Dat ou prefere" : "Date préférée"}
                        </label>
                        <Input
                          type="date"
                          value={apptDate}
                          onChange={(e) => setApptDate(e.target.value)}
                          min={new Date().toISOString().split("T")[0]}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">
                          {language === "ht" ? "Lè ou prefere (opsyonèl)" : "Heure préférée (facultatif)"}
                        </label>
                        <Input
                          type="time"
                          value={apptTime}
                          onChange={(e) => setApptTime(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">
                        {language === "ht" ? "Rezon konsiltasyon an" : "Motif de la consultation"}
                      </label>
                      <Textarea
                        placeholder={language === "ht" ? "Dekri rezon konsiltasyon an..." : "Décrivez le motif de la consultation..."}
                        value={apptMotif}
                        onChange={(e) => setApptMotif(e.target.value)}
                        className="min-h-[100px]"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className={theme.fullPrimaryButtonClassName}
                      disabled={apptSending || !apptDate.trim() || !apptMotif.trim()}
                    >
                      <Video className="mr-2 h-4 w-4" />
                      {apptSending
                        ? (language === "ht" ? "Ap voye..." : "Envoi en cours...")
                        : (language === "ht" ? "Voye demann randevou" : "Envoyer la demande")}
                    </Button>
                    <p className="text-xs leading-5 text-slate-500">
                      {language === "ht"
                        ? "Randevou yo konfime pa doktè a. Ou ap resevwa yon lyen Jitsi pou konsiltasyon vityèl la."
                        : "Les rendez-vous sont confirmés par le médecin. Vous recevrez un lien Jitsi pour la consultation vidéo."}
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card id="contact-form" className="health-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className={theme.sectionIconClassName} />
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
                      <div className={theme.successMessageClassName}>
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
                    <Button type="submit" className={theme.fullPrimaryButtonClassName} disabled={sending || !questionTitle.trim() || !questionBody.trim()}>
                      <Send className="mr-2 h-4 w-4" />
                      {sending ? t("sending") + "..." : t("sendQuestion")}
                    </Button>
                    <p className="text-xs leading-5 text-slate-500">{questionDisclaimerText}</p>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {confirmedPatientAppointments.length > 0 ? (
              <Card className="health-card border-indigo-100 bg-indigo-50/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-indigo-800">
                    <Video className="h-4 w-4 text-indigo-600" />
                    {language === "ht" ? "Randevou konfime" : "Rendez-vous confirmés"}
                  </CardTitle>
                  <CardDescription>
                    {language === "ht"
                      ? "Doktè a konfime randevou ou yo. Klike pou antre nan konsiltasyon an."
                      : "Le médecin a confirmé vos rendez-vous. Cliquez pour rejoindre la consultation."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {confirmedPatientAppointments.map((appt) => (
                    <div key={appt.id} className="rounded-2xl border border-indigo-100 bg-white p-3 space-y-2">
                      <div className="text-sm font-medium text-slate-800">{appt.doctorName || "—"}</div>
                      {appt.preferredDate ? (
                        <div className="text-xs text-slate-500">
                          {appt.preferredDate}{appt.preferredTime ? ` — ${appt.preferredTime}` : ""}
                        </div>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-sm"
                        onClick={() => setActiveJitsiUrl(appt.meetingUrl)}
                      >
                        <Video className="mr-1.5 h-3.5 w-3.5" />
                        {language === "ht" ? "Antre nan konsiltasyon" : "Rejoindre la consultation"}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            <Card className="health-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className={theme.sectionIconClassName} />
                  {ui.quickActionsTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className={theme.quickActionPrimaryButtonClassName} onClick={handleOpenQuestionForm}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {ui.askTeam}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => document.getElementById("appointment-form")?.scrollIntoView({ behavior: "smooth" })}>
                  <Video className="mr-2 h-4 w-4" />
                  {ui.virtualConsultLabel || (language === "ht" ? "Konsiltasyon vityèl" : "Consultation virtuelle")}
                </Button>
                {(() => {
                  const bUrl = selectedProfile?.bookingUrl || "";
                  if (bUrl.startsWith("tel:")) {
                    return (
                      <div className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm">
                        <p className="text-xs text-slate-500 mb-1">{ui.requestAppointment}</p>
                        <a
                          href={bUrl}
                          className="flex items-center gap-2 font-medium text-slate-800 hover:text-indigo-600"
                        >
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          {bUrl.replace("tel:", "")}
                        </a>
                      </div>
                    );
                  }
                  if (bUrl && !bUrl.startsWith("#")) {
                    return (
                      <a
                        href={bUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
                      >
                        <Calendar className="h-4 w-4" />
                        {ui.requestAppointment}
                      </a>
                    );
                  }
                  return (
                    <Button variant="outline" className="w-full" onClick={() => document.getElementById("contact-form")?.scrollIntoView({ behavior: "smooth" })}>
                      <Calendar className="mr-2 h-4 w-4" />
                      {ui.requestAppointment}
                    </Button>
                  );
                })()}
                {selectedProfileFeaturedVideo?.url ? (
                  <Button variant="outline" className="w-full" onClick={() => window.open(selectedProfileFeaturedVideo.url, "_blank", "noreferrer")}>
                    <Video className="mr-2 h-4 w-4" />
                    {ui.watchVideoLabel}
                  </Button>
                ) : null}
                {extraQuickActions.map((action) => {
                  const Icon = action.icon || ArrowRight;
                  return (
                    <Button key={action.id} variant="outline" className="w-full" onClick={() => action.onClick({ selectedProfile, router })}>
                      <Icon className="mr-2 h-4 w-4" />
                      {action.label}
                    </Button>
                  );
                })}
                {canManageDoctorContent ? (
                  <Button variant="outline" className="w-full" onClick={() => router.push(dashboardPath)}>
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
                  <span className={theme.infoAccentTextClassName}>{selectedProfile?.published === false ? ui.unavailable : ui.available}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
                  <span>{ui.videoLabel}</span>
                  <span className={theme.infoAccentTextClassName}>{selectedProfileFeaturedVideo?.url ? ui.available : ui.unavailable}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
                  <span>{ui.bookLabel}</span>
                  <span className={theme.infoAccentTextClassName}>{selectedProfile?.bookingUrl ? ui.available : ui.unavailable}</span>
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
                    {importantDisclaimerText}
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
