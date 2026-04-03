"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getUserVaccinationProfile, saveUserVaccinationProfile } from "@/lib/firestore";
import CommunitySupportToolPanel from "@/components/health-tools/CommunitySupportTool";
import DevelopmentMilestonesTool from "@/components/health-tools/DevelopmentMilestonesTool";
import NutritionGuideTool from "@/components/health-tools/NutritionGuideTool";
import PregnancyCalculatorTool from "@/components/health-tools/PregnancyCalculatorTool";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Calculator, 
  Calendar, 
  Heart, 
  Baby, 
  Thermometer, 
  Scale,
  Phone,
  AlertTriangle,
  CheckCircle,
  Activity,
  Users,
  Download
} from "lucide-react";

const defaultVaccinationProfile = {
  childName: "",
  birthDate: "",
  notes: "",
  records: {}
};

const legacyGuestVaccinationStorageKey = "lakou-manman-vaccination-profile";
const guestVaccinationStorageKey = "lakou-manman-vaccination-profile-guest";
const babyGrowthHistoryStorageKey = "lakou-manman-baby-growth-history";
const temperatureHistoryStorageKey = "lakou-manman-temperature-history";

function getTodayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function readToolEntriesFromStorage(storageKey) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const savedEntries = window.localStorage.getItem(storageKey);
    const parsedEntries = savedEntries ? JSON.parse(savedEntries) : [];
    return Array.isArray(parsedEntries) ? parsedEntries : [];
  } catch {
    return [];
  }
}

function writeToolEntriesToStorage(storageKey, entries) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(Array.isArray(entries) ? entries : []));
  } catch {
  }
}

function filterEntriesByDateRange(entries = [], range = {}) {
  return entries.filter((entry) => {
    const entryDate = typeof entry?.measurementDate === "string" ? entry.measurementDate : "";
    if (!entryDate) {
      return false;
    }

    const matchesStartDate = !range?.startDate || entryDate >= range.startDate;
    const matchesEndDate = !range?.endDate || entryDate <= range.endDate;

    return matchesStartDate && matchesEndDate;
  });
}

