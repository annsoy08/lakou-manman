"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { saveQuizResult } from "@/lib/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle2 } from "lucide-react";

const getQuizQuestions = (t) => [
  {
    id: 1,
    q: t("quizQ1"),
    options: [t("quizQ1Opt1"), t("quizQ1Opt2"), t("quizQ1Opt3")],
  },
  {
    id: 2,
    q: t("quizQ2"),
    options: [t("quizQ2Opt1"), t("quizQ2Opt2"), t("quizQ2Opt3")],
  },
  {
    id: 3,
    q: t("quizQ3"),
    options: [t("quizQ3Opt1"), t("quizQ3Opt2"), t("quizQ3Opt3")],
  },
];

const getToolIdeas = (t) => [
  t("checklistBaby"),
  t("interactiveGuideNewMoms"),
  t("feedingSleepTracking"),
  t("babyDevelopmentCalendar"),
];

export default function ToolsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [answers, setAnswers] = useState({});
  const [quizDone, setQuizDone] = useState(false);
  
  const quizQuestions = getQuizQuestions(t);
  const toolIdeas = getToolIdeas(t);

  const quizResult = useMemo(() => {
    const vals = Object.values(answers);
    if (vals.length < quizQuestions.length) return null;
    const score = vals.reduce((acc, cur) => acc + cur, 0);
    if (score <= 3) {
      return {
        title: t("goodSleepBase"),
        text: t("goodSleepText"),
      };
    }
    if (score <= 5) {
      return {
        title: t("needsImprovement"),
        text: t("needsImprovementText"),
      };
    }
    return {
      title: t("needsWork"),
      text: t("needsWorkText"),
    };
  }, [answers, t]);

  async function handleFinishQuiz() {
    setQuizDone(true);
    if (user && quizResult) {
      try {
        await saveQuizResult(user.uid, "sleep-quiz", {
          answers,
          resultTitle: quizResult.title,
        });
      } catch (err) {
        console.error("Save quiz result error:", err);
      }
    }
  }

  function handleReset() {
    setAnswers({});
    setQuizDone(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-200">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{t("toolsTitle")}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {t("toolsDesc")}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_.9fr]">
        {/* Quiz */}
        <Card className="rounded-[2rem] border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t("sleepQuiz")}</CardTitle>
            <CardDescription>{t("sleepQuizDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {quizQuestions.map((item, index) => (
              <div key={item.id} className="space-y-3 rounded-2xl border p-4">
                <div className="font-medium">
                  {index + 1}. {item.q}
                </div>
                <div className="grid gap-2">
                  {item.options.map((opt, i) => (
                    <button
                      key={opt}
                      onClick={() => setAnswers({ ...answers, [item.id]: i + 1 })}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                        answers[item.id] === i + 1
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex gap-3">
              <Button
                className="rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 shadow-sm shadow-rose-200 transition-all hover:shadow-md hover:shadow-rose-300"
                onClick={handleFinishQuiz}
                disabled={Object.keys(answers).length < quizQuestions.length}
              >
                {t("seeMyResult")}
              </Button>
              <Button variant="outline" className="rounded-2xl" onClick={handleReset}>
                {t("reset")}
              </Button>
            </div>

            {quizDone && quizResult && (
              <div className="rounded-2xl bg-emerald-50 p-4">
                <div className="flex items-center gap-2 font-medium text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" /> {quizResult.title}
                </div>
                <p className="mt-2 text-sm leading-6 text-emerald-900/80">{quizResult.text}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tool ideas */}
        <div className="space-y-6">
          <Card className="rounded-[2rem] border-0 bg-gradient-to-br from-sky-50 to-blue-50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">{t("upcomingTools")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              {toolIdeas.map((idea) => (
                <div key={idea} className="rounded-2xl bg-white p-4">
                  {idea}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">{t("upcomingSteps")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p>{t("upcomingStep1")}</p>
              <p>{t("upcomingStep2")}</p>
              <p>{t("upcomingStep3")}</p>
              <p>{t("upcomingStep4")}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
