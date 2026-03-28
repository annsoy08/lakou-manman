"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getDiscoverableUsers, getGroups, joinGroup, updateUserProfile } from "@/lib/firestore";
import { getInitials } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Baby, CheckCircle2, HeartHandshake, MapPin, Sparkles, UserRound, Users } from "lucide-react";

const ONBOARDING_RECOMMENDATIONS_TIMEOUT_MS = 12000;
const ONBOARDING_SENSITIVE_GROUP_IDS = new Set(["deuil-perte"]);

function createOnboardingTimeoutError(code = "onboarding_recommendations_timeout") {
  const error = new Error(code);
  error.code = code;
  return error;
}

function withOnboardingTimeout(promise, timeoutMs = ONBOARDING_RECOMMENDATIONS_TIMEOUT_MS, timeoutCode = "onboarding_recommendations_timeout") {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(createOnboardingTimeoutError(timeoutCode));
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

function buildDefaultGroups(t) {
  return [
    { id: "nouveau-ne", name: t("groupNewborn"), description: t("groupNewbornDesc"), color: "bg-rose-50 text-rose-700" },
    { id: "enfants", name: t("groupChildren"), description: t("groupChildrenDesc"), color: "bg-emerald-50 text-emerald-700" },
    { id: "adolescents", name: t("groupTeens"), description: t("groupTeensDesc"), color: "bg-indigo-50 text-indigo-700" },
    { id: "post-partum", name: t("groupPostpartum"), description: t("groupPostpartumDesc"), color: "bg-pink-50 text-pink-700" },
    { id: "diaspora", name: t("groupDiaspora"), description: t("groupDiasporaDesc"), color: "bg-sky-50 text-sky-700" },
    { id: "alimentation", name: t("groupFeeding"), description: t("groupFeedingDesc"), color: "bg-emerald-50 text-emerald-700" },
    { id: "travay-fanmi", name: t("groupWorkFamily"), description: t("groupWorkFamilyDesc"), color: "bg-violet-50 text-violet-700" },
    { id: "deuil-perte", name: t("groupGriefLoss"), description: t("groupGriefLossDesc"), color: "bg-slate-50 text-slate-700" },
  ];
}

export default function OnboardingPage() {
  const { user, userProfile, loading: authLoading, refreshProfile } = useAuth();
  const { language, t } = useLanguage();
  const router = useRouter();
  const ui = language === "ht"
    ? {
        title: "Byen kòmanse sou Lakou Manman",
        description: "Ann prepare pwofil ou dousman epi montre w kominote ki ka itil ou, selon sa w vle pataje.",
        stepProfile: "Pwofil",
        stepInterests: "Enterè",
        stepSuggestions: "Rekòmandasyon",
        profileTitle: "Rakonte nou yon ti kras sou ou",
        profileDescription: "Detay sa yo ede nou pèsonalize eksperyans ou. Ou ka kite sa ki pa itil ou vid.",
        interestsTitle: "Ki sa ki enterese w kounye a?",
        interestsDescription: "Chwazi kèk sijè pou n pi byen pèsonalize eksperyans ou.",
        suggestionsTitle: "Men premye koneksyon nou sijere pou ou",
        suggestionsDescription: "Rejwenn gwoup ki ka itil ou epi swiv kèk moun ki sanble ak enterè ou.",
        yourName: "Non oswa ti non",
        locationMode: "Kote w ye",
        locationLocal: "Nan vil mwen",
        locationDiaspora: "Nan diaspora",
        cityLabel: "Vil",
        countryLabel: "Peyi",
        childAgeStageLabel: "Repè laj ki ka itil ou (opsyonèl)",
        childAgesLabel: "Plis detay si w vle (opsyonèl)",
        childAgesPlaceholder: "Eg: 6 mwa, 3 an, timoun, adolesan",
        contextOptionalHint: "Pataje sèlman sa ki ede nou pi byen adapte kontni an pou ou.",
        interestsLabel: "Enterè prensipal yo",
        next: "Kontinye",
        back: "Retounen",
        finish: "Fini onboarding lan",
        saving: "Ap anrejistre...",
        loading: "Ap prepare onboarding lan...",
        groupsSuggested: "Gwoup nou sijere",
        accountsSuggested: "Kont pou swiv",
        completeProfileHint: "Tanpri ranpli non ou ak zòn kote w ye a.",
        pickInterestHint: "Chwazi omwen yon enterè.",
        noGroups: "Pa gen gwoup sijere pou kounye a, men ou ka kontinye.",
        noMembers: "Pa gen kont sijere pou kounye a, men ou ka kontinye.",
        recommendationsLoadError: "Nou pa t ka chaje rekòmandasyon yo kounye a. Ou ka kontinye onboarding lan menm jan an.",
        followLabel: "Swiv",
        joinedLabel: "Rejwenn",
        selectedLabel: "Chwazi",
        nearbyLabel: "Toupre ou",
        diasporaLabel: "Diaspora",
        recommendedLabel: "Pou ou",
      }
    : {
        title: "Bien démarrer sur Lakou Manman",
        description: "Préparons votre profil en douceur et suggérons les communautés qui peuvent vous être utiles, selon ce que vous souhaitez partager.",
        stepProfile: "Profil",
        stepInterests: "Intérêts",
        stepSuggestions: "Suggestions",
        profileTitle: "Parlez-nous un peu de vous",
        profileDescription: "Ces informations nous aident à personnaliser votre expérience. Vous pouvez laisser vide ce qui ne vous concerne pas.",
        interestsTitle: "Qu'est-ce qui vous intéresse en ce moment ?",
        interestsDescription: "Choisissez quelques sujets pour personnaliser votre expérience.",
        suggestionsTitle: "Voici vos premières connexions recommandées",
        suggestionsDescription: "Rejoignez des groupes pertinents et suivez quelques personnes proches de vos centres d'intérêt.",
        yourName: "Nom ou pseudo",
        locationMode: "Votre localisation",
        locationLocal: "Dans ma ville",
        locationDiaspora: "Dans la diaspora",
        cityLabel: "Ville",
        countryLabel: "Pays",
        childAgeStageLabel: "Repères d'âge utiles (facultatif)",
        childAgesLabel: "Quelques précisions si vous le souhaitez (facultatif)",
        childAgesPlaceholder: "Ex: 6 mois, 3 ans, enfance, adolescence",
        contextOptionalHint: "Partagez uniquement ce qui peut nous aider à mieux adapter les contenus pour vous.",
        interestsLabel: "Centres d'intérêt",
        next: "Continuer",
        back: "Retour",
        finish: "Terminer l'onboarding",
        saving: "Enregistrement...",
        loading: "Préparation de l'onboarding...",
        groupsSuggested: "Groupes suggérés",
        accountsSuggested: "Comptes à suivre",
        completeProfileHint: "Merci de renseigner votre nom et votre zone.",
        pickInterestHint: "Choisissez au moins un centre d'intérêt.",
        noGroups: "Aucun groupe suggéré pour le moment, mais vous pouvez continuer.",
        noMembers: "Aucun compte suggéré pour le moment, mais vous pouvez continuer.",
        recommendationsLoadError: "Les recommandations n'ont pas pu être chargées pour le moment. Vous pouvez continuer l'onboarding normalement.",
        followLabel: "Suivre",
        joinedLabel: "Rejoindre",
        selectedLabel: "Sélectionné",
        nearbyLabel: "Près de vous",
        diasporaLabel: "Diaspora",
        recommendedLabel: "Pour vous",
      };

  const interestOptions = language === "ht"
    ? [
        "Somèy ak woutin",
        "Alimantasyon",
        "Post-partum",
        "Lasante ak devlopman",
        "Lekòl",
        "Travay ak fanmi",
        "Byennèt ak ekilib",
        "Diaspora",
      ]
    : [
        "Sommeil & routines",
        "Alimentation",
        "Post-partum",
        "Santé & développement",
        "École",
        "Travail & famille",
        "Bien-être & équilibre",
        "Diaspora",
      ];

  const ageStages = language === "ht"
    ? [
        { value: "newborn", label: "Nesans / nouvo fèt" },
        { value: "baby", label: "Tibebe / piti" },
        { value: "child", label: "Timoun" },
        { value: "teen", label: "Adolesans" },
        { value: "mixed", label: "Plizyè tranch laj" },
      ]
    : [
        { value: "newborn", label: "Naissance / nouveau-né" },
        { value: "baby", label: "Bébé / petite enfance" },
        { value: "child", label: "Enfant" },
        { value: "teen", label: "Adolescence" },
        { value: "mixed", label: "Plusieurs tranches d’âge" },
      ];

  const defaultGroups = useMemo(() => buildDefaultGroups(t), [t]);
  const [step, setStep] = useState(0);
  const [allGroups, setAllGroups] = useState(defaultGroups);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    locationMode: "local",
    city: "",
    country: "",
    childAges: "",
    childAgeStage: "",
    interests: [],
    selectedGroupIds: [],
    selectedAccountIds: [],
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    setForm({
      name: String(userProfile?.name || userProfile?.displayName || user?.displayName || "").trim(),
      locationMode: String(userProfile?.locationMode || "local").trim() || "local",
      city: userProfile?.city || "",
      country: userProfile?.country || "",
      childAges: userProfile?.childAges || "",
      childAgeStage: userProfile?.childAgeStage || "",
      interests: Array.isArray(userProfile?.interests) ? userProfile.interests : [],
      selectedGroupIds: Array.isArray(userProfile?.suggestedGroupIds) ? userProfile.suggestedGroupIds : [],
      selectedAccountIds: Array.isArray(userProfile?.followingIds) ? userProfile.followingIds : [],
    });
  }, [user, userProfile]);

  useEffect(() => {
    let isMounted = true;

    async function loadRecommendations() {
      if (!user) {
        return;
      }

      setLoadingData(true);
      setError("");
      try {
        const [groupsData, usersData] = await withOnboardingTimeout(
          Promise.all([getGroups(), getDiscoverableUsers({ excludeUserId: user.uid, limitCount: 120 })]),
          ONBOARDING_RECOMMENDATIONS_TIMEOUT_MS,
          "onboarding_recommendations_timeout"
        );
        if (!isMounted) {
          return;
        }

        const mergedGroups = new Map(defaultGroups.map((group) => [group.id, group]));
        groupsData.forEach((group) => {
          const existing = mergedGroups.get(group.id) || {};
          mergedGroups.set(group.id, {
            ...existing,
            ...group,
            name: group.name || existing.name,
            description: group.description || existing.description,
            color: group.color || existing.color,
          });
        });

        setAllGroups(Array.from(mergedGroups.values()));
        setAllUsers(usersData);
      } catch (loadError) {
        console.error("Onboarding load error:", loadError);
        if (isMounted) {
          setAllGroups(defaultGroups);
          setAllUsers([]);
          setError(ui.recommendationsLoadError);
        }
      } finally {
        if (isMounted) {
          setLoadingData(false);
        }
      }
    }

    loadRecommendations();

    return () => {
      isMounted = false;
    };
  }, [defaultGroups, ui.recommendationsLoadError, user]);

  const suggestedGroups = useMemo(() => {
    const selectedInterests = Array.isArray(form.interests) ? form.interests : [];
    const stageLabel = ageStages.find((item) => item.value === form.childAgeStage)?.label || "";

    return [...allGroups]
      .filter((group) => !ONBOARDING_SENSITIVE_GROUP_IDS.has(String(group.id || "").toLowerCase()))
      .map((group) => {
        const haystack = `${group.id || ""} ${group.name || ""} ${group.description || ""}`.toLowerCase();
        let score = 0;

        if (form.locationMode === "diaspora" && haystack.includes("diaspora")) {
          score += 4;
        }

        if (stageLabel && haystack.includes(stageLabel.toLowerCase())) {
          score += 3;
        }

        if (form.childAgeStage === "newborn" && (haystack.includes("nouveau") || haystack.includes("tibebe"))) {
          score += 2;
        }

        if (form.childAgeStage === "child" && haystack.includes("enfant")) {
          score += 2;
        }

        if (form.childAgeStage === "teen" && (haystack.includes("ado") || haystack.includes("adolescent"))) {
          score += 2;
        }

        selectedInterests.forEach((interest) => {
          if (haystack.includes(String(interest).toLowerCase())) {
            score += 2;
          }
        });

        return { ...group, score };
      })
      .sort((a, b) => b.score - a.score || String(a.name || "").localeCompare(String(b.name || ""), "fr", { sensitivity: "base" }))
      .slice(0, 5);
  }, [ageStages, allGroups, form.childAgeStage, form.interests, form.locationMode]);

  const suggestedAccounts = useMemo(() => {
    const selectedInterests = Array.isArray(form.interests) ? form.interests : [];

    return [...allUsers]
      .map((member) => {
        const haystack = `${member.name || ""} ${member.bio || ""} ${member.city || ""} ${member.country || ""} ${member.childAges || ""} ${(Array.isArray(member.interests) ? member.interests.join(" ") : "")}`.toLowerCase();
        let score = 0;

        if (form.locationMode !== "diaspora" && form.city && member.city && member.city.toLowerCase() === form.city.toLowerCase()) {
          score += 4;
        }

        if (form.country && member.country && member.country.toLowerCase() === form.country.toLowerCase()) {
          score += 2;
        }

        if (form.locationMode === "diaspora" && member.country && form.country && member.country.toLowerCase() === form.country.toLowerCase()) {
          score += 2;
        }

        if (form.childAgeStage && haystack.includes(form.childAgeStage.toLowerCase())) {
          score += 1;
        }

        selectedInterests.forEach((interest) => {
          if (haystack.includes(String(interest).toLowerCase())) {
            score += 2;
          }
        });

        return { ...member, score };
      })
      .sort((a, b) => b.score - a.score || String(a.name || "").localeCompare(String(b.name || ""), "fr", { sensitivity: "base" }))
      .slice(0, 6);
  }, [allUsers, form.childAgeStage, form.city, form.country, form.interests, form.locationMode]);

  const canContinueProfile = Boolean(
    form.name.trim()
    && form.locationMode
    && (form.locationMode === "diaspora" ? form.country.trim() || form.city.trim() : form.city.trim())
  );
  const canContinueInterests = Array.isArray(form.interests) && form.interests.length > 0;

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  }

  function toggleInterest(interest) {
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((item) => item !== interest)
        : [...prev.interests, interest],
    }));
    setError("");
  }

  function toggleGroup(groupId) {
    setForm((prev) => ({
      ...prev,
      selectedGroupIds: prev.selectedGroupIds.includes(groupId)
        ? prev.selectedGroupIds.filter((item) => item !== groupId)
        : [...prev.selectedGroupIds, groupId],
    }));
  }

  function toggleAccount(accountId) {
    setForm((prev) => ({
      ...prev,
      selectedAccountIds: prev.selectedAccountIds.includes(accountId)
        ? prev.selectedAccountIds.filter((item) => item !== accountId)
        : [...prev.selectedAccountIds, accountId],
    }));
  }

  function handleNext() {
    if (step === 0 && !canContinueProfile) {
      setError(ui.completeProfileHint);
      return;
    }

    if (step === 1 && !canContinueInterests) {
      setError(ui.pickInterestHint);
      return;
    }

    setError("");
    setStep((current) => Math.min(current + 1, 2));
  }

  async function handleFinish() {
    if (!user) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await updateUserProfile(user.uid, {
        name: form.name.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        locationMode: form.locationMode,
        childAges: form.childAges.trim(),
        childAgeStage: form.childAgeStage,
        interests: form.interests,
        suggestedGroupIds: form.selectedGroupIds,
        followingIds: form.selectedAccountIds,
        onboardingCompletedAt: new Date().toISOString(),
      });

      await Promise.all(
        form.selectedGroupIds.map((groupId) => joinGroup(groupId, user.uid).catch(() => null))
      );

      await refreshProfile();
      router.replace("/feed");
    } catch (saveError) {
      console.error("Onboarding save error:", saveError);
      setError(t("genericError"));
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loadingData) {
    return <div className="py-16 text-center text-sm text-slate-500">{ui.loading}</div>;
  }

  if (!user) {
    return <div className="py-16 text-center text-sm text-slate-500">{ui.loading}</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-200">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{ui.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{ui.description}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[ui.stepProfile, ui.stepInterests, ui.stepSuggestions].map((label, index) => (
          <div
            key={label}
            className={`rounded-2xl border px-4 py-3 ${index === step ? "border-rose-200 bg-rose-50" : index < step ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}
          >
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{index + 1}</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{label}</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {step === 0 && (
        <Card className="rounded-[2rem] border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserRound className="h-5 w-5 text-rose-500" /> {ui.profileTitle}
            </CardTitle>
            <CardDescription>{ui.profileDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">{ui.yourName}</Label>
                <Input id="name" value={form.name} onChange={(event) => updateField("name", event.target.value)} className="rounded-xl" />
              </div>

              <div className="space-y-2">
                <Label>{ui.locationMode}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant={form.locationMode === "local" ? "default" : "outline"} className="rounded-xl" onClick={() => updateField("locationMode", "local")}>
                    {ui.locationLocal}
                  </Button>
                  <Button type="button" variant={form.locationMode === "diaspora" ? "default" : "outline"} className="rounded-xl" onClick={() => updateField("locationMode", "diaspora")}>
                    {ui.locationDiaspora}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{ui.childAgeStageLabel}</Label>
                <Select value={form.childAgeStage} onValueChange={(value) => updateField("childAgeStage", value)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder={ui.childAgeStageLabel} />
                  </SelectTrigger>
                  <SelectContent>
                    {ageStages.map((item) => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">{ui.cityLabel}</Label>
                <Input id="city" value={form.city} onChange={(event) => updateField("city", event.target.value)} className="rounded-xl" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">{ui.countryLabel}</Label>
                <Input id="country" value={form.country} onChange={(event) => updateField("country", event.target.value)} className="rounded-xl" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="childAges">{ui.childAgesLabel}</Label>
                <Input
                  id="childAges"
                  value={form.childAges}
                  placeholder={ui.childAgesPlaceholder}
                  onChange={(event) => updateField("childAges", event.target.value)}
                  className="rounded-xl"
                />
                <p className="text-xs text-slate-500">{ui.contextOptionalHint}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card className="rounded-[2rem] border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <HeartHandshake className="h-5 w-5 text-rose-500" /> {ui.interestsTitle}
            </CardTitle>
            <CardDescription>{ui.interestsDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              {interestOptions.map((interest) => {
                const active = form.interests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${active ? "bg-rose-500 text-white shadow-sm shadow-rose-200" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-[2rem] border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-sky-500" /> {ui.groupsSuggested}
              </CardTitle>
              <CardDescription>{ui.suggestionsDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {suggestedGroups.length === 0 ? (
                <p className="text-sm text-slate-500">{ui.noGroups}</p>
              ) : suggestedGroups.map((group) => {
                const selected = form.selectedGroupIds.includes(group.id);
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={`flex w-full items-start justify-between rounded-2xl border px-4 py-3 text-left transition ${selected ? "border-sky-200 bg-sky-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
                  >
                    <div>
                      <div className="font-medium text-slate-900">{group.name}</div>
                      <div className="mt-1 text-sm text-slate-500">{group.description}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge className={`rounded-full ${group.color || "bg-slate-100 text-slate-700"}`}>{ui.recommendedLabel}</Badge>
                        {form.locationMode === "diaspora" && String(group.id || "").toLowerCase().includes("diaspora") && (
                          <Badge variant="secondary" className="rounded-full">{ui.diasporaLabel}</Badge>
                        )}
                      </div>
                    </div>
                    {selected ? <CheckCircle2 className="mt-1 h-5 w-5 text-sky-600" /> : <span className="text-sm text-slate-500">{ui.joinedLabel}</span>}
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserRound className="h-5 w-5 text-rose-500" /> {ui.accountsSuggested}
              </CardTitle>
              <CardDescription>{ui.suggestionsTitle}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {suggestedAccounts.length === 0 ? (
                <p className="text-sm text-slate-500">{ui.noMembers}</p>
              ) : suggestedAccounts.map((member) => {
                const selected = form.selectedAccountIds.includes(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleAccount(member.id)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${selected ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-11 w-11">
                        {member.photo && <AvatarImage src={member.photo} />}
                        <AvatarFallback className="bg-gradient-to-br from-rose-400 to-pink-500 text-white">
                          {getInitials(member.name || "U")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-slate-900">{member.name || t("user")}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {member.city || member.country || "Diaspora"}</span>
                          {member.childAges && <span className="inline-flex items-center gap-1"><Baby className="h-3 w-3" /> {member.childAges}</span>}
                        </div>
                        {form.locationMode !== "diaspora" && form.city && member.city && member.city.toLowerCase() === form.city.toLowerCase() && (
                          <Badge variant="secondary" className="mt-2 rounded-full">{ui.nearbyLabel}</Badge>
                        )}
                      </div>
                    </div>
                    {selected ? <CheckCircle2 className="h-5 w-5 text-rose-600" /> : <span className="text-sm text-slate-500">{ui.followLabel}</span>}
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" className="rounded-xl" onClick={() => setStep((current) => Math.max(current - 1, 0))} disabled={step === 0 || saving}>
          {ui.back}
        </Button>
        {step < 2 ? (
          <Button type="button" className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 shadow-sm shadow-rose-200" onClick={handleNext}>
            {ui.next}
          </Button>
        ) : (
          <Button type="button" className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 shadow-sm shadow-rose-200" onClick={handleFinish} disabled={saving}>
            {saving ? ui.saving : ui.finish}
          </Button>
        )}
      </div>
    </div>
  );
}