function formatToolDate(dateValue, language) {
  if (!dateValue) {
    return "--";
  }

  try {
    const locale = language === "ht" ? "fr-HT" : "fr-FR";
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${dateValue}T00:00:00`));
  } catch {
    return dateValue;
  }
}

function downloadTextFile(filename, content) {
  if (typeof window === "undefined") {
    return;
  }

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = filename;
  window.document.body.appendChild(link);
  link.click();
  window.document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function sanitizeVaccinationProfile(data = {}) {
  return {
    ...defaultVaccinationProfile,
    ...(data && typeof data === "object" ? data : {}),
    records: data?.records && typeof data.records === "object" && !Array.isArray(data.records)
      ? data.records
      : {}
  };
}

function hasVaccinationProfileData(profile) {
  return Boolean(
    profile?.childName
    || profile?.birthDate
    || profile?.notes
    || Object.keys(profile?.records || {}).length > 0
  );
}

function getVaccinationStorageKey(uid) {
  return uid ? `lakou-manman-vaccination-profile-${uid}` : guestVaccinationStorageKey;
}

function readVaccinationProfileFromStorage(storageKey) {
  if (typeof window === "undefined") {
    return defaultVaccinationProfile;
  }

  try {
    const savedVaccinationProfile = window.localStorage.getItem(storageKey);
    const legacyGuestVaccinationProfile = storageKey === guestVaccinationStorageKey
      ? window.localStorage.getItem(legacyGuestVaccinationStorageKey)
      : null;
    const storageValue = savedVaccinationProfile || legacyGuestVaccinationProfile;

    return savedVaccinationProfile
      || legacyGuestVaccinationProfile
      ? sanitizeVaccinationProfile(JSON.parse(storageValue))
      : defaultVaccinationProfile;
  } catch {
    return defaultVaccinationProfile;
  }
}

function writeVaccinationProfileToStorage(storageKey, profile) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(sanitizeVaccinationProfile(profile)));
  } catch {
  }
}

export default function ToolsPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [activeTool, setActiveTool] = useState(null);
  const [babyData, setBabyData] = useState(() => ({
    birthDate: "",
    birthWeight: "",
    currentWeight: "",
    currentHeight: "",
    measurementDate: getTodayDateValue()
  }));
  const [babyHistory, setBabyHistory] = useState([]);
  const [babyHistoryRange, setBabyHistoryRange] = useState({ startDate: "", endDate: "" });
  const [temperatureData, setTemperatureData] = useState(() => ({
    temperature: "",
    symptoms: [],
    measurementDate: getTodayDateValue(),
    period: "morning",
    notes: ""
  }));
  const [temperatureHistory, setTemperatureHistory] = useState([]);
  const [temperatureHistoryRange, setTemperatureHistoryRange] = useState({ startDate: "", endDate: "" });
  const [emergencyData, setEmergencyData] = useState({
    location: "",
    emergency: "",
    description: ""
  });
  const [vaccinationProfile, setVaccinationProfile] = useState(defaultVaccinationProfile);
  const [vaccinationProfileReady, setVaccinationProfileReady] = useState(false);
  const [vaccinationProfileScope, setVaccinationProfileScope] = useState("guest");
  const [vaccinationSyncState, setVaccinationSyncState] = useState("idle");
  const [vaccinationProfileSnapshot, setVaccinationProfileSnapshot] = useState(JSON.stringify(defaultVaccinationProfile));
  const [vaccinationNeedsRemoteSeed, setVaccinationNeedsRemoteSeed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrateVaccinationProfile() {
      const nextScope = user?.uid || "guest";
      const guestProfile = readVaccinationProfileFromStorage(guestVaccinationStorageKey);
      const scopedStorageKey = getVaccinationStorageKey(user?.uid);
      const scopedLocalProfile = readVaccinationProfileFromStorage(scopedStorageKey);

      setVaccinationProfileReady(false);

      if (!user) {
        if (!cancelled) {
          setVaccinationProfile(guestProfile);
          setVaccinationProfileScope(nextScope);
          setVaccinationSyncState("guest");
          setVaccinationProfileReady(true);
        }
        return;
      }

      let nextProfile = scopedLocalProfile;
      let nextSyncState = "idle";
      let nextNeedsRemoteSeed = false;

      try {
        const remoteVaccinationProfile = await getUserVaccinationProfile(user.uid);

        if (remoteVaccinationProfile) {
          nextProfile = sanitizeVaccinationProfile(remoteVaccinationProfile);
          writeVaccinationProfileToStorage(scopedStorageKey, nextProfile);
          nextSyncState = "saved";
        } else if (hasVaccinationProfileData(scopedLocalProfile)) {
          nextProfile = scopedLocalProfile;
          nextNeedsRemoteSeed = true;
        } else if (hasVaccinationProfileData(guestProfile)) {
          nextProfile = guestProfile;
          writeVaccinationProfileToStorage(scopedStorageKey, nextProfile);
          nextNeedsRemoteSeed = true;
        }
      } catch {
        nextSyncState = "error";
      }

      if (!cancelled) {
        setVaccinationProfile(nextProfile);
        setVaccinationProfileScope(nextScope);
        setVaccinationSyncState(nextSyncState);
        setVaccinationProfileSnapshot(JSON.stringify(nextProfile));
        setVaccinationNeedsRemoteSeed(nextNeedsRemoteSeed);
        setVaccinationProfileReady(true);
      }
    }

    hydrateVaccinationProfile();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  useEffect(() => {
    const currentScope = user?.uid || "guest";

    if (!vaccinationProfileReady || vaccinationProfileScope !== currentScope) {
      return;
    }

    writeVaccinationProfileToStorage(getVaccinationStorageKey(user?.uid), vaccinationProfile);
  }, [user?.uid, vaccinationProfile, vaccinationProfileReady, vaccinationProfileScope]);

  useEffect(() => {
    if (!user || !vaccinationProfileReady || vaccinationProfileScope !== user.uid) {
      return;
    }

    const serializedVaccinationProfile = JSON.stringify(vaccinationProfile);

    if (!vaccinationNeedsRemoteSeed && serializedVaccinationProfile === vaccinationProfileSnapshot) {
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        if (!cancelled) {
          setVaccinationSyncState("saving");
        }

        await saveUserVaccinationProfile(user.uid, vaccinationProfile);

        if (!cancelled) {
          setVaccinationSyncState("saved");
          setVaccinationProfileSnapshot(serializedVaccinationProfile);
          setVaccinationNeedsRemoteSeed(false);
        }
      } catch {
        if (!cancelled) {
          setVaccinationSyncState("error");
        }
      }
    }, 700);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [user, vaccinationNeedsRemoteSeed, vaccinationProfile, vaccinationProfileReady, vaccinationProfileScope, vaccinationProfileSnapshot]);

  useEffect(() => {
    setBabyHistory(readToolEntriesFromStorage(babyGrowthHistoryStorageKey));
    setTemperatureHistory(readToolEntriesFromStorage(temperatureHistoryStorageKey));
  }, []);

  useEffect(() => {
    writeToolEntriesToStorage(babyGrowthHistoryStorageKey, babyHistory);
  }, [babyHistory]);

  useEffect(() => {
    writeToolEntriesToStorage(temperatureHistoryStorageKey, temperatureHistory);
  }, [temperatureHistory]);

  const childTrackingUi = language === "ht"
    ? {
        measurementDate: "Dat mezi a",
        startDate: "Dat kòmansman",
        endDate: "Dat fen",
        history: "Istwa mezi yo",
        noHistory: "Pa gen okenn antre pou peryòd sa a ankò.",
        download: "Telechaje",
        downloadHistory: "Telechaje istwa a",
        saveEntry: "Anrejistre mezi a",
        periodLabel: "Peryòd",
        notesLabel: "Nòt",
        notesPlaceholder: "Ekri obsèvasyon yo oswa medikaman yo bay la",
        morning: "Maten",
        afternoon: "Apremidi",
        evening: "Aswè",
        night: "Lannuit",
        dateRangeTitle: "Filtre sou yon peryòd",
        savedMeasurements: "Mezi anrejistre",
      }
    : {
        measurementDate: "Date de mesure",
        startDate: "Date de début",
        endDate: "Date de fin",
        history: "Historique des mesures",
        noHistory: "Aucune donnée enregistrée pour cette période.",
        download: "Télécharger",
        downloadHistory: "Télécharger l'historique",
        saveEntry: "Enregistrer la mesure",
        periodLabel: "Période",
        notesLabel: "Notes",
        notesPlaceholder: "Ajoutez une observation ou le traitement donné",
        morning: "Matin",
        afternoon: "Après-midi",
        evening: "Soir",
        night: "Nuit",
        dateRangeTitle: "Filtrer sur une période",
        savedMeasurements: "Mesures enregistrées",
      };

  const periodOptions = [
    { value: "morning", label: childTrackingUi.morning },
    { value: "afternoon", label: childTrackingUi.afternoon },
    { value: "evening", label: childTrackingUi.evening },
    { value: "night", label: childTrackingUi.night },
  ];

  const vaccinationUi = language === "ht"
    ? {
        childName: "Non timoun nan",
        childNamePlaceholder: "Ekri non timoun nan",
        birthDate: "Dat nesans",
        profileTitle: "Ranpli dosye vaksen an",
        profileDescription: "Ranpli dosye vaksen pou timoun nan epi swiv etap yo depi nesans rive nan adolesans.",
        progress: "Pwogrè vaksen yo",
        completed: "fè",
        markDone: "Make kòm fèt",
        completionDate: "Dat vaksen an",
        stageNotes: "Nòt sou dòz la",
        stageNotesPlaceholder: "Egzanp: fèt nan sant sante Hinche",
        generalNotes: "Nòt jeneral",
        generalNotesPlaceholder: "Ekri nenpòt rapèl oswa obsèvasyon sou swivi vaksen yo",
        ageSummary: "Laj timoun nan",
        ageHint: "laj estime depi dat nesans la",
        pending: "Pou fè"
      }
    : {
        childName: "Nom de l'enfant",
        childNamePlaceholder: "Entrez le nom de l'enfant",
        birthDate: "Date de naissance",
        profileTitle: "Remplir le carnet vaccinal",
        profileDescription: "Renseignez le carnet vaccinal de l'enfant et suivez les étapes de la naissance à l'adolescence.",
        progress: "Progression vaccinale",
        completed: "effectués",
        markDone: "Marquer comme fait",
        completionDate: "Date du vaccin",
        stageNotes: "Notes sur la dose",
        stageNotesPlaceholder: "Ex: fait au centre de santé de Hinche",
        generalNotes: "Notes générales",
        generalNotesPlaceholder: "Ajoutez ici vos rappels ou observations de suivi vaccinal",
        ageSummary: "Âge de l'enfant",
        ageHint: "âge estimé à partir de la date de naissance",
        pending: "À faire"
      };

  const updateVaccinationRecord = (stageId, field, value) => {
    setVaccinationProfile((prev) => ({
      ...prev,
      records: {
        ...prev.records,
        [stageId]: {
          ...prev.records[stageId],
          [field]: value,
        },
      },
    }));
  };

  // Tools categories
  const tools = [
    {
      id: "pregnancy",
      title: t("pregnancyCalculator") || "Calculateur grossesse",
      description: t("pregnancyCalculatorDesc") || "Calculez votre date d'accouchement et suivez votre grossesse",
      icon: Baby,
      color: "from-pink-500 to-purple-500",
      category: "pregnancy"
    },
    {
      id: "baby",
      title: t("babyGrowth") || "Croissance bébé",
      description: t("babyGrowthDesc") || "Suivez la croissance et le développement de votre bébé",
      icon: Scale,
      color: "from-blue-500 to-green-500",
      category: "baby"
    },
    {
      id: "temperature",
      title: t("temperatureTracker") || "Suivi température",
      description: t("temperatureTrackerDesc") || "Enregistrez et suivez la température de votre enfant",
      icon: Thermometer,
      color: "from-orange-500 to-red-500",
      category: "health"
    },
    {
      id: "emergency",
      title: t("emergencyContacts") || "Contacts d'urgence",
      description: t("emergencyContactsDesc") || "Accédez rapidement aux contacts d'urgence pédiatriques",
      icon: Phone,
      color: "from-red-500 to-pink-500",
      category: "emergency"
    },
    {
      id: "vaccination",
      title: t("vaccinationSchedule") || "Calendrier vaccinal",
      description: t("vaccinationScheduleDesc") || "Calendrier complet des vaccins pour votre enfant",
      icon: Calendar,
      color: "from-green-500 to-teal-500",
      category: "health"
    },
    {
      id: "nutrition",
      title: t("nutritionGuide") || "Guide nutrition",
      description: t("nutritionGuideDesc") || "Conseils nutritionnels adaptés à l'âge de votre enfant",
      icon: Heart,
      color: "from-yellow-500 to-orange-500",
      category: "nutrition"
    },
    {
      id: "development",
      title: t("developmentMilestones") || "Étapes développement",
      description: t("developmentMilestonesDesc") || "Suivez les étapes clés du développement de votre enfant",
      icon: Activity,
      color: "from-purple-500 to-blue-500",
      category: "development"
    },
    {
      id: "community",
      title: t("communitySupport") || "Soutien communautaire",
      description: t("communitySupportDesc") || "Connectez-vous avec d'autres mamans pour du soutien",
      icon: Users,
      color: "from-indigo-500 to-purple-500",
      category: "community"
    }
  ];

  // Pregnancy Calculator Tool
  const PregnancyCalculator = () => {
    return (
      <PregnancyCalculatorTool t={t} />
    );
  };

  // Baby Growth Tracker
  const BabyGrowthTracker = () => {
    const filteredBabyHistory = filterEntriesByDateRange(babyHistory, babyHistoryRange)
      .sort((left, right) => right.measurementDate.localeCompare(left.measurementDate));

    const calculateGrowth = () => {
      if (!babyData.birthDate || !babyData.birthWeight || !babyData.currentWeight) return null;

      const birthDate = new Date(`${babyData.birthDate}T00:00:00`);
      const measurementDate = new Date(`${(babyData.measurementDate || getTodayDateValue())}T00:00:00`);
      const ageInDays = Math.max(0, Math.floor((measurementDate - birthDate) / (24 * 60 * 60 * 1000)));
      const ageInMonths = Math.floor(ageInDays / 30);

      const weightGain = parseFloat(babyData.currentWeight) - parseFloat(babyData.birthWeight);
      const dailyWeightGain = ageInDays > 0 ? (weightGain / ageInDays).toFixed(2) : 0;

      return {
        ageInDays,
        ageInMonths,
        weightGain,
        dailyWeightGain,
        measurementDate: babyData.measurementDate || getTodayDateValue(),
      };
    };

    const result = calculateGrowth();

    const handleSaveBabyEntry = () => {
      if (!babyData.currentWeight && !babyData.currentHeight) {
        return;
      }

      const nextEntry = {
        id: `${babyData.measurementDate || getTodayDateValue()}-${Date.now()}`,
        measurementDate: babyData.measurementDate || getTodayDateValue(),
        birthDate: babyData.birthDate,
        birthWeight: babyData.birthWeight,
        currentWeight: babyData.currentWeight,
        currentHeight: babyData.currentHeight,
      };

      setBabyHistory((previous) => [nextEntry, ...previous]
        .sort((left, right) => right.measurementDate.localeCompare(left.measurementDate)));
    };

    const handleDownloadBabyHistory = () => {
      const content = [
        language === "ht" ? "Rapò kwasans timoun" : "Rapport de croissance de l'enfant",
        "",
        `${t("birthDate") || "Date de naissance"}: ${formatToolDate(babyData.birthDate, language)}`,
        `${t("birthWeight") || "Poids de naissance (kg)"}: ${babyData.birthWeight || "--"}`,
        `${childTrackingUi.savedMeasurements}: ${filteredBabyHistory.length}`,
        "",
        childTrackingUi.history,
        ...(filteredBabyHistory.length
          ? filteredBabyHistory.map((entry) => [
              `- ${formatToolDate(entry.measurementDate, language)}`,
              `${t("currentWeight") || "Poids actuel (kg)"}: ${entry.currentWeight || "--"}`,
              `${t("currentHeight") || "Taille actuelle (cm)"}: ${entry.currentHeight || "--"}`,
            ].join(" | "))
          : [childTrackingUi.noHistory]),
      ].join("\n");

      downloadTextFile(`croissance-enfant-${babyData.measurementDate || getTodayDateValue()}.txt`, content);
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {childTrackingUi.measurementDate}
            </label>
            <Input
              type="date"
              value={babyData.measurementDate}
              onChange={(e) => setBabyData({ ...babyData, measurementDate: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("birthDate") || "Date de naissance"}
            </label>
            <Input
              type="date"
              value={babyData.birthDate}
              onChange={(e) => setBabyData({...babyData, birthDate: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("birthWeight") || "Poids de naissance (kg)"}
            </label>
            <Input
              type="number"
              step="0.1"
              value={babyData.birthWeight}
              onChange={(e) => setBabyData({...babyData, birthWeight: e.target.value})}
              placeholder="3.2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("currentWeight") || "Poids actuel (kg)"}
            </label>
            <Input
              type="number"
              step="0.1"
              value={babyData.currentWeight}
              onChange={(e) => setBabyData({...babyData, currentWeight: e.target.value})}
              placeholder="4.5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("currentHeight") || "Taille actuelle (cm)"}
            </label>
            <Input
              type="number"
              value={babyData.currentHeight}
              onChange={(e) => setBabyData({...babyData, currentHeight: e.target.value})}
              placeholder="55"
            />
          </div>
        </div>

        {result && (
          <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">{t("growthResults") || "Résultats croissance"}</h3>
              <div className="mb-4 text-sm text-slate-600">
                {childTrackingUi.measurementDate}: {formatToolDate(result.measurementDate, language)}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{result.ageInDays}</div>
                  <div className="text-sm text-slate-600">{t("daysOld") || "Jours"}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{result.ageInMonths}</div>
                  <div className="text-sm text-slate-600">{t("monthsOld") || "Mois"}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{result.weightGain.toFixed(1)}</div>
                  <div className="text-sm text-slate-600">{t("weightGain") || "Gain poids (kg)"}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{result.dailyWeightGain}</div>
                  <div className="text-sm text-slate-600">{t("dailyGain") || "Gain/jour (g)"}</div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-white rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm">
                    {result.dailyWeightGain >= 20 ? 
                      t("growthNormal") || "Croissance normale" : 
                      t("consultDoctor") || "Consultez un professionnel de santé"
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSaveBabyEntry} disabled={!babyData.currentWeight && !babyData.currentHeight}>
            {childTrackingUi.saveEntry}
          </Button>
          <Button variant="outline" onClick={handleDownloadBabyHistory} disabled={!filteredBabyHistory.length}>
            <Download className="mr-2 h-4 w-4" />
            {childTrackingUi.downloadHistory}
          </Button>
        </div>

        <Card>
          <CardContent className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">{childTrackingUi.startDate}</label>
              <Input
                type="date"
                value={babyHistoryRange.startDate}
                onChange={(e) => setBabyHistoryRange((previous) => ({ ...previous, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{childTrackingUi.endDate}</label>
              <Input
                type="date"
                value={babyHistoryRange.endDate}
                onChange={(e) => setBabyHistoryRange((previous) => ({ ...previous, endDate: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{childTrackingUi.history}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredBabyHistory.length ? filteredBabyHistory.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium text-slate-800">{formatToolDate(entry.measurementDate, language)}</div>
                  <div className="text-xs text-slate-500">{t("birthDate") || "Date de naissance"}: {formatToolDate(entry.birthDate, language)}</div>
                </div>
                <div className="grid grid-cols-1 gap-2 text-sm text-slate-600 md:grid-cols-3">
                  <div>{t("birthWeight") || "Poids de naissance (kg)"}: {entry.birthWeight || "--"}</div>
                  <div>{t("currentWeight") || "Poids actuel (kg)"}: {entry.currentWeight || "--"}</div>
                  <div>{t("currentHeight") || "Taille actuelle (cm)"}: {entry.currentHeight || "--"}</div>
                </div>
              </div>
            )) : (
              <div className="text-sm text-slate-500">{childTrackingUi.noHistory}</div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Temperature Tracker
  const TemperatureTracker = () => {
    const symptoms = [
      t("fever") || "Fièvre",
      t("cough") || "Toux",
      t("diarrhea") || "Diarrhée",
      t("headache") || "Mal de tête",
      t("fatigue") || "Fatigue",
      t("lossAppetite") || "Perte d'appétit",
      t("vomiting") || "Vomissements"
    ];

    const toggleSymptom = (symptom) => {
      setTemperatureData(prev => ({
        ...prev,
        symptoms: prev.symptoms.includes(symptom) 
          ? prev.symptoms.filter(s => s !== symptom)
          : [...prev.symptoms, symptom]
      }));
    };

    const getTemperatureStatus = (temp) => {
      if (!temp) return null;
      const tempValue = parseFloat(temp);
      if (tempValue < 36.0) return { status: "low", color: "text-blue-600", message: t("hypothermia") || "Hypothermie" };
      if (tempValue <= 37.5) return { status: "normal", color: "text-green-600", message: t("normal") || "Normal" };
      if (tempValue <= 38.5) return { status: "fever", color: "text-orange-600", message: t("fever") || "Fièvre légère" };
      if (tempValue <= 39.5) return { status: "moderate", color: "text-red-600", message: t("moderateFever") || "Fièvre modérée" };
      return { status: "high", color: "text-red-800", message: t("highFever") || "Fièvre élevée" };
    };

    const tempStatus = getTemperatureStatus(temperatureData.temperature);
    const filteredTemperatureHistory = filterEntriesByDateRange(temperatureHistory, temperatureHistoryRange)
      .sort((left, right) => right.measurementDate.localeCompare(left.measurementDate));

    const handleSaveTemperatureEntry = () => {
      if (!temperatureData.temperature) {
        return;
      }

      const nextEntry = {
        id: `${temperatureData.measurementDate || getTodayDateValue()}-${Date.now()}`,
        measurementDate: temperatureData.measurementDate || getTodayDateValue(),
        period: temperatureData.period,
        temperature: temperatureData.temperature,
        symptoms: temperatureData.symptoms,
        notes: temperatureData.notes,
        status: tempStatus?.message || "",
      };

      setTemperatureHistory((previous) => [nextEntry, ...previous]
        .sort((left, right) => right.measurementDate.localeCompare(left.measurementDate)));
    };

    const handleDownloadTemperatureHistory = () => {
      const content = [
        language === "ht" ? "Rapò tanperati timoun" : "Rapport de température de l'enfant",
        "",
        `${childTrackingUi.savedMeasurements}: ${filteredTemperatureHistory.length}`,
        "",
        childTrackingUi.history,
        ...(filteredTemperatureHistory.length
          ? filteredTemperatureHistory.map((entry) => [
              `- ${formatToolDate(entry.measurementDate, language)}`,
              `${childTrackingUi.periodLabel}: ${periodOptions.find((option) => option.value === entry.period)?.label || entry.period}`,
              `${t("temperature") || "Température (°C)"}: ${entry.temperature}°C`,
              `${t("symptoms") || "Symptômes associés"}: ${entry.symptoms.length ? entry.symptoms.join(", ") : "--"}`,
              `${childTrackingUi.notesLabel}: ${entry.notes || "--"}`,
            ].join(" | "))
          : [childTrackingUi.noHistory]),
      ].join("\n");

      downloadTextFile(`temperature-enfant-${temperatureData.measurementDate || getTodayDateValue()}.txt`, content);
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium mb-2">
              {childTrackingUi.measurementDate}
            </label>
            <Input
              type="date"
              value={temperatureData.measurementDate}
              onChange={(e) => setTemperatureData({ ...temperatureData, measurementDate: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {childTrackingUi.periodLabel}
            </label>
            <select
              value={temperatureData.period}
              onChange={(e) => setTemperatureData({ ...temperatureData, period: e.target.value })}
              className="w-full rounded-xl border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B2335]"
            >
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("temperature") || "Température (°C)"}
            </label>
            <Input
              type="number"
              step="0.1"
              value={temperatureData.temperature}
              onChange={(e) => setTemperatureData({ ...temperatureData, temperature: e.target.value })}
              placeholder="37.5"
            />
          </div>
        </div>

        {tempStatus && (
          <Card className={`bg-gradient-to-r ${tempStatus.status === 'normal' ? 'from-green-50 to-emerald-50 border-green-200' : 'from-red-50 to-orange-50 border-red-200'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {tempStatus.status === 'normal' ? 
                  <CheckCircle className="h-6 w-6 text-green-500" /> : 
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                }
                <div>
                  <div className={`font-semibold ${tempStatus.color}`}>{tempStatus.message}</div>
                  <div className="text-sm text-slate-600">{temperatureData.temperature}°C</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div>
          <label className="block text-sm font-medium mb-3">
            {t("symptoms") || "Symptômes associés"}
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {symptoms.map((symptom) => (
              <label key={symptom} className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={temperatureData.symptoms.includes(symptom)}
                  onChange={() => toggleSymptom(symptom)}
                  className="rounded"
                />
                <span className="text-sm">{symptom}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            {childTrackingUi.notesLabel}
          </label>
          <Textarea
            value={temperatureData.notes}
            onChange={(e) => setTemperatureData({ ...temperatureData, notes: e.target.value })}
            placeholder={childTrackingUi.notesPlaceholder}
            rows={3}
          />
        </div>

        {temperatureData.temperature && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-2">{t("recommendations") || "Recommandations"}</h4>
              <ul className="text-sm space-y-1">
                {tempStatus.status === 'normal' && (
                  <>
                    <li>• {t("monitorTemp") || "Surveillez la température toutes les 4 heures"}</li>
                    <li>• {t("hydrate") || "Assurez une bonne hydratation"}</li>
                    <li>• {t("rest") || "Repos recommandé"}</li>
                  </>
                )}
                {tempStatus.status === 'fever' && (
                  <>
                    <li>• {t("giveMedication") || "Donnez du paracétamol si nécessaire"}</li>
                    <li>• {t("monitorClosely") || "Surveillance rapprochée"}</li>
                    <li>• {t("consultIfWorsens") || "Consultez si la fièvre persiste > 48h"}</li>
                  </>
                )}
                {(tempStatus.status === 'moderate' || tempStatus.status === 'high') && (
                  <>
                    <li>• {t("consultImmediately") || "Consultez un médecin immédiatement"}</li>
                    <li>• {t("emergencySigns") || "Surveillez les signes de détresse"}</li>
                    <li>• {t("keepHydrated") || "Maintenez l'hydratation"}</li>
                  </>
                )}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSaveTemperatureEntry} disabled={!temperatureData.temperature}>
            {childTrackingUi.saveEntry}
          </Button>
          <Button variant="outline" onClick={handleDownloadTemperatureHistory} disabled={!filteredTemperatureHistory.length}>
            <Download className="mr-2 h-4 w-4" />
            {childTrackingUi.downloadHistory}
          </Button>
        </div>

        <Card>
          <CardContent className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">{childTrackingUi.startDate}</label>
              <Input
                type="date"
                value={temperatureHistoryRange.startDate}
                onChange={(e) => setTemperatureHistoryRange((previous) => ({ ...previous, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{childTrackingUi.endDate}</label>
              <Input
                type="date"
                value={temperatureHistoryRange.endDate}
                onChange={(e) => setTemperatureHistoryRange((previous) => ({ ...previous, endDate: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{childTrackingUi.history}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredTemperatureHistory.length ? filteredTemperatureHistory.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium text-slate-800">{formatToolDate(entry.measurementDate, language)}</div>
                  <div className="text-xs text-slate-500">{periodOptions.find((option) => option.value === entry.period)?.label || entry.period}</div>
                </div>
                <div className="text-sm text-slate-600">{t("temperature") || "Température (°C)"}: {entry.temperature}°C</div>
                <div className="mt-1 text-sm text-slate-600">{entry.status || "--"}</div>
                <div className="mt-1 text-sm text-slate-600">{t("symptoms") || "Symptômes associés"}: {Array.isArray(entry.symptoms) && entry.symptoms.length ? entry.symptoms.join(", ") : "--"}</div>
                {entry.notes ? (
                  <div className="mt-1 text-sm text-slate-600">{childTrackingUi.notesLabel}: {entry.notes}</div>
                ) : null}
              </div>
            )) : (
              <div className="text-sm text-slate-500">{childTrackingUi.noHistory}</div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Emergency Contacts
  const EmergencyContacts = () => {
    const emergencyServices = [
      { name: t("emergencyServices") || "Services d'urgence", number: "114", type: "emergency" },
      { name: t("pediatricEmergency") || "Urgence pédiatrique", number: "+509 34 56 78 90", type: "pediatric" },
      { name: t("poisonControl") || "Centre antipoison", number: "+509 22 12 34 56", type: "poison" },
      { name: t("drBeaubrun") || "Dr Beaubrun (Pédiatre)", number: "+509 34 56 78 90", type: "doctor" },
      { name: t("hospitalEmergency") || "Urgence Hôpital", number: "+509 22 23 45 67", type: "hospital" }
    ];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {emergencyServices.map((service, index) => (
            <Card key={index} className={`border-l-4 ${
              service.type === 'emergency' ? 'border-l-red-500' :
              service.type === 'pediatric' ? 'border-l-blue-500' :
              service.type === 'poison' ? 'border-l-purple-500' :
              service.type === 'doctor' ? 'border-l-green-500' :
              'border-l-orange-500'
            }`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold">{service.name}</h4>
                    <p className="text-lg font-bold text-slate-800">{service.number}</p>
                  </div>
                  <Button size="sm" className="bg-green-500 hover:bg-green-600">
                    <Phone className="h-4 w-4 mr-1" />
                    {t("call") || "Appeler"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-red-500 mt-1" />
              <div>
                <h4 className="font-semibold text-red-800 mb-2">{t("emergencySigns") || "Signes d'urgence"}</h4>
                <ul className="text-sm space-y-1 text-red-700">
                  <li>• {t("difficultyBreathing") || "Difficulté à respirer"}</li>
                  <li>• {t("blueLips") || "Lèvres ou visage bleu"}</li>
                  <li>• {t("unconscious") || "Perte de conscience"}</li>
                  <li>• {t("seizures") || "Convulsions"}</li>
                  <li>• {t("severeBleeding") || "Saignement sévère"}</li>
                  <li>• {t("highFever") || "Fièvre élevée (> 40°C)"}</li>
                </ul>
                <div className="mt-3">
                  <Button className="bg-red-600 hover:bg-red-700">
                    <Phone className="h-4 w-4 mr-2" />
                    {t("callEmergency") || "Appeler l'urgence (114)"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const VaccinationSchedule = () => {
    const schedule = [
      { id: "birth", age: t("vaccinationBirthStage") || "À la naissance", vaccines: t("vaccinationBirthVaccines") || "BCG, Polio 0, Hépatite B selon le protocole local" },
      { id: "6-weeks", age: t("vaccination6WeeksStage") || "6 semaines", vaccines: t("vaccination6WeeksVaccines") || "Pentavalent 1, Polio 1, Rotavirus 1, Pneumocoque 1" },
      { id: "10-weeks", age: t("vaccination10WeeksStage") || "10 semaines", vaccines: t("vaccination10WeeksVaccines") || "Pentavalent 2, Polio 2, Rotavirus 2, Pneumocoque 2" },
      { id: "14-weeks", age: t("vaccination14WeeksStage") || "14 semaines", vaccines: t("vaccination14WeeksVaccines") || "Pentavalent 3, Polio 3, Pneumocoque 3" },
      { id: "9-months", age: t("vaccination9MonthsStage") || "9 mois", vaccines: t("vaccination9MonthsVaccines") || "Rougeole-Rubéole, Vitamine A" },
      { id: "12-months", age: t("vaccination12MonthsStage") || "12 mois", vaccines: t("vaccination12MonthsVaccines") || "Rappels et suivi selon le centre de santé" },
      { id: "15-months", age: t("vaccination15MonthsStage") || "15 mois", vaccines: t("vaccination15MonthsVaccines") || "Rappels de la petite enfance selon le protocole local" },
      { id: "18-months", age: t("vaccination18MonthsStage") || "18 mois", vaccines: t("vaccination18MonthsVaccines") || "DTC/Polio/ROR ou autres rappels selon le programme national" },
      { id: "4-6-years", age: t("vaccination4To6YearsStage") || "4 à 6 ans", vaccines: t("vaccination4To6YearsVaccines") || "Rappels préscolaires selon le programme national" },
      { id: "9-14-years", age: t("vaccination9To14YearsStage") || "9 à 14 ans", vaccines: t("vaccination9To14YearsVaccines") || "Vaccin HPV et autres doses recommandées selon disponibilité et protocole local" },
      { id: "15-18-years", age: t("vaccination15To18YearsStage") || "15 à 18 ans", vaccines: t("vaccination15To18YearsVaccines") || "Rappels adolescents, tétanos-diphtérie et mise à jour du carnet selon le centre de santé" }
    ];
    const completedCount = schedule.filter((item) => vaccinationProfile.records[item.id]?.completed).length;
    const ageInMonths = vaccinationProfile.birthDate
      ? Math.max(0, Math.floor((new Date() - new Date(vaccinationProfile.birthDate)) / (1000 * 60 * 60 * 24 * 30.4)))
      : null;
    const formattedAge = ageInMonths === null
      ? "--"
      : ageInMonths < 24
        ? `${ageInMonths} ${language === "ht" ? "mwa" : "mois"}`
        : `${Math.floor(ageInMonths / 12)} ${language === "ht" ? "an" : "ans"}${ageInMonths % 12 ? ` ${ageInMonths % 12} ${language === "ht" ? "mwa" : "mois"}` : ""}`;
    const vaccinationSyncMessage = user
      ? vaccinationSyncState === "saving"
        ? (language === "ht" ? "Ap sove sou kont ou..." : "Sauvegarde sur votre compte...")
        : vaccinationSyncState === "error"
          ? (language === "ht" ? "Erè pandan senkronizasyon an. Done yo rete sou aparèy sa a." : "Erreur de synchronisation. Les données restent sur cet appareil.")
          : (language === "ht" ? "Konekte ak kont ou, dosye vaksen an sove sou Firestore." : "Connecté à votre compte, le carnet vaccinal est sauvegardé sur Firestore.")
      : (language === "ht" ? "Konekte pou sove dosye vaksen an sou kont ou. Pou kounye a li sove sou aparèy sa a." : "Connectez-vous pour sauvegarder le carnet vaccinal sur votre compte. Pour l'instant, il reste enregistré sur cet appareil.");

    const handleDownloadVaccinationProfile = () => {
      const content = [
        language === "ht" ? "Dosye vaksen timoun" : "Carnet vaccinal de l'enfant",
        "",
        `${vaccinationUi.childName}: ${vaccinationProfile.childName || "--"}`,
        `${vaccinationUi.birthDate}: ${formatToolDate(vaccinationProfile.birthDate, language)}`,
        `${vaccinationUi.progress}: ${completedCount}/${schedule.length}`,
        `${vaccinationUi.generalNotes}: ${vaccinationProfile.notes || "--"}`,
        "",
        ...schedule.map((item) => {
          const record = vaccinationProfile.records[item.id] || {};
          return [
            `${item.age} - ${item.vaccines}`,
            `${vaccinationUi.markDone}: ${record.completed ? "Oui" : "Non"}`,
            `${vaccinationUi.completionDate}: ${record.date ? formatToolDate(record.date, language) : "--"}`,
            `${vaccinationUi.stageNotes}: ${record.notes || "--"}`,
          ].join(" | ");
        }),
      ].join("\n");

      downloadTextFile(`carnet-vaccinal-${vaccinationProfile.childName || "enfant"}.txt`, content);
    };

    return (
      <div className="space-y-6">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <h3 className="font-semibold text-green-800 mb-2">{t("vaccinationModelTitle") || "Modèle de calendrier vaccinal"}</h3>
            <p className="text-sm text-green-700">{t("vaccinationReminder") || "Ce calendrier est un modèle indicatif. Confirmez toujours avec un pédiatre ou un centre de santé."}</p>
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <Button variant="outline" onClick={handleDownloadVaccinationProfile}>
            <Download className="mr-2 h-4 w-4" />
            {childTrackingUi.download}
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{vaccinationUi.profileTitle}</CardTitle>
            <p className="text-sm text-slate-600">{vaccinationUi.profileDescription}</p>
            <p className={`text-sm ${vaccinationSyncState === "error" ? "text-amber-600" : "text-slate-500"}`}>{vaccinationSyncMessage}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">{vaccinationUi.childName}</label>
                <Input
                  value={vaccinationProfile.childName}
                  onChange={(e) => setVaccinationProfile((prev) => ({ ...prev, childName: e.target.value }))}
                  placeholder={vaccinationUi.childNamePlaceholder}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{vaccinationUi.birthDate}</label>
                <Input
                  type="date"
                  value={vaccinationProfile.birthDate}
                  onChange={(e) => setVaccinationProfile((prev) => ({ ...prev, birthDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500 mb-1">{vaccinationUi.progress}</div>
                <div className="text-2xl font-bold text-green-600">{completedCount}/{schedule.length}</div>
                <div className="text-sm text-slate-600">{vaccinationUi.completed}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500 mb-1">{vaccinationUi.ageSummary}</div>
                <div className="text-2xl font-bold text-blue-600">{formattedAge}</div>
                <div className="text-sm text-slate-600">{vaccinationUi.ageHint}</div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{vaccinationUi.generalNotes}</label>
              <Textarea
                value={vaccinationProfile.notes}
                onChange={(e) => setVaccinationProfile((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder={vaccinationUi.generalNotesPlaceholder}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schedule.map((item) => (
            <Card key={item.id} className="border-l-4 border-l-green-500">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="text-sm font-semibold text-green-700 mb-2">{t("ageGroup") || "Tranche d'âge"}</div>
                    <div className="text-lg font-bold text-slate-800">{item.age}</div>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-xs font-medium ${vaccinationProfile.records[item.id]?.completed ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                    {vaccinationProfile.records[item.id]?.completed ? vaccinationUi.completed : vaccinationUi.pending}
                  </div>
                </div>
                <div className="text-sm font-semibold text-slate-700 mb-1">{t("recommendedVaccines") || "Vaccins recommandés"}</div>
                <div className="text-sm text-slate-600 leading-6 mb-4">{item.vaccines}</div>
                <label className="flex items-center gap-2 text-sm font-medium mb-3">
                  <input
                    type="checkbox"
                    checked={Boolean(vaccinationProfile.records[item.id]?.completed)}
                    onChange={(e) => updateVaccinationRecord(item.id, "completed", e.target.checked)}
                    className="rounded"
                  />
                  <span>{vaccinationUi.markDone}</span>
                </label>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">{vaccinationUi.completionDate}</label>
                    <Input
                      type="date"
                      value={vaccinationProfile.records[item.id]?.date || ""}
                      onChange={(e) => updateVaccinationRecord(item.id, "date", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{vaccinationUi.stageNotes}</label>
                    <Input
                      value={vaccinationProfile.records[item.id]?.notes || ""}
                      onChange={(e) => updateVaccinationRecord(item.id, "notes", e.target.value)}
                      placeholder={vaccinationUi.stageNotesPlaceholder}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const NutritionGuide = () => {
    return (
      <NutritionGuideTool
        language={language}
        downloadLabel={childTrackingUi.download}
        onDownloadFile={downloadTextFile}
      />
    );
  };

  const DevelopmentMilestones = () => {
    return (
      <DevelopmentMilestonesTool
        language={language}
        downloadButtonLabel={childTrackingUi.download}
        onDownloadFile={downloadTextFile}
      />
    );
  };

  const CommunitySupportTool = () => {
    return (
      <CommunitySupportToolPanel
        language={language}
        onDownloadFile={downloadTextFile}
      />
    );
  };

  // Render selected tool
  const renderTool = () => {
    switch (activeTool) {
      case "pregnancy":
        return <PregnancyCalculator />;
      case "baby":
        return <BabyGrowthTracker />;
      case "temperature":
        return <TemperatureTracker />;
      case "emergency":
        return <EmergencyContacts />;
      case "vaccination":
        return <VaccinationSchedule />;
      case "nutrition":
        return <NutritionGuide />;
      case "development":
        return <DevelopmentMilestones />;
      case "community":
        return <CommunitySupportTool />;
      default:
        return (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calculator className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              {t("selectTool") || "Sélectionnez un outil"}
            </h3>
            <p className="text-slate-600">
              {t("selectToolDesc") || "Choisissez un outil dans la liste pour commencer"}
            </p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            {t("toolsTitle") || "Outils pour mamans"}
          </h1>
          <p className="text-slate-600">
            {t("toolsDescription") || "Des outils pratiques pour vous aider dans votre quotidien de maman"}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Tools Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  {t("availableTools") || "Outils disponibles"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTool(tool.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      activeTool === tool.id 
                        ? 'bg-gradient-to-r ' + tool.color + ' text-white' 
                        : 'hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        activeTool === tool.id 
                          ? 'bg-white bg-opacity-20' 
                          : 'bg-gradient-to-r ' + tool.color + ' text-white'
                      }`}>
                        <tool.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{tool.title}</div>
                        <div className={`text-xs ${activeTool === tool.id ? 'text-white opacity-80' : 'text-slate-600'}`}>
                          {tool.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Tool Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>
                  {activeTool && tools.find(t => t.id === activeTool)?.title || 
                   t("selectTool") || "Sélectionnez un outil"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderTool()}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
