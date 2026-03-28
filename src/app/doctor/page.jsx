"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getDoctorArticles, getDoctorProfiles, submitDoctorQuestion } from "@/lib/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, ShieldCheck, Send, AlertTriangle, ArrowRight, MapPin } from "lucide-react";

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

const DOCTOR_BOOTSTRAP_TIMEOUT_MS = 12000;

function createDoctorTimeoutError(code = "doctor_bootstrap_timeout") {
  const error = new Error(code);
  error.code = code;
  return error;
}

function withDoctorTimeout(promise, timeoutMs = DOCTOR_BOOTSTRAP_TIMEOUT_MS, timeoutCode = "doctor_bootstrap_timeout") {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(createDoctorTimeoutError(timeoutCode));
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

export default function DoctorPage() {
  const { user, userProfile, canManageDoctorContent } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [articles, setArticles] = useState(getDefaultTips(t));
  const [doctorProfiles, setDoctorProfiles] = useState([]);
  const [questionTitle, setQuestionTitle] = useState("");
  const [questionBody, setQuestionBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [loadError, setLoadError] = useState("");
  const doctorUi = language === "ht"
    ? {
        expertsTitle: "Pratikan verifye",
        expertsDesc: "Dekouvri pwofil medsen ki gen dwa mete ajou espas sante Lakou Manman an.",
        experienceLabel: "Eksperyans",
        bookLabel: "Pran randevou",
        videoLabel: "Videyo prezantasyon",
        watchVideoLabel: "Gade videyo a",
        dashboardLabel: "Louvri dashboard medsen an",
      }
    : {
        expertsTitle: "Praticiens vérifiés",
        expertsDesc: "Découvrez les profils médecins autorisés à mettre à jour l'espace santé Lakou Manman.",
        experienceLabel: "Expérience",
        bookLabel: "Prendre rendez-vous",
        videoLabel: "Vidéo de présentation",
        watchVideoLabel: "Voir la vidéo",
        dashboardLabel: "Ouvrir le dashboard médecin",
      };
  const loadErrorLabel = language === "ht"
    ? "Nou pa t ka chaje espas medsen an kounye a."
    : "L'espace médecin n'a pas pu être chargé pour le moment.";
  const loadTimeoutLabel = language === "ht"
    ? "Chajman espas medsen an pran twòp tan. Verifye koneksyon an epi eseye ankò."
    : "Le chargement de l'espace médecin a dépassé le délai prévu. Vérifiez la connexion puis réessayez.";

  useEffect(() => {
    setArticles(getDefaultTips(t));
  }, [t]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadError("");
      try {
        const [articleData, profileData] = await withDoctorTimeout(
          Promise.all([
            getDoctorArticles({ publishedOnly: true }),
            getDoctorProfiles({ publishedOnly: true }),
          ]),
          DOCTOR_BOOTSTRAP_TIMEOUT_MS,
          "doctor_bootstrap_timeout"
        );

        if (cancelled) {
          return;
        }

        if (articleData.length > 0) {
          setArticles(articleData);
        }
        setDoctorProfiles(profileData);
      } catch (err) {
        console.error("Error loading articles:", err);
        if (cancelled) {
          return;
        }

        setArticles(getDefaultTips(t));
        setDoctorProfiles([]);
        setLoadError(err?.code === "doctor_bootstrap_timeout" ? loadTimeoutLabel : loadErrorLabel);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [loadErrorLabel, loadTimeoutLabel, t]);

  async function handleSubmitQuestion(e) {
    e.preventDefault();
    if (!user || !questionTitle.trim() || !questionBody.trim()) return;
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
      setTimeout(() => setSent(false), 4000);
    } catch (err) {
      console.error("Submit question error:", err);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      {loadError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {loadError}
        </div>
      ) : null}

      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-200">
          <Stethoscope className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{t("doctorTitle")}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {t("doctorDesc")}
          </p>
        </div>
      </div>

      {canManageDoctorContent ? (
        <div className="flex justify-end">
          <Button className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 shadow-sm shadow-emerald-200" onClick={() => router.push("/doctor-dashboard")}>
            {doctorUi.dashboardLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ) : null}

      {doctorProfiles.length > 0 ? (
        <Card className="rounded-[2rem] border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{doctorUi.expertsTitle}</CardTitle>
            <CardDescription>{doctorUi.expertsDesc}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {doctorProfiles.map((profile) => (
              <div key={profile.id} className="rounded-[1.75rem] border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/60 to-teal-50/70 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{profile.displayName}</h3>
                    <p className="mt-1 text-sm font-medium text-emerald-700">{profile.specialty}</p>
                  </div>
                  {profile.featured ? (
                    <Badge className="rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      <ShieldCheck className="mr-1 h-3 w-3" /> {t("validated")}
                    </Badge>
                  ) : null}
                </div>

                {profile.headline ? (
                  <p className="mt-3 text-sm text-slate-600">{profile.headline}</p>
                ) : null}

                <div className="mt-4 space-y-2 text-sm text-slate-500">
                  {(profile.city || profile.country) ? (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-emerald-600" />
                      <span>{[profile.city, profile.country].filter(Boolean).join(", ")}</span>
                    </div>
                  ) : null}
                  {profile.yearsOfExperience ? (
                    <div>{doctorUi.experienceLabel}: {profile.yearsOfExperience}</div>
                  ) : null}
                  {Array.isArray(profile.languages) && profile.languages.length > 0 ? (
                    <div>{profile.languages.join(" • ")}</div>
                  ) : null}
                </div>

                {profile.bio ? (
                  <p className="mt-4 line-clamp-4 text-sm leading-6 text-slate-600">{profile.bio}</p>
                ) : null}

                {profile.videoUrl ? (
                  <div className="mt-4 rounded-2xl border border-emerald-100 bg-white/80 p-3 text-sm text-slate-600">
                    <div className="font-medium text-slate-900">{profile.videoTitle || doctorUi.videoLabel}</div>
                    <a
                      href={profile.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center text-sm font-medium text-emerald-700 transition hover:text-emerald-800"
                    >
                      {doctorUi.watchVideoLabel}
                    </a>
                  </div>
                ) : null}

                {profile.bookingUrl ? (
                  <a
                    href={profile.bookingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                  >
                    {doctorUi.bookLabel}
                  </a>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_.9fr]">
        {/* Articles */}
        <Card className="rounded-[2rem] border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t("pediatricAdvice")}</CardTitle>
            <CardDescription>{t("pediatricAdviceDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {articles.map((article) => (
              <div key={article.id} className="rounded-2xl border bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{article.title}</span>
                  {article.validated && (
                    <Badge className="rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      <ShieldCheck className="mr-1 h-3 w-3" /> {t("validated")}
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{article.text}</p>
              </div>
            ))}

            <div className="flex items-start gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {t("importantNote")}: {t("medicalDisclaimer")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Ask a question */}
        <Card className="rounded-[2rem] border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t("askPediatrician")}</CardTitle>
            <CardDescription>
              {t("askPediatricianDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!user ? (
              <p className="text-sm text-slate-600">{t("connectToAsk")}</p>
            ) : (
              <form onSubmit={handleSubmitQuestion} className="space-y-3">
                {sent && (
                  <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
                    {t("questionSent")}
                  </div>
                )}
                <Input
                  placeholder={t("questionTopic")}
                  value={questionTitle}
                  onChange={(e) => setQuestionTitle(e.target.value)}
                  className="rounded-xl"
                />
                <Textarea
                  placeholder={t("writeQuestion")}
                  value={questionBody}
                  onChange={(e) => setQuestionBody(e.target.value)}
                  className="min-h-[160px] rounded-xl"
                />
                <Button
                  type="submit"
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 shadow-sm shadow-emerald-200 transition-all hover:shadow-md hover:shadow-emerald-300"
                  disabled={sending || !questionTitle.trim() || !questionBody.trim()}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {sending ? t("sending") + "..." : t("sendQuestion")}
                </Button>
                <p className="text-xs leading-5 text-slate-500">
                  {t("emergencyNote")}
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
