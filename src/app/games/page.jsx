"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Brain, CheckCircle2, Gamepad2, Heart, RotateCcw, Sparkles, Trophy, XCircle } from "lucide-react";

const MEMORY_EMOJIS = ["🍼", "🧸", "🌸", "⭐"];

function shuffleCards(cards) {
  return [...cards].sort(() => Math.random() - 0.5);
}

function buildMemoryDeck() {
  return shuffleCards(
    MEMORY_EMOJIS.flatMap((emoji, index) => [
      { id: `${index}-a`, pairId: index, emoji, revealed: false, matched: false },
      { id: `${index}-b`, pairId: index, emoji, revealed: false, matched: false },
    ])
  );
}

export default function GamesPage() {
  const { t } = useLanguage();
  const [memoryCards, setMemoryCards] = useState(() => buildMemoryDeck());
  const [selectedCards, setSelectedCards] = useState([]);
  const [memoryMoves, setMemoryMoves] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const emotionScenarios = [
    {
      prompt: t("gamesEmotionScenarioOne"),
      correctEmotion: "sad",
      tip: t("gamesEmotionTipOne"),
    },
    {
      prompt: t("gamesEmotionScenarioTwo"),
      correctEmotion: "tired",
      tip: t("gamesEmotionTipTwo"),
    },
    {
      prompt: t("gamesEmotionScenarioThree"),
      correctEmotion: "frustrated",
      tip: t("gamesEmotionTipThree"),
    },
    {
      prompt: t("gamesEmotionScenarioFour"),
      correctEmotion: "joy",
      tip: t("gamesEmotionTipFour"),
    },
  ];
  const emotionOptions = [
    { id: "joy", emoji: "😊", label: t("gamesEmotionOptionJoy") },
    { id: "tired", emoji: "😴", label: t("gamesEmotionOptionTired") },
    { id: "frustrated", emoji: "😣", label: t("gamesEmotionOptionFrustrated") },
    { id: "sad", emoji: "😢", label: t("gamesEmotionOptionSad") },
  ];
  const [emotionIndex, setEmotionIndex] = useState(0);
  const [emotionScore, setEmotionScore] = useState(0);
  const [selectedEmotion, setSelectedEmotion] = useState(null);
  const [emotionFeedback, setEmotionFeedback] = useState("idle");
  const [emotionCompleted, setEmotionCompleted] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selectedQuizOption, setSelectedQuizOption] = useState(null);
  const [quizFeedback, setQuizFeedback] = useState("idle");
  const [quizCompleted, setQuizCompleted] = useState(false);

  const quizQuestions = [
    {
      prompt: t("gamesQuizQuestionOne"),
      options: [
        t("gamesQuizQuestionOneOptionOne"),
        t("gamesQuizQuestionOneOptionTwo"),
        t("gamesQuizQuestionOneOptionThree"),
      ],
      correctIndex: 0,
    },
    {
      prompt: t("gamesQuizQuestionTwo"),
      options: [
        t("gamesQuizQuestionTwoOptionOne"),
        t("gamesQuizQuestionTwoOptionTwo"),
        t("gamesQuizQuestionTwoOptionThree"),
      ],
      correctIndex: 0,
    },
    {
      prompt: t("gamesQuizQuestionThree"),
      options: [
        t("gamesQuizQuestionThreeOptionOne"),
        t("gamesQuizQuestionThreeOptionTwo"),
        t("gamesQuizQuestionThreeOptionThree"),
      ],
      correctIndex: 0,
    },
  ];

  const currentEmotion = emotionScenarios[emotionIndex];
  const currentQuiz = quizQuestions[quizIndex];
  const matchedPairs = memoryCards.filter((card) => card.matched).length / 2;
  const allPairsFound = matchedPairs === MEMORY_EMOJIS.length;
  const emotionMessage =
    emotionFeedback === "correct"
      ? t("gamesEmotionCorrect")
      : emotionFeedback === "wrong"
        ? t("gamesEmotionWrong")
        : emotionCompleted
          ? t("gamesEmotionCompleted")
          : currentEmotion?.tip;

  function resetMemoryGame() {
    setMemoryCards(buildMemoryDeck());
    setSelectedCards([]);
    setMemoryMoves(0);
    setIsChecking(false);
  }

  function resetEmotionGame() {
    setEmotionIndex(0);
    setEmotionScore(0);
    setSelectedEmotion(null);
    setEmotionFeedback("idle");
    setEmotionCompleted(false);
  }

  function resetQuizGame() {
    setQuizIndex(0);
    setQuizScore(0);
    setSelectedQuizOption(null);
    setQuizFeedback("idle");
    setQuizCompleted(false);
  }

  function handleCardClick(card) {
    if (isChecking || card.matched || card.revealed || selectedCards.length === 2) {
      return;
    }

    const nextSelected = [...selectedCards, card.id];
    const nextCards = memoryCards.map((item) => (item.id === card.id ? { ...item, revealed: true } : item));

    setMemoryCards(nextCards);
    setSelectedCards(nextSelected);

    if (nextSelected.length !== 2) {
      return;
    }

    setIsChecking(true);
    setMemoryMoves((prev) => prev + 1);

    const firstCard = nextCards.find((item) => item.id === nextSelected[0]);
    const secondCard = nextCards.find((item) => item.id === nextSelected[1]);
    const isMatch = firstCard && secondCard && firstCard.pairId === secondCard.pairId;

    window.setTimeout(() => {
      setMemoryCards((currentCards) =>
        currentCards.map((item) => {
          if (item.id !== nextSelected[0] && item.id !== nextSelected[1]) {
            return item;
          }

          if (isMatch) {
            return { ...item, matched: true, revealed: true };
          }

          return { ...item, revealed: false };
        })
      );
      setSelectedCards([]);
      setIsChecking(false);
    }, 650);
  }

  function handleEmotionAnswer(emotionId) {
    if (selectedEmotion !== null || emotionCompleted) {
      return;
    }

    const isCorrect = emotionId === currentEmotion.correctEmotion;
    setSelectedEmotion(emotionId);
    setEmotionFeedback(isCorrect ? "correct" : "wrong");

    if (isCorrect) {
      setEmotionScore((prev) => prev + 1);
    }
  }

  function handleNextEmotionCard() {
    if (emotionIndex === emotionScenarios.length - 1) {
      setEmotionCompleted(true);
      return;
    }

    setEmotionIndex((prev) => prev + 1);
    setSelectedEmotion(null);
    setEmotionFeedback("idle");
  }

  function handleQuizAnswer(optionIndex) {
    if (selectedQuizOption !== null || quizCompleted) {
      return;
    }

    const isCorrect = optionIndex === currentQuiz.correctIndex;
    setSelectedQuizOption(optionIndex);
    setQuizFeedback(isCorrect ? "correct" : "wrong");

    if (isCorrect) {
      setQuizScore((prev) => prev + 1);
    }
  }

  function handleNextQuizStep() {
    if (quizIndex === quizQuestions.length - 1) {
      setQuizCompleted(true);
      return;
    }

    setQuizIndex((prev) => prev + 1);
    setSelectedQuizOption(null);
    setQuizFeedback("idle");
  }

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden rounded-[2.5rem] border-0 shadow-lg">
        <div className="relative overflow-hidden bg-gradient-to-br from-rose-500 via-fuchsia-500 to-violet-600 p-8 text-white md:p-10">
          <div className="absolute inset-0 opacity-25">
            <div className="absolute -left-16 top-4 h-40 w-40 rounded-full bg-white blur-3xl" />
            <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-pink-200 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-violet-200 blur-3xl" />
          </div>
          <div className="relative grid gap-8 lg:grid-cols-[1.5fr,1fr] lg:items-end">
            <div>
              <Badge className="rounded-full bg-white/15 px-4 py-1.5 text-white hover:bg-white/15">
                <Gamepad2 className="mr-2 h-3.5 w-3.5" />
                {t("gamesHeroBadge")}
              </Badge>
              <h1 className="mt-4 max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {t("gamesTitle")}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/90 sm:text-base">
                {t("gamesDesc")}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="#memory-game" className="inline-flex items-center rounded-2xl bg-white px-5 py-2.5 text-sm font-medium text-[#9B2335] shadow-sm transition-transform hover:scale-[1.02]">
                  {t("gamesMemoryTitle")}
                </a>
                <a href="#emotion-game" className="inline-flex items-center rounded-2xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15">
                  {t("gamesEmotionTitle")}
                </a>
                <a href="#quiz-game" className="inline-flex items-center rounded-2xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15">
                  {t("gamesQuizTitle")}
                </a>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.75rem] bg-white/12 p-4 backdrop-blur-sm">
                <div className="text-xs uppercase tracking-[0.2em] text-white/70">{t("gamesStatsAvailable")}</div>
                <div className="mt-2 text-3xl font-bold">3</div>
              </div>
              <div className="rounded-[1.75rem] bg-white/12 p-4 backdrop-blur-sm">
                <div className="text-xs uppercase tracking-[0.2em] text-white/70">{t("gamesStatsMemory")}</div>
                <div className="mt-2 text-3xl font-bold">{matchedPairs}/{MEMORY_EMOJIS.length}</div>
              </div>
              <div className="rounded-[1.75rem] bg-white/12 p-4 backdrop-blur-sm">
                <div className="text-xs uppercase tracking-[0.2em] text-white/70">{t("gamesStatsEmotion")}</div>
                <div className="mt-2 text-3xl font-bold">
                  {emotionCompleted ? emotionScenarios.length : emotionIndex + (selectedEmotion !== null ? 1 : 0)}/{emotionScenarios.length}
                </div>
              </div>
              <div className="rounded-[1.75rem] bg-white/12 p-4 backdrop-blur-sm">
                <div className="text-xs uppercase tracking-[0.2em] text-white/70">{t("gamesStatsQuiz")}</div>
                <div className="mt-2 text-3xl font-bold">{quizScore}/{quizQuestions.length}</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <Card id="memory-game" className="rounded-[2rem] border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Brain className="h-5 w-5 text-violet-600" />
                  {t("gamesMemoryTitle")}
                </CardTitle>
                <CardDescription>{t("gamesMemoryDesc")}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge className="rounded-full bg-violet-50 text-violet-700 hover:bg-violet-50">
                  {t("gamesMemoryPairs")} {matchedPairs}/{MEMORY_EMOJIS.length}
                </Badge>
                <Badge variant="outline" className="rounded-full">
                  {t("gamesMemoryMoves")} {memoryMoves}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-4 gap-3">
              {memoryCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleCardClick(card)}
                  disabled={isChecking}
                  aria-label={card.revealed || card.matched ? card.emoji : t("gamesMemoryTitle")}
                  className={`flex aspect-square items-center justify-center rounded-[1.4rem] border text-2xl transition-all ${
                    card.revealed || card.matched
                      ? "border-violet-100 bg-white shadow-sm ring-2 ring-violet-100"
                      : "border-transparent bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md hover:scale-[1.03] hover:shadow-lg"
                  } ${isChecking ? "cursor-wait" : ""}`}
                >
                  {card.revealed || card.matched ? card.emoji : "?"}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="rounded-2xl bg-violet-50 px-4 py-3 text-sm text-violet-700">
                {allPairsFound ? t("gamesMemoryWin") : t("gamesFamilyDesc")}
              </div>
              <Button type="button" variant="outline" className="rounded-2xl" onClick={resetMemoryGame}>
                <RotateCcw className="mr-2 h-4 w-4" />
                {t("gamesReset")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card id="emotion-game" className="rounded-[2rem] border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle2 className="h-5 w-5 text-rose-600" />
                  {t("gamesEmotionTitle")}
                </CardTitle>
                <CardDescription>{t("gamesEmotionDesc")}</CardDescription>
              </div>
              <Badge className="rounded-full bg-rose-50 text-rose-700 hover:bg-rose-50">
                {t("gamesEmotionScore")} {emotionScore}/{emotionScenarios.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>{t("gamesEmotionProgress")}</span>
                <span>{emotionCompleted ? emotionScenarios.length : emotionIndex + 1}/{emotionScenarios.length}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-400 to-fuchsia-500 transition-all"
                  style={{ width: `${((emotionCompleted ? emotionScenarios.length : emotionIndex + 1) / emotionScenarios.length) * 100}%` }}
                />
              </div>
            </div>
            {emotionCompleted ? (
              <div className="rounded-[1.75rem] bg-gradient-to-br from-emerald-50 to-teal-50 p-6">
                <div className="flex items-center gap-3 text-emerald-700">
                  <Trophy className="h-6 w-6" />
                  <div className="text-lg font-semibold">{t("gamesEmotionCompleted")}</div>
                </div>
                <p className="mt-3 text-sm leading-7 text-emerald-800">
                  {t("gamesEmotionScore")} : {emotionScore}/{emotionScenarios.length}
                </p>
                <Button type="button" className="mt-4 rounded-2xl" onClick={resetEmotionGame}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t("gamesEmotionPlayAgain")}
                </Button>
              </div>
            ) : (
              <>
                <div className="rounded-[1.75rem] bg-slate-50 p-5">
                  <p className="text-base font-medium leading-7 text-slate-900">{currentEmotion.prompt}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {emotionOptions.map((option) => {
                    const isSelected = selectedEmotion === option.id;
                    const isCorrect = option.id === currentEmotion.correctEmotion;
                    const stateClass =
                      selectedEmotion === null
                        ? "border-slate-200 bg-white hover:border-rose-200 hover:bg-rose-50"
                        : isCorrect
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : isSelected
                            ? "border-red-200 bg-red-50 text-red-700"
                            : "border-slate-200 bg-slate-50 text-slate-400";

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleEmotionAnswer(option.id)}
                        disabled={selectedEmotion !== null}
                        className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-all ${stateClass}`}
                      >
                        <span className="flex items-center gap-3">
                          <span className="text-xl">{option.emoji}</span>
                          <span>{option.label}</span>
                        </span>
                        {selectedEmotion !== null && isCorrect ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : isSelected && !isCorrect ? (
                          <XCircle className="h-4 w-4" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <div className={`rounded-2xl px-4 py-3 text-sm ${emotionFeedback === "correct" ? "bg-emerald-50 text-emerald-700" : emotionFeedback === "wrong" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>
                  <span className="font-medium">{t("gamesEmotionTipLabel")} :</span> {emotionMessage}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    className="rounded-2xl"
                    disabled={selectedEmotion === null}
                    onClick={handleNextEmotionCard}
                  >
                    {t("gamesEmotionNext")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" className="rounded-2xl" onClick={resetEmotionGame}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {t("gamesEmotionPlayAgain")}
                  </Button>
                </div>
              </>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t("gamesEmotionProgress")}</div>
                <div className="mt-1 text-2xl font-semibold text-slate-800">
                  {emotionCompleted ? emotionScenarios.length : emotionIndex + 1}/{emotionScenarios.length}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">{t("gamesEmotionScore")}</div>
                <div className="mt-1 text-2xl font-semibold text-slate-800">{emotionScore}/{emotionScenarios.length}</div>
              </div>
            </div>
            <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <div className="flex items-center justify-between gap-3">
                <span>{t("gamesEmotionTipLabel")}</span>
                <Button type="button" variant="outline" className="rounded-2xl" onClick={resetEmotionGame}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t("gamesEmotionPlayAgain")}
                </Button>
              </div>
              <p className="mt-3 leading-7">{currentEmotion.tip}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
        <Card id="quiz-game" className="rounded-[2rem] border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  {t("gamesQuizTitle")}
                </CardTitle>
                <CardDescription>{t("gamesQuizDesc")}</CardDescription>
              </div>
              <Badge className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">
                {t("gamesQuizScore")} {quizScore}/{quizQuestions.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>{t("gamesQuizProgress")}</span>
                <span>{quizCompleted ? quizQuestions.length : quizIndex + 1}/{quizQuestions.length}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all"
                  style={{ width: `${((quizCompleted ? quizQuestions.length : quizIndex + 1) / quizQuestions.length) * 100}%` }}
                />
              </div>
            </div>

            {quizCompleted ? (
              <div className="rounded-[1.75rem] bg-gradient-to-br from-emerald-50 to-teal-50 p-6">
                <div className="flex items-center gap-3 text-emerald-700">
                  <Trophy className="h-6 w-6" />
                  <div className="text-lg font-semibold">{t("gamesQuizCompleted")}</div>
                </div>
                <p className="mt-3 text-sm leading-7 text-emerald-800">
                  {t("gamesQuizScore")} : {quizScore}/{quizQuestions.length}
                </p>
                <Button type="button" className="mt-4 rounded-2xl" onClick={resetQuizGame}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t("gamesQuizPlayAgain")}
                </Button>
              </div>
            ) : (
              <>
                <div className="rounded-[1.75rem] bg-slate-50 p-5">
                  <p className="text-base font-medium leading-7 text-slate-900">{currentQuiz.prompt}</p>
                </div>

                <div className="grid gap-3">
                  {currentQuiz.options.map((option, index) => {
                    const isSelected = selectedQuizOption === index;
                    const isCorrect = index === currentQuiz.correctIndex;
                    const stateClass =
                      selectedQuizOption === null
                        ? "border-slate-200 bg-white hover:border-rose-200 hover:bg-rose-50"
                        : isCorrect
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : isSelected
                            ? "border-red-200 bg-red-50 text-red-700"
                            : "border-slate-200 bg-slate-50 text-slate-400";

                    return (
                      <button
                        key={`${quizIndex}-${index}`}
                        type="button"
                        onClick={() => handleQuizAnswer(index)}
                        disabled={selectedQuizOption !== null}
                        className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-all ${stateClass}`}
                      >
                        <span>{option}</span>
                        {selectedQuizOption !== null && isCorrect ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : isSelected && !isCorrect ? (
                          <XCircle className="h-4 w-4" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                {selectedQuizOption !== null && (
                  <div className={`rounded-2xl px-4 py-3 text-sm ${quizFeedback === "correct" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {quizFeedback === "correct" ? t("gamesQuizCorrect") : t("gamesQuizWrong")}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    className="rounded-2xl"
                    disabled={selectedQuizOption === null}
                    onClick={handleNextQuizStep}
                  >
                    {quizIndex === quizQuestions.length - 1 ? t("gamesQuizFinish") : t("gamesQuizNext")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" className="rounded-2xl" onClick={resetQuizGame}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {t("gamesQuizPlayAgain")}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[2rem] border-0 shadow-sm">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <Heart className="h-6 w-6 text-rose-300" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{t("gamesCornerTitle")}</h2>
                <p className="mt-1 text-sm text-white/75">{t("gamesCornerDesc")}</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {[t("gamesCornerTipOne"), t("gamesCornerTipTwo"), t("gamesCornerTipThree")].map((tip, index) => (
                <div key={index} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/90">
                  {tip}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[1.75rem] bg-white/10 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                  <Trophy className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-semibold">{t("gamesFamilyTitle")}</h3>
                  <p className="mt-2 text-sm leading-7 text-white/80">{t("gamesFamilyDesc")}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
