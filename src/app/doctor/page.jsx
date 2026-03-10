"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getDoctorArticles, submitDoctorQuestion } from "@/lib/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, ShieldCheck, Send, AlertTriangle } from "lucide-react";

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

export default function DoctorPage() {
  const { user, userProfile } = useAuth();
  const { t } = useLanguage();
  const [articles, setArticles] = useState(getDefaultTips(t));
  const [questionTitle, setQuestionTitle] = useState("");
  const [questionBody, setQuestionBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getDoctorArticles();
        if (data.length > 0) setArticles(data);
      } catch (err) {
        console.error("Error loading articles:", err);
      }
    }
    load();
  }, []);

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
