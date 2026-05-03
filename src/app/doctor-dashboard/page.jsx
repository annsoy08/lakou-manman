"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  deleteDoctorArticle,
  deleteDoctorVideo,
  getDoctorAppointments,
  getDoctorArticles,
  getDoctorProfileByEditor,
  getDoctorQuestions,
  getDoctorVideos,
  saveDoctorArticle,
  saveDoctorProfile,
  saveDoctorVideo,
  updateDoctorAppointment,
} from "@/lib/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, ExternalLink, FileText, MessageCircle, Paperclip, Save, ShieldCheck, Sparkles, Stethoscope, Trash2, Upload, Video, X } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase";

const emptyArticleForm = {
  id: "",
  title: "",
  text: "",
  category: "",
  published: true,
  validated: true,
  pdfUrl: "",
  pdfName: "",
};

const emptyVideoForm = {
  id: "",
  title: "",
  url: "",
  description: "",
  category: "",
  published: true,
  validated: true,
};

function buildProfileForm(profile = {}, userProfile = {}, user = null, preferredSpecialty = "") {
  return {
    id: profile.id || user?.uid || "",
    displayName: profile.displayName || userProfile?.name || user?.displayName || "",
    specialty: profile.specialty || preferredSpecialty || "",
    headline: profile.headline || "",
    bio: profile.bio || userProfile?.bio || "",
    city: profile.city || userProfile?.city || "",
    country: profile.country || userProfile?.country || "",
    languages: Array.isArray(profile.languages) ? profile.languages.join(", ") : (profile.languages || ""),
    phone: profile.phone || "",
    whatsapp: profile.whatsapp || "",
    bookingUrl: profile.bookingUrl || "",
    videoUrl: profile.videoUrl || "",
    videoTitle: profile.videoTitle || "",
    yearsOfExperience: profile.yearsOfExperience || "",
    education: profile.education || "",
    licenseNumber: profile.licenseNumber || "",
    published: profile.published !== false,
    featured: Boolean(profile.featured),
  };
}

function getDashboardEntry(pathname = "", language = "fr") {
  if (pathname === "/gynecologie-dashboard") {
    return language === "ht"
      ? {
          title: "Dashboard jinekoloji",
          description: "Jere fich jinekoloji ou ak piblikasyon ou yo depi espas jinekoloji a.",
          backLabel: "Retounen sou espas jinekoloji a",
          backPath: "/gynecologie",
          defaultSpecialty: "Gynécologie",
        }
      : {
          title: "Dashboard gynécologie",
          description: "Gérez votre fiche gynécologie et vos publications depuis l'espace gynécologie.",
          backLabel: "Retour à l'espace gynécologie",
          backPath: "/gynecologie",
          defaultSpecialty: "Gynécologie",
        };
  }

  if (pathname === "/psychologie-dashboard") {
    return language === "ht"
      ? {
          title: "Dashboard sikoloji",
          description: "Jere fich sikoloji ou ak piblikasyon ou yo depi espas sikoloji a.",
          backLabel: "Retounen sou espas sikoloji a",
          backPath: "/psychologie",
          defaultSpecialty: "Psychologie",
        }
      : {
          title: "Dashboard psychologie",
          description: "Gérez votre fiche psychologie et vos publications depuis l'espace psychologie.",
          backLabel: "Retour à l'espace psychologie",
          backPath: "/psychologie",
          defaultSpecialty: "Psychologie",
        };
  }

  if (pathname === "/pediatre-dashboard") {
    return language === "ht"
      ? {
          title: "Dashboard pedyatri",
          description: "Jere fich pedyatri ou ak piblikasyon ou yo depi espas pedyatri a.",
          backLabel: "Retounen sou espas pedyatri a",
          backPath: "/pediatre",
          defaultSpecialty: "Pédiatrie",
        }
      : {
          title: "Dashboard pédiatrie",
          description: "Gérez votre fiche pédiatrie et vos publications depuis l'espace pédiatrie.",
          backLabel: "Retour à l'espace pédiatrie",
          backPath: "/pediatre",
          defaultSpecialty: "Pédiatrie",
        };
  }

  return language === "ht"
    ? {
        title: "Dashboard medsen",
        description: "Jere pwofil medikal ou ak piblikasyon ou yo nan yon espas restrenn.",
        backLabel: "Retounen sou espas sante a",
        backPath: "/doctor",
        defaultSpecialty: "",
      }
    : {
        title: "Dashboard médecin",
        description: "Gérez votre fiche médicale et vos publications depuis un espace restreint.",
        backLabel: "Retour à l'espace santé",
        backPath: "/doctor",
        defaultSpecialty: "",
      };
}

function hasDashboardAccess({ isAdmin = false, canManageDoctorContent = false, role = "" } = {}) {
  const normalizedRole = String(role || "").trim().toLowerCase();
  return isAdmin || canManageDoctorContent || ["admin", "doctor_editor", "doctor"].includes(normalizedRole);
}

const DASHBOARD_BOOTSTRAP_TIMEOUT_MS = 15000;

function createDashboardTimeoutError(code = "dashboard_timeout") {
  const error = new Error(code);
  error.code = code;
  return error;
}

function withTimeout(promise, timeoutMs = DASHBOARD_BOOTSTRAP_TIMEOUT_MS, timeoutCode = "dashboard_timeout") {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(createDashboardTimeoutError(timeoutCode));
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

export function DoctorDashboardPage() {
  const { user, userProfile, loading: authLoading, isAdmin, canManageDoctorContent, refreshProfile } = useAuth();
  const { language } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const userId = user?.uid || "";
  const currentRole = String(userProfile?.role || "").trim().toLowerCase();
  const hasImmediateAccess = hasDashboardAccess({ isAdmin, canManageDoctorContent, role: currentRole });
  const dashboardEntry = getDashboardEntry(pathname, language);

  const dashboardUi = language === "ht"
    ? {
        title: "Dashboard medsen",
        description: "Jere pwofil medikal ou ak piblikasyon ou yo nan yon espas restrenn.",
        profileTitle: "Fich medsen an",
        profileDesc: "Sa a se fich piblik manman yo ap wè sou espas sante a.",
        articlesTitle: "Atik ak konsèy medikal",
        articlesDesc: "Ekri, korije oswa mete ajou atik ak konsèy medikal yo dirèkteman depi dashboard la.",
        profileSaved: "Fich medsen an anrejistre.",
        articleSaved: "Atik la anrejistre.",
        videoSaved: "Videyo a anrejistre.",
        accessDenied: "Espas sa a rezève pou admin ak kont doctor_editor sèlman.",
        backToDoctor: "Retounen sou espas sante a",
        loading: "Ap chaje dashboard la...",
        loadError: "Dashboard la pa t ka chaje pou kounye a.",
        loadTimeout: "Tan chajman dashboard la depase. Verifye koneksyon an epi eseye ankò.",
        name: "Non pwofesyonèl",
        specialty: "Espesyalite",
        headline: "Tit kout",
        bio: "Prezante eksperyans ou",
        city: "Vil",
        country: "Peyi",
        languages: "Lang ou pale",
        phone: "Telefòn",
        whatsapp: "WhatsApp",
        bookingUrl: "Lyen randevou",
        videoUrl: "Lyen videyo prezantasyon an",
        videoTitle: "Tit videyo a",
        yearsOfExperience: "Eksperyans",
        education: "Etid / diplòm",
        licenseNumber: "Nimewo lisans",
        publishProfile: "Pibliye pwofil la",
        featureProfile: "Mete pwofil la an avan",
        saveProfile: "Anrejistre pwofil la",
        articleTitle: "Tit atik la",
        articleCategory: "Kategori",
        articleBody: "Kontni atik la",
        publishArticle: "Atik piblik",
        validatedArticle: "Kontni verifye",
        saveArticle: "Anrejistre atik la",
        createArticle: "Nouvo atik",
        articlePdf: "Fichè PDF (opsyonèl)",
        articlePdfRemove: "Retire PDF a",
        articlePdfOpen: "Ouvri PDF a",
        articlePdfUploading: "Ap voye PDF a...",
        articlePdfBadge: "PDF",
        questionsTitle: "Kesyon resevwa",
        questionsDesc: "Kesyon pasyan yo voye atravè fòmilè kontak la.",
        noQuestions: "Pa gen kesyon pou kounye a.",
        questionFrom: "De",
        appointmentsTitle: "Randevou vityèl",
        appointmentsDesc: "Demann randevou pasyan yo voye pou konsiltasyon vityèl.",
        noAppointments: "Pa gen demann randevou pou kounye a.",
        appointmentFrom: "Pasyan",
        appointmentDate: "Dat",
        appointmentTime: "Lè",
        appointmentMotif: "Rezon",
        appointmentStatus: "Estati",
        appointmentPending: "An atant",
        appointmentConfirmed: "Konfime",
        appointmentRejected: "Refize",
        appointmentConfirm: "Konfime & Jenere lyen Jitsi",
        appointmentReject: "Refize",
        appointmentMeeting: "Ouvri konsiltasyon an",
        appointmentConfirming: "Ap konfime...",
        appointmentJoin: "Antre nan konsiltasyon",
        appointmentClose: "Fèmen konsiltasyon an",
        managedArticles: "Atik medikal yo",
        myArticles: "Atik mwen yo",
        noManagedArticles: "Pa gen atik medikal disponib pou kounye a.",
        noArticles: "Ou poko kreye okenn atik medikal.",
        videosTitle: "Bibliyotèk videyo",
        videosDesc: "Ajoute plizyè videyo pou piblik la ka jwenn konsèy, prezantasyon oswa resous sipò yo sou paj espesyalite a.",
        videoItemTitle: "Tit videyo a",
        videoItemUrl: "Lyen videyo a",
        videoItemDescription: "Deskripsyon videyo a",
        videoItemCategory: "Kategori videyo a",
        publishVideo: "Videyo piblik",
        validatedVideo: "Videyo verifye",
        saveVideo: "Anrejistre videyo a",
        createVideo: "Nouvo videyo",
        myVideos: "Videyo mwen yo",
        noVideos: "Ou poko kreye okenn videyo.",
        edit: "Modifye",
        delete: "Efase",
        deleteArticleConfirm: "Èske ou vle efase atik sa a vre?",
        articleDeleted: "Atik la efase.",
        deleteVideoConfirm: "Èske ou vle efase videyo sa a vre?",
        videoDeleted: "Videyo a efase.",
        profilePublishedState: "Fich la piblik sou espas sante a.",
        profileDraftState: "Fich la an bouyon epi li poko piblik.",
        published: "Pibliye",
        draft: "Bouyon",
        validated: "Verifye",
        createdBy: "Pa",
        openVideo: "Louvri videyo a",
      }
    : {
        title: "Dashboard médecin",
        description: "Gérez votre fiche médicale et vos publications depuis un espace restreint.",
        profileTitle: "Fiche médecin",
        profileDesc: "Cette fiche publique sera visible par les mamans dans l'espace santé.",
        articlesTitle: "Articles et conseils médicaux",
        articlesDesc: "Rédigez, corrigez ou mettez à jour les articles et conseils médicaux directement depuis le dashboard.",
        profileSaved: "La fiche médecin a été enregistrée.",
        articleSaved: "L'article a été enregistré.",
        videoSaved: "La vidéo a été enregistrée.",
        accessDenied: "Cet espace est réservé aux admins et aux comptes doctor_editor.",
        backToDoctor: "Retour à l'espace santé",
        loading: "Chargement du dashboard...",
        loadError: "Le dashboard n'a pas pu être chargé pour le moment.",
        loadTimeout: "Le chargement du dashboard a dépassé le délai prévu. Vérifiez la connexion puis réessayez.",
        name: "Nom professionnel",
        specialty: "Spécialité",
        headline: "Titre court",
        bio: "Présentez votre expérience",
        city: "Ville",
        country: "Pays",
        languages: "Langues parlées",
        phone: "Téléphone",
        whatsapp: "WhatsApp",
        bookingUrl: "Lien de prise de rendez-vous",
        videoUrl: "Lien de la vidéo de présentation",
        videoTitle: "Titre de la vidéo",
        yearsOfExperience: "Expérience",
        education: "Études / diplôme",
        licenseNumber: "Numéro de licence",
        publishProfile: "Publier la fiche",
        featureProfile: "Mettre la fiche en avant",
        saveProfile: "Enregistrer la fiche",
        articleTitle: "Titre de l'article",
        articleCategory: "Catégorie",
        articleBody: "Contenu de l'article",
        publishArticle: "Article public",
        validatedArticle: "Contenu validé",
        saveArticle: "Enregistrer l'article",
        createArticle: "Nouvel article",
        articlePdf: "Fichier PDF (optionnel)",
        articlePdfRemove: "Supprimer le PDF",
        articlePdfOpen: "Ouvrir le PDF",
        articlePdfUploading: "Téléversement du PDF en cours...",
        articlePdfBadge: "PDF",
        questionsTitle: "Questions reçues",
        questionsDesc: "Questions envoyées par les patients via le formulaire de contact.",
        noQuestions: "Aucune question reçue pour le moment.",
        questionFrom: "De",
        appointmentsTitle: "Rendez-vous virtuels",
        appointmentsDesc: "Demandes de consultation virtuelle envoyées par les patients.",
        noAppointments: "Aucune demande de rendez-vous pour le moment.",
        appointmentFrom: "Patient",
        appointmentDate: "Date",
        appointmentTime: "Heure",
        appointmentMotif: "Motif",
        appointmentStatus: "Statut",
        appointmentPending: "En attente",
        appointmentConfirmed: "Confirmé",
        appointmentRejected: "Refusé",
        appointmentConfirm: "Confirmer & Générer lien Jitsi",
        appointmentReject: "Refuser",
        appointmentMeeting: "Ouvrir la consultation",
        appointmentConfirming: "Confirmation...",
        appointmentJoin: "Rejoindre la consultation",
        appointmentClose: "Fermer la consultation",
        managedArticles: "Articles médicaux",
        myArticles: "Mes articles",
        noManagedArticles: "Aucun article médical n'est disponible pour le moment.",
        noArticles: "Vous n'avez pas encore créé d'article médical.",
        videosTitle: "Bibliothèque vidéo",
        videosDesc: "Ajoutez plusieurs vidéos pour rendre vos conseils, présentations ou ressources visibles sur la page de spécialité.",
        videoItemTitle: "Titre de la vidéo",
        videoItemUrl: "Lien de la vidéo",
        videoItemDescription: "Description de la vidéo",
        videoItemCategory: "Catégorie de la vidéo",
        publishVideo: "Vidéo publique",
        validatedVideo: "Vidéo validée",
        saveVideo: "Enregistrer la vidéo",
        createVideo: "Nouvelle vidéo",
        myVideos: "Mes vidéos",
        noVideos: "Vous n'avez pas encore créé de vidéo.",
        edit: "Modifier",
        delete: "Supprimer",
        deleteArticleConfirm: "Voulez-vous vraiment supprimer cet article ?",
        articleDeleted: "L'article a été supprimé.",
        deleteVideoConfirm: "Voulez-vous vraiment supprimer cette vidéo ?",
        videoDeleted: "La vidéo a été supprimée.",
        profilePublishedState: "La fiche est visible publiquement dans l'espace santé.",
        profileDraftState: "La fiche est en brouillon et n'est pas encore publique.",
        published: "Publié",
        draft: "Brouillon",
        validated: "Validé",
        createdBy: "Par",
        openVideo: "Ouvrir la vidéo",
      };

  const [pageLoading, setPageLoading] = useState(true);
  const [profileForm, setProfileForm] = useState(() => buildProfileForm({}, userProfile, user, dashboardEntry.defaultSpecialty));
  const [articleForm, setArticleForm] = useState(emptyArticleForm);
  const [videoForm, setVideoForm] = useState(emptyVideoForm);
  const [articles, setArticles] = useState([]);
  const [videos, setVideos] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [appointmentActionId, setAppointmentActionId] = useState("");
  const [activeJitsiUrl, setActiveJitsiUrl] = useState("");
  const [resolvedRole, setResolvedRole] = useState(currentRole);
  const [profileSaving, setProfileSaving] = useState(false);
  const [articleSaving, setArticleSaving] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const pdfInputRef = useRef(null);
  const [videoSaving, setVideoSaving] = useState(false);
  const [articleDeletingId, setArticleDeletingId] = useState("");
  const [videoDeletingId, setVideoDeletingId] = useState("");
  const [feedback, setFeedback] = useState({ tone: "success", message: "" });
  const lastBootstrapKeyRef = useRef("");
  const bootstrapInFlightRef = useRef(false);
  const canModerateAllArticles = isAdmin || resolvedRole === "admin";
  const articleQueryOptions = useMemo(() => (canModerateAllArticles ? {} : { authorId: userId }), [canModerateAllArticles, userId]);
  const articleListTitle = canModerateAllArticles ? dashboardUi.managedArticles : dashboardUi.myArticles;
  const emptyArticleListLabel = canModerateAllArticles ? dashboardUi.noManagedArticles : dashboardUi.noArticles;

  useEffect(() => {
    setResolvedRole((previousRole) => (previousRole === currentRole ? previousRole : currentRole));
  }, [currentRole]);

  useEffect(() => {
    let cancelled = false;
    const bootstrapKey = [userId, currentRole || "none", hasImmediateAccess ? "1" : "0"].join(":");

    if (authLoading) {
      return () => {
        cancelled = true;
      };
    }

    if (!userId) {
      lastBootstrapKeyRef.current = "";
      bootstrapInFlightRef.current = false;
      setResolvedRole("");
      router.replace("/login");
      return () => {
        cancelled = true;
      };
    }

    if (bootstrapInFlightRef.current || lastBootstrapKeyRef.current === bootstrapKey) {
      return () => {
        cancelled = true;
      };
    }

    async function bootstrap() {
      bootstrapInFlightRef.current = true;

      try {
        if (hasImmediateAccess && !cancelled) {
          setResolvedRole(currentRole);
          setProfileForm(buildProfileForm({}, userProfile, user, dashboardEntry.defaultSpecialty));
          setPageLoading(false);
        }

        const refreshedProfile = await withTimeout(
          refreshProfile(),
          DASHBOARD_BOOTSTRAP_TIMEOUT_MS,
          "dashboard_refresh_profile_timeout"
        );
        const effectiveRole = String(refreshedProfile?.role || currentRole || "").trim().toLowerCase();
        const hasAccess = hasDashboardAccess({
          isAdmin,
          canManageDoctorContent,
          role: effectiveRole,
        });

        if (!cancelled) {
          setResolvedRole(effectiveRole);
        }

        const doctorDisplayName = String(refreshedProfile?.name || userProfile?.name || user?.displayName || "").trim();

        let resolvedAccess = hasAccess;
        if (!resolvedAccess) {
          const linkedProfile = await getDoctorProfileByEditor(userId, doctorDisplayName).catch(() => null);
          resolvedAccess = Boolean(linkedProfile?.id);
        }

        if (!resolvedAccess) {
          if (!cancelled) {
            setFeedback({ tone: "error", message: dashboardUi.accessDenied });
          }
          return;
        }

        if (!cancelled) {
          setProfileForm(buildProfileForm({}, refreshedProfile || userProfile, user, dashboardEntry.defaultSpecialty));
        }

        const adminCanLoadAllArticles = isAdmin || effectiveRole === "admin";

        const [doctorProfile, ownArticles, ownVideos, ownQuestions, ownAppointments] = await withTimeout(
          Promise.all([
            getDoctorProfileByEditor(userId, doctorDisplayName),
            getDoctorArticles(adminCanLoadAllArticles ? {} : { authorId: userId }),
            getDoctorVideos({ authorId: userId }),
            getDoctorQuestions(),
            getDoctorAppointments({ doctorId: userId }),
          ]),
          DASHBOARD_BOOTSTRAP_TIMEOUT_MS,
          "dashboard_fetch_data_timeout"
        );

        if (!cancelled) {
          setProfileForm(buildProfileForm(doctorProfile || {}, refreshedProfile || userProfile, user, dashboardEntry.defaultSpecialty));
          setArticles(ownArticles);
          setVideos(ownVideos);
          setQuestions(Array.isArray(ownQuestions) ? ownQuestions : []);
          setAppointments(Array.isArray(ownAppointments) ? ownAppointments : []);
        }
      } catch (error) {
        console.error("Error loading doctor dashboard:", error);

        if (!cancelled) {
          const isTimeoutError = ["dashboard_refresh_profile_timeout", "dashboard_fetch_data_timeout", "dashboard_timeout"].includes(error?.code);
          setFeedback({ tone: "error", message: isTimeoutError ? dashboardUi.loadTimeout : dashboardUi.loadError });
        }
      } finally {
        lastBootstrapKeyRef.current = bootstrapKey;
        bootstrapInFlightRef.current = false;

        if (!cancelled) {
          setPageLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [articleQueryOptions, authLoading, canManageDoctorContent, currentRole, dashboardEntry.defaultSpecialty, dashboardUi.accessDenied, hasImmediateAccess, isAdmin, refreshProfile, router, user, userId, userProfile]);

  async function handleSaveProfile() {
    if (!user?.uid) {
      return;
    }

    setProfileSaving(true);
    setFeedback({ tone: "success", message: "" });

    try {
      await saveDoctorProfile({
        ...profileForm,
        editorUserId: user.uid,
        email: userProfile?.email || user.email || "",
        photo: userProfile?.photo || user.photoURL || "",
      }, user.uid);
      const savedProfileDisplayName = String(profileForm.displayName || userProfile?.name || user?.displayName || "").trim();
      const savedProfile = await getDoctorProfileByEditor(user.uid, savedProfileDisplayName);
      const nextProfile = savedProfile || profileForm;

      setProfileForm(buildProfileForm(nextProfile, userProfile, user, dashboardEntry.defaultSpecialty));
      setFeedback({
        tone: "success",
        message: dashboardUi.profileSaved + " " + (nextProfile?.published === false ? dashboardUi.profileDraftState : dashboardUi.profilePublishedState),
      });
    } catch (error) {
      console.error("Error saving doctor profile:", error);
      setFeedback({ tone: "error", message: String(error?.message || "save_error") });
    } finally {
      setProfileSaving(false);
    }
  }

  function handlePdfSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPdfFile(file);
    setArticleForm((prev) => ({ ...prev, pdfUrl: "", pdfName: "" }));
  }

  async function handleSaveArticle() {
    if (!user?.uid) {
      return;
    }

    setArticleSaving(true);
    setFeedback({ tone: "success", message: "" });

    let nextPdfUrl = articleForm.pdfUrl;
    let nextPdfName = articleForm.pdfName;

    try {
      if (pdfFile) {
        setPdfUploading(true);
        setFeedback({ tone: "success", message: dashboardUi.articlePdfUploading });
        const storage = getFirebaseStorage();
        const filename = `${Date.now()}-${pdfFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const storageRef = ref(storage, `doctor_articles_pdfs/${user.uid}/${filename}`);
        await uploadBytes(storageRef, pdfFile);
        nextPdfUrl = await getDownloadURL(storageRef);
        nextPdfName = pdfFile.name;
        setPdfUploading(false);
        setFeedback({ tone: "success", message: "" });
      }

      await saveDoctorArticle({
        ...articleForm,
        pdfUrl: nextPdfUrl,
        pdfName: nextPdfName,
        authorId: user.uid,
        authorName: profileForm.displayName || userProfile?.name || user.displayName || "",
        authorSpecialty: profileForm.specialty,
      }, user.uid);
      const ownArticles = await getDoctorArticles(articleQueryOptions);
      setArticles(ownArticles);
      setArticleForm(emptyArticleForm);
      setPdfFile(null);
      setFeedback({ tone: "success", message: dashboardUi.articleSaved });
    } catch (error) {
      console.error("Error saving doctor article:", error);
      setPdfUploading(false);
      setFeedback({ tone: "error", message: String(error?.message || "save_error") });
    } finally {
      setArticleSaving(false);
      setPdfUploading(false);
    }
  }

  async function handleDeleteArticle(articleId) {
    if (!user?.uid || !articleId) {
      return;
    }

    if (typeof window !== "undefined" && !window.confirm(dashboardUi.deleteArticleConfirm)) {
      return;
    }

    setArticleDeletingId(articleId);
    setFeedback({ tone: "success", message: "" });

    try {
      await deleteDoctorArticle(articleId);
      const ownArticles = await getDoctorArticles(articleQueryOptions);
      setArticles(ownArticles);

      if (articleForm.id === articleId) {
        setArticleForm(emptyArticleForm);
      }

      setFeedback({ tone: "success", message: dashboardUi.articleDeleted });
    } catch (error) {
      console.error("Error deleting doctor article:", error);
      setFeedback({ tone: "error", message: String(error?.message || "delete_error") });
    } finally {
      setArticleDeletingId("");
    }
  }

  async function handleSaveVideo() {
    if (!user?.uid) {
      return;
    }

    setVideoSaving(true);
    setFeedback({ tone: "success", message: "" });

    try {
      await saveDoctorVideo({
        ...videoForm,
        authorId: user.uid,
        authorName: profileForm.displayName || userProfile?.name || user.displayName || "",
        authorSpecialty: profileForm.specialty,
      }, user.uid);
      const ownVideos = await getDoctorVideos({ authorId: user.uid });
      setVideos(ownVideos);
      setVideoForm(emptyVideoForm);
      setFeedback({ tone: "success", message: dashboardUi.videoSaved });
    } catch (error) {
      console.error("Error saving doctor video:", error);
      setFeedback({ tone: "error", message: String(error?.message || "save_error") });
    } finally {
      setVideoSaving(false);
    }
  }

  async function handleDeleteVideo(videoId) {
    if (!user?.uid || !videoId) {
      return;
    }

    if (typeof window !== "undefined" && !window.confirm(dashboardUi.deleteVideoConfirm)) {
      return;
    }

    setVideoDeletingId(videoId);
    setFeedback({ tone: "success", message: "" });

    try {
      await deleteDoctorVideo(videoId);
      const ownVideos = await getDoctorVideos({ authorId: user.uid });
      setVideos(ownVideos);

      if (videoForm.id === videoId) {
        setVideoForm(emptyVideoForm);
      }

      setFeedback({ tone: "success", message: dashboardUi.videoDeleted });
    } catch (error) {
      console.error("Error deleting doctor video:", error);
      setFeedback({ tone: "error", message: String(error?.message || "delete_error") });
    } finally {
      setVideoDeletingId("");
    }
  }

  async function handleConfirmAppointment(appointmentId) {
    if (!appointmentId) {
      return;
    }

    setAppointmentActionId(appointmentId);

    try {
      const meetingId = `lakou-manman-${appointmentId}`;
      const meetingUrl = `https://meet.jit.si/${meetingId}`;
      await updateDoctorAppointment(appointmentId, {
        status: "confirmed",
        meetingUrl,
        confirmedAt: new Date().toISOString(),
      });
      setAppointments((prev) => prev.map((appt) =>
        appt.id === appointmentId
          ? { ...appt, status: "confirmed", meetingUrl, confirmedAt: new Date().toISOString() }
          : appt
      ));
      setFeedback({ tone: "success", message: dashboardUi.appointmentConfirmed + " — Jitsi: " + meetingUrl });
    } catch (error) {
      console.error("Error confirming appointment:", error);
      setFeedback({ tone: "error", message: String(error?.message || "confirm_error") });
    } finally {
      setAppointmentActionId("");
    }
  }

  async function handleRejectAppointment(appointmentId) {
    if (!appointmentId) {
      return;
    }

    setAppointmentActionId(appointmentId);

    try {
      await updateDoctorAppointment(appointmentId, {
        status: "rejected",
        rejectedAt: new Date().toISOString(),
      });
      setAppointments((prev) => prev.map((appt) =>
        appt.id === appointmentId
          ? { ...appt, status: "rejected" }
          : appt
      ));
    } catch (error) {
      console.error("Error rejecting appointment:", error);
      setFeedback({ tone: "error", message: String(error?.message || "reject_error") });
    } finally {
      setAppointmentActionId("");
    }
  }

  if (pageLoading) {
    return <div className="py-16 text-center text-slate-500">{dashboardUi.loading}</div>;
  }

  if (!hasDashboardAccess({ isAdmin, canManageDoctorContent, role: resolvedRole })) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-10">
        <Card className="rounded-[2rem] border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <p className="text-sm text-rose-600">{feedback.tone === "error" && feedback.message ? feedback.message : dashboardUi.accessDenied}</p>
            <Button className="mt-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600" onClick={() => router.push(dashboardEntry.backPath)}>
              {dashboardEntry.backLabel}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activeJitsiUrl ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex shrink-0 items-center justify-between gap-3 bg-slate-900 px-4 py-3">
            <div className="flex items-center gap-2 text-white">
              <Video className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-medium">{dashboardUi.appointmentsTitle}</span>
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
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-xl border-slate-600 text-white hover:bg-slate-700 hover:text-white"
                onClick={() => setActiveJitsiUrl("")}
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                {dashboardUi.appointmentClose}
              </Button>
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

      <div className="flex flex-col gap-4 rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200">
            <Stethoscope className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">{dashboardEntry.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{dashboardEntry.description}</p>
          </div>
        </div>
        <Button variant="outline" className="rounded-2xl" onClick={() => router.push(dashboardEntry.backPath)}>
          {dashboardEntry.backLabel}
        </Button>
      </div>

      {feedback.message ? (
        <div className={feedback.tone === "error"
          ? "rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          : "rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"}>
          {feedback.message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="rounded-[2rem] border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> {dashboardUi.profileTitle}
            </CardTitle>
            <CardDescription>{dashboardUi.profileDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Input value={profileForm.displayName} onChange={(event) => setProfileForm((prev) => ({ ...prev, displayName: event.target.value }))} placeholder={dashboardUi.name} className="rounded-xl" />
              <select
                value={profileForm.specialty}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, specialty: event.target.value }))}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">{dashboardUi.specialty}</option>
                <option value="Pédiatrie">Pédiatrie</option>
                <option value="Gynécologie et obstétrique">Gynécologie et obstétrique</option>
                <option value="Psychologie et soutien émotionnel">Psychologie et soutien émotionnel</option>
                <option value="Médecine générale">Médecine générale</option>
                <option value="Sage-femme">Sage-femme</option>
                <option value="Nutrition">Nutrition</option>
                <option value="Dermatologie">Dermatologie</option>
                <option value="Autre">Autre</option>
              </select>
              <Input value={profileForm.headline} onChange={(event) => setProfileForm((prev) => ({ ...prev, headline: event.target.value }))} placeholder={dashboardUi.headline} className="rounded-xl md:col-span-2" />
              <Input value={profileForm.city} onChange={(event) => setProfileForm((prev) => ({ ...prev, city: event.target.value }))} placeholder={dashboardUi.city} className="rounded-xl" />
              <Input value={profileForm.country} onChange={(event) => setProfileForm((prev) => ({ ...prev, country: event.target.value }))} placeholder={dashboardUi.country} className="rounded-xl" />
              <Input value={profileForm.languages} onChange={(event) => setProfileForm((prev) => ({ ...prev, languages: event.target.value }))} placeholder={dashboardUi.languages} className="rounded-xl md:col-span-2" />
              <Input value={profileForm.phone} onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder={dashboardUi.phone} className="rounded-xl" />
              <Input value={profileForm.whatsapp} onChange={(event) => setProfileForm((prev) => ({ ...prev, whatsapp: event.target.value }))} placeholder={dashboardUi.whatsapp} className="rounded-xl" />
              <Input value={profileForm.bookingUrl} onChange={(event) => setProfileForm((prev) => ({ ...prev, bookingUrl: event.target.value }))} placeholder={dashboardUi.bookingUrl} className="rounded-xl md:col-span-2" />
              <Input value={profileForm.videoUrl} onChange={(event) => setProfileForm((prev) => ({ ...prev, videoUrl: event.target.value }))} placeholder={dashboardUi.videoUrl} className="rounded-xl md:col-span-2" />
              <Input value={profileForm.videoTitle} onChange={(event) => setProfileForm((prev) => ({ ...prev, videoTitle: event.target.value }))} placeholder={dashboardUi.videoTitle} className="rounded-xl md:col-span-2" />
              <Input value={profileForm.yearsOfExperience} onChange={(event) => setProfileForm((prev) => ({ ...prev, yearsOfExperience: event.target.value }))} placeholder={dashboardUi.yearsOfExperience} className="rounded-xl" />
              <Input value={profileForm.licenseNumber} onChange={(event) => setProfileForm((prev) => ({ ...prev, licenseNumber: event.target.value }))} placeholder={dashboardUi.licenseNumber} className="rounded-xl" />
              <Input value={profileForm.education} onChange={(event) => setProfileForm((prev) => ({ ...prev, education: event.target.value }))} placeholder={dashboardUi.education} className="rounded-xl md:col-span-2" />
            </div>
            <Textarea value={profileForm.bio} onChange={(event) => setProfileForm((prev) => ({ ...prev, bio: event.target.value }))} placeholder={dashboardUi.bio} className="min-h-[180px] rounded-xl" />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant={profileForm.published ? "default" : "outline"} className="rounded-full" onClick={() => setProfileForm((prev) => ({ ...prev, published: !prev.published }))}>
                {dashboardUi.publishProfile}
              </Button>
              <Button type="button" variant={profileForm.featured ? "default" : "outline"} className="rounded-full" onClick={() => setProfileForm((prev) => ({ ...prev, featured: !prev.featured }))}>
                <Sparkles className="mr-2 h-4 w-4" /> {dashboardUi.featureProfile}
              </Button>
            </div>
            <p className={profileForm.published ? "text-sm text-emerald-700" : "text-sm text-slate-500"}>
              {profileForm.published ? dashboardUi.profilePublishedState : dashboardUi.profileDraftState}
            </p>
            <Button type="button" className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600" onClick={handleSaveProfile} disabled={profileSaving || !profileForm.displayName.trim() || !profileForm.specialty.trim()}>
              <Save className="mr-2 h-4 w-4" /> {profileSaving ? dashboardUi.saveProfile + "..." : dashboardUi.saveProfile}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-4 w-4 text-emerald-600" /> {dashboardUi.articlesTitle}
            </CardTitle>
            <CardDescription>{dashboardUi.articlesDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input value={articleForm.title} onChange={(event) => setArticleForm((prev) => ({ ...prev, title: event.target.value }))} placeholder={dashboardUi.articleTitle} className="rounded-xl" />
            <Input value={articleForm.category} onChange={(event) => setArticleForm((prev) => ({ ...prev, category: event.target.value }))} placeholder={dashboardUi.articleCategory} className="rounded-xl" />
            <Textarea value={articleForm.text} onChange={(event) => setArticleForm((prev) => ({ ...prev, text: event.target.value }))} placeholder={dashboardUi.articleBody} className="min-h-[160px] rounded-xl" />
            <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <div className="text-xs font-medium text-slate-500">{dashboardUi.articlePdf}</div>
              {articleForm.pdfUrl ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
                  <FileText className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{articleForm.pdfName || "Document PDF"}</span>
                  <a href={articleForm.pdfUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline">
                    <ExternalLink className="h-3 w-3" />{dashboardUi.articlePdfOpen}
                  </a>
                  <button type="button" onClick={() => setArticleForm((prev) => ({ ...prev, pdfUrl: "", pdfName: "" }))} className="ml-1 text-slate-400 hover:text-rose-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : pdfFile ? (
                <div className="flex items-center gap-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2">
                  <Paperclip className="h-4 w-4 shrink-0 text-sky-600" />
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{pdfFile.name}</span>
                  <button type="button" onClick={() => { setPdfFile(null); if (pdfInputRef.current) pdfInputRef.current.value = ""; }} className="text-slate-400 hover:text-rose-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
              {!articleForm.pdfUrl && (
                <div>
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={handlePdfSelect}
                  />
                  <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => pdfInputRef.current?.click()}>
                    <Upload className="mr-2 h-3.5 w-3.5" />{dashboardUi.articlePdf}
                  </Button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant={articleForm.published ? "default" : "outline"} className="rounded-full" onClick={() => setArticleForm((prev) => ({ ...prev, published: !prev.published }))}>
                {dashboardUi.publishArticle}
              </Button>
              <Button type="button" variant={articleForm.validated ? "default" : "outline"} className="rounded-full" onClick={() => setArticleForm((prev) => ({ ...prev, validated: !prev.validated }))}>
                {dashboardUi.validatedArticle}
              </Button>
              <Button type="button" variant="outline" className="rounded-full" onClick={() => setArticleForm(emptyArticleForm)}>
                {dashboardUi.createArticle}
              </Button>
              {articleForm.id ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  onClick={() => handleDeleteArticle(articleForm.id)}
                  disabled={articleDeletingId === articleForm.id}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {articleDeletingId === articleForm.id ? dashboardUi.delete + "..." : dashboardUi.delete}
                </Button>
              ) : null}
            </div>
            <Button type="button" className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600" onClick={handleSaveArticle} disabled={articleSaving || pdfUploading || !articleForm.title.trim() || (!articleForm.text.trim() && !articleForm.pdfUrl && !pdfFile)}>
              <Save className="mr-2 h-4 w-4" /> {articleSaving ? dashboardUi.saveArticle + "..." : dashboardUi.saveArticle}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[2rem] border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">{articleListTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {articles.length === 0 ? (
            <p className="text-sm text-slate-500">{emptyArticleListLabel}</p>
          ) : articles.map((article) => {
            const canEditArticle = !canModerateAllArticles || String(article.authorId || "").trim() === userId;

            return (
              <div key={article.id} className="rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900">{article.title}</span>
                      <Badge className={article.published === false ? "rounded-full bg-slate-200 text-slate-700" : "rounded-full bg-emerald-100 text-emerald-700"}>
                        {article.published === false ? dashboardUi.draft : dashboardUi.published}
                      </Badge>
                      {article.validated !== false ? (
                        <Badge className="rounded-full bg-sky-100 text-sky-700">{dashboardUi.validated}</Badge>
                      ) : null}
                      {article.category ? (
                        <Badge variant="outline" className="rounded-full">{article.category}</Badge>
                      ) : null}
                    </div>
                    <p className="text-sm leading-6 text-slate-600">{article.text || article.body}</p>
                    {article.pdfUrl ? (
                      <a href={article.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100">
                        <FileText className="h-3 w-3" />{dashboardUi.articlePdfBadge} — {article.pdfName || dashboardUi.articlePdfOpen}
                      </a>
                    ) : null}
                    {article.authorName || article.authorSpecialty ? (
                      <div className="text-xs text-slate-500">
                        {dashboardUi.createdBy} {article.authorName || article.authorSpecialty || "-"}
                        {article.authorName && article.authorSpecialty ? ` • ${article.authorSpecialty}` : ""}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canEditArticle ? (
                      <Button type="button" variant="outline" className="rounded-xl" onClick={() => { setPdfFile(null); setArticleForm({
                        id: article.id,
                        title: article.title || "",
                        text: article.text || article.body || "",
                        category: article.category || "",
                        published: article.published !== false,
                        validated: article.validated !== false,
                        pdfUrl: article.pdfUrl || "",
                        pdfName: article.pdfName || "",
                      }); }}>
                        {dashboardUi.edit}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => handleDeleteArticle(article.id)}
                      disabled={articleDeletingId === article.id}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {articleDeletingId === article.id ? dashboardUi.delete + "..." : dashboardUi.delete}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Video className="h-4 w-4 text-emerald-600" /> {dashboardUi.videosTitle}
          </CardTitle>
          <CardDescription>{dashboardUi.videosDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input value={videoForm.title} onChange={(event) => setVideoForm((prev) => ({ ...prev, title: event.target.value }))} placeholder={dashboardUi.videoItemTitle} className="rounded-xl" />
          <Input value={videoForm.category} onChange={(event) => setVideoForm((prev) => ({ ...prev, category: event.target.value }))} placeholder={dashboardUi.videoItemCategory} className="rounded-xl" />
          <Input value={videoForm.url} onChange={(event) => setVideoForm((prev) => ({ ...prev, url: event.target.value }))} placeholder={dashboardUi.videoItemUrl} className="rounded-xl" />
          <Textarea value={videoForm.description} onChange={(event) => setVideoForm((prev) => ({ ...prev, description: event.target.value }))} placeholder={dashboardUi.videoItemDescription} className="min-h-[180px] rounded-xl" />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant={videoForm.published ? "default" : "outline"} className="rounded-full" onClick={() => setVideoForm((prev) => ({ ...prev, published: !prev.published }))}>
              {dashboardUi.publishVideo}
            </Button>
            <Button type="button" variant={videoForm.validated ? "default" : "outline"} className="rounded-full" onClick={() => setVideoForm((prev) => ({ ...prev, validated: !prev.validated }))}>
              {dashboardUi.validatedVideo}
            </Button>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setVideoForm(emptyVideoForm)}>
              {dashboardUi.createVideo}
            </Button>
          </div>
          <Button type="button" className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600" onClick={handleSaveVideo} disabled={videoSaving || !videoForm.title.trim() || !videoForm.url.trim()}>
            <Save className="mr-2 h-4 w-4" /> {videoSaving ? dashboardUi.saveVideo + "..." : dashboardUi.saveVideo}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">{dashboardUi.myVideos}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {videos.length === 0 ? (
            <p className="text-sm text-slate-500">{dashboardUi.noVideos}</p>
          ) : videos.map((video) => (
            <div key={video.id} className="rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">{video.title}</span>
                    <Badge className={video.published === false ? "rounded-full bg-slate-200 text-slate-700" : "rounded-full bg-emerald-100 text-emerald-700"}>
                      {video.published === false ? dashboardUi.draft : dashboardUi.published}
                    </Badge>
                    {video.validated !== false ? (
                      <Badge className="rounded-full bg-sky-100 text-sky-700">{dashboardUi.validated}</Badge>
                    ) : null}
                    {video.category ? (
                      <Badge variant="outline" className="rounded-full">{video.category}</Badge>
                    ) : null}
                  </div>
                  {video.description ? (
                    <p className="text-sm leading-6 text-slate-600">{video.description}</p>
                  ) : null}
                  <button type="button" className="text-sm font-medium text-emerald-700 underline underline-offset-4" onClick={() => window.open(video.url, "_blank", "noreferrer")}>
                    {dashboardUi.openVideo}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => setVideoForm({
                    id: video.id,
                    title: video.title || "",
                    url: video.url || "",
                    description: video.description || "",
                    category: video.category || "",
                    published: video.published !== false,
                    validated: video.validated !== false,
                  })}>
                    {dashboardUi.edit}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => handleDeleteVideo(video.id)}
                    disabled={videoDeletingId === video.id}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {videoDeletingId === video.id ? dashboardUi.delete + "..." : dashboardUi.delete}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="rounded-[2rem] border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="h-4 w-4 text-emerald-600" /> {dashboardUi.questionsTitle}
          </CardTitle>
          <CardDescription>{dashboardUi.questionsDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {questions.length === 0 ? (
            <p className="text-sm text-slate-500">{dashboardUi.noQuestions}</p>
          ) : questions.map((q) => (
            <div key={q.id} className="rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-slate-900">{q.title || "—"}</span>
                {q.createdAt?.toDate ? (
                  <span className="text-xs text-slate-400">{q.createdAt.toDate().toLocaleDateString()}</span>
                ) : null}
              </div>
              <p className="text-sm leading-6 text-slate-700">{q.question || q.body || "—"}</p>
              {q.authorName ? (
                <div className="text-xs text-slate-400">{dashboardUi.questionFrom} : {q.authorName}</div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarCheck className="h-4 w-4 text-indigo-600" /> {dashboardUi.appointmentsTitle}
          </CardTitle>
          <CardDescription>{dashboardUi.appointmentsDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {appointments.length === 0 ? (
            <p className="text-sm text-slate-500">{dashboardUi.noAppointments}</p>
          ) : appointments.map((appt) => {
            const isPending = appt.status === "pending";
            const isConfirmed = appt.status === "confirmed";
            const isActing = appointmentActionId === appt.id;
            const statusBadgeClass = isPending
              ? "inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700"
              : isConfirmed
                ? "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
                : "inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-500";
            const statusLabel = isPending
              ? dashboardUi.appointmentPending
              : isConfirmed
                ? dashboardUi.appointmentConfirmed
                : dashboardUi.appointmentRejected;

            return (
              <div key={appt.id} className="rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{appt.patientName || "—"}</span>
                    <span className={statusBadgeClass}>{statusLabel}</span>
                  </div>
                  {appt.createdAt?.toDate ? (
                    <span className="text-xs text-slate-400">{appt.createdAt.toDate().toLocaleDateString()}</span>
                  ) : null}
                </div>
                <div className="grid gap-1 text-sm text-slate-600">
                  {appt.preferredDate ? (
                    <div><span className="font-medium text-slate-700">{dashboardUi.appointmentDate} :</span> {appt.preferredDate}{appt.preferredTime ? ` — ${appt.preferredTime}` : ""}</div>
                  ) : null}
                  {appt.motif ? (
                    <div><span className="font-medium text-slate-700">{dashboardUi.appointmentMotif} :</span> {appt.motif}</div>
                  ) : null}
                </div>
                {isConfirmed && appt.meetingUrl ? (
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-sm"
                    onClick={() => setActiveJitsiUrl(appt.meetingUrl)}
                  >
                    <Video className="mr-1.5 h-3.5 w-3.5" />
                    {dashboardUi.appointmentJoin}
                  </Button>
                ) : null}
                {isPending ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-sm"
                      onClick={() => handleConfirmAppointment(appt.id)}
                      disabled={isActing}
                    >
                      <CalendarCheck className="mr-1.5 h-3.5 w-3.5" />
                      {isActing ? dashboardUi.appointmentConfirming : dashboardUi.appointmentConfirm}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50"
                      onClick={() => handleRejectAppointment(appt.id)}
                      disabled={isActing}
                    >
                      {dashboardUi.appointmentReject}
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

export default DoctorDashboardPage;
