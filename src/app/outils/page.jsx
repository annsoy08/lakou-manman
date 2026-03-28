"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getUserVaccinationProfile, saveUserVaccinationProfile } from "@/lib/firestore";
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
const developmentMilestonesStorageKey = "lakou-manman-development-milestones";
const communityRequestsStorageKey = "lakou-manman-community-support-requests";
const communityOffersStorageKey = "lakou-manman-community-support-offers";

function getTodayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function createToolEntryId(prefix = "tool") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

function readToolStateFromStorage(storageKey, fallbackValue) {
  if (typeof window === "undefined") {
    return fallbackValue;
  }

  try {
    const savedValue = window.localStorage.getItem(storageKey);
    if (!savedValue) {
      return fallbackValue;
    }

    const parsedValue = JSON.parse(savedValue);

    if (Array.isArray(fallbackValue)) {
      return Array.isArray(parsedValue) ? parsedValue : fallbackValue;
    }

    if (fallbackValue && typeof fallbackValue === "object" && !Array.isArray(fallbackValue)) {
      return parsedValue && typeof parsedValue === "object" && !Array.isArray(parsedValue)
        ? { ...fallbackValue, ...parsedValue }
        : fallbackValue;
    }

    return parsedValue ?? fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function writeToolStateToStorage(storageKey, value) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
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

function calculateAgeInMonths(dateValue) {
  if (!dateValue) {
    return null;
  }

  try {
    const birthDate = new Date(`${dateValue}T00:00:00`);
    const now = new Date();
    const diffInDays = Math.max(0, Math.floor((now - birthDate) / (24 * 60 * 60 * 1000)));
    return Math.floor(diffInDays / 30.4);
  } catch {
    return null;
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
  const [pregnancyData, setPregnancyData] = useState({
    lastPeriod: "",
    cycleLength: 28
  });
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
  const [developmentProfile, setDevelopmentProfile] = useState(() => readToolStateFromStorage(developmentMilestonesStorageKey, {
    childName: "",
    birthDate: "",
    selectedAgeGroup: "all",
    notes: "",
    records: {}
  }));
  const [communityRequestForm, setCommunityRequestForm] = useState({
    supportType: "",
    urgency: "standard",
    location: "",
    details: "",
    contactPreference: "private"
  });
  const [communityOfferForm, setCommunityOfferForm] = useState({
    helpType: "",
    availability: "thisWeek",
    location: "",
    details: ""
  });
  const [communityRequests, setCommunityRequests] = useState(() => readToolStateFromStorage(communityRequestsStorageKey, []));
  const [communityOffers, setCommunityOffers] = useState(() => readToolStateFromStorage(communityOffersStorageKey, []));

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

  useEffect(() => {
    writeToolStateToStorage(developmentMilestonesStorageKey, developmentProfile);
  }, [developmentProfile]);

  useEffect(() => {
    writeToolStateToStorage(communityRequestsStorageKey, communityRequests);
  }, [communityRequests]);

  useEffect(() => {
    writeToolStateToStorage(communityOffersStorageKey, communityOffers);
  }, [communityOffers]);

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
    const calculateDueDate = () => {
      if (!pregnancyData.lastPeriod) return null;
      
      const lastPeriod = new Date(pregnancyData.lastPeriod);
      const dueDate = new Date(lastPeriod);
      dueDate.setDate(dueDate.getDate() + 280); // 40 weeks
      
      const today = new Date();
      const weeks = Math.floor((today - lastPeriod) / (7 * 24 * 60 * 60 * 1000));
      const days = Math.floor((today - lastPeriod) / (24 * 60 * 60 * 1000)) % 7;
      
      return {
        dueDate: dueDate.toLocaleDateString(),
        currentWeek: weeks,
        currentDay: days,
        trimester: weeks <= 12 ? 1 : weeks <= 28 ? 2 : 3,
        daysLeft: Math.floor((dueDate - today) / (24 * 60 * 60 * 1000))
      };
    };

    const result = calculateDueDate();

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("lastPeriodDate") || "Date des dernières règles"}
            </label>
            <Input
              type="date"
              value={pregnancyData.lastPeriod}
              onChange={(e) => setPregnancyData({...pregnancyData, lastPeriod: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("cycleLength") || "Durée du cycle (jours)"}
            </label>
            <Input
              type="number"
              value={pregnancyData.cycleLength}
              onChange={(e) => setPregnancyData({...pregnancyData, cycleLength: parseInt(e.target.value)})}
              min="21"
              max="35"
            />
          </div>
        </div>

        {result && (
          <Card className="bg-gradient-to-r from-pink-50 to-purple-50 border-pink-200">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">{t("pregnancyResults") || "Résultats grossesse"}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-pink-600">{result.currentWeek}</div>
                  <div className="text-sm text-slate-600">{t("weeks") || "Semaines"}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{result.currentDay}</div>
                  <div className="text-sm text-slate-600">{t("days") || "Jours"}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{result.trimester}</div>
                  <div className="text-sm text-slate-600">{t("trimester") || "Trimestre"}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{result.daysLeft}</div>
                  <div className="text-sm text-slate-600">{t("daysLeft") || "Jours restants"}</div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-white rounded-lg">
                <div className="font-medium">{t("dueDate") || "Date d'accouchement prévue"}:</div>
                <div className="text-lg text-pink-600">{result.dueDate}</div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
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
      t("cough") || "Toux",
      t("runnyNose") || "Nez qui coule",
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
    const nutritionUi = language === "ht"
      ? {
          ageLabel: "Laj timoun nan",
          agePlaceholder: "Chwazi yon gwoup laj",
          feedingLabel: "Kalite alimantasyon",
          feedingPlaceholder: "Chwazi kalite alimantasyon an",
          goalLabel: "Sa ou bezwen jodi a",
          goalPlaceholder: "Chwazi yon objektif",
          ageGroups: [
            { value: "0-6", label: "0-6 mwa" },
            { value: "6-12", label: "6-12 mwa" },
            { value: "1-3", label: "1-3 an" },
            { value: "4-6", label: "4-6 an" }
          ],
          feedingTypes: [
            { value: "breastfeeding", label: "Tete sèlman" },
            { value: "formula", label: "Lèt fòmil" },
            { value: "mixed", label: "Tete + lèt fòmil" },
            { value: "solids", label: "Divèsifikasyon / manje solid" }
          ],
          goals: [
            { value: "routine", label: "Woutin manje" },
            { value: "weight", label: "Pran pwa" },
            { value: "digestion", label: "Dijesyon / konstipasyon" },
            { value: "hydration", label: "Idratasyon" }
          ],
          summary: "Rekòmandasyon pèsonalize",
          foods: "Sa ou ka bay",
          avoid: "Sa pou evite",
          tips: "Konsèy rapid",
          alert: "Lè pou pale ak yon pedyat",
          empty: "Chwazi laj, kalite alimantasyon ak objektif pou wè gid la."
        }
      : {
          ageLabel: "Âge de l'enfant",
          agePlaceholder: "Choisissez une tranche d'âge",
          feedingLabel: "Type d'alimentation",
          feedingPlaceholder: "Choisissez le type d'alimentation",
          goalLabel: "Besoin du moment",
          goalPlaceholder: "Choisissez un objectif",
          ageGroups: [
            { value: "0-6", label: "0-6 mois" },
            { value: "6-12", label: "6-12 mois" },
            { value: "1-3", label: "1-3 ans" },
            { value: "4-6", label: "4-6 ans" }
          ],
          feedingTypes: [
            { value: "breastfeeding", label: "Allaitement maternel" },
            { value: "formula", label: "Lait infantile" },
            { value: "mixed", label: "Mixte" },
            { value: "solids", label: "Diversification / solides" }
          ],
          goals: [
            { value: "routine", label: "Routine repas" },
            { value: "weight", label: "Prise de poids" },
            { value: "digestion", label: "Digestion / constipation" },
            { value: "hydration", label: "Hydratation" }
          ],
          summary: "Recommandations personnalisées",
          foods: "Aliments conseillés",
          avoid: "À éviter",
          tips: "Conseils rapides",
          alert: "Quand consulter un pédiatre",
          empty: "Choisissez l'âge, le type d'alimentation et le besoin pour afficher le guide."
        };

    const [ageGroup, setAgeGroup] = useState("");
    const [feedingType, setFeedingType] = useState("");
    const [goal, setGoal] = useState("");

    const guideByAge = {
      "0-6": language === "ht"
        ? {
            foods: ["Tete sou demann", "Lèt fòmil si pedyat la konseye sa", "Po ti kantite lèt men souvan"],
            avoid: ["Dlo anvan 6 mwa san avi medikal", "Ji", "Lwil oswa te"],
            tips: ["Swiv kantite pipi tibebe a", "Obsève si li pran pwa byen", "Fè l ròt apre manje"],
            alert: "Si tibebe a pa pran pwa, pa vle tete, oswa li parèt dezidrate."
          }
        : {
            foods: ["Allaitement à la demande", "Lait infantile si recommandé", "Petites quantités fréquentes"],
            avoid: ["Eau avant 6 mois sans avis médical", "Jus", "Tisanes ou huiles"],
            tips: ["Surveillez les couches mouillées", "Vérifiez la prise de poids", "Faites faire le rot après les repas"],
            alert: "Consultez si bébé prend mal du poids, refuse de téter ou semble déshydraté."
          },
      "6-12": language === "ht"
        ? {
            foods: ["Labouyi sereyal fè", "Legim kraze", "Fwi kraze", "Pwoteyin mou tankou ze byen kwit oswa pwa kraze"],
            avoid: ["Sèl twòp", "Sik", "Siwo myèl anvan 1 an", "Moso manje ki ka bloke gòj la"],
            tips: ["Entwodui youn nouvo manje alafwa", "Kenbe lèt kòm baz alimantasyon an", "Obsève alèji posib"],
            alert: "Si timoun nan vomi souvan, gen dyare, oswa li pa aksepte okenn manje solid."
          }
        : {
            foods: ["Bouillies enrichies", "Purées de légumes", "Compotes sans sucre", "Protéines molles comme œuf bien cuit ou purée de pois"],
            avoid: ["Trop de sel", "Sucre ajouté", "Miel avant 1 an", "Morceaux à risque d'étouffement"],
            tips: ["Introduisez un aliment à la fois", "Gardez le lait comme base principale", "Surveillez les réactions allergiques"],
            alert: "Consultez si l'enfant vomit souvent, a de la diarrhée ou refuse totalement les solides."
          },
      "1-3": language === "ht"
        ? {
            foods: ["3 ti repa + 1 a 2 goute", "Legim, fwi, ze, pwa, diri, bannann, lèt oswa yogout"],
            avoid: ["Bwason dous", "Twòp fri", "Ti sirèt souvan"],
            tips: ["Ofri dlo pandan jounen an", "Pa fòse manje", "Fè yon orè regilye"],
            alert: "Si timoun nan pèdi pwa, fatige anpil oswa manje trè limite."
          }
        : {
            foods: ["3 petits repas + 1 à 2 collations", "Légumes, fruits, œufs, haricots, riz, banane, lait ou yaourt"],
            avoid: ["Boissons sucrées", "Trop de fritures", "Grignotage sucré fréquent"],
            tips: ["Proposez de l'eau dans la journée", "Ne forcez pas à manger", "Gardez des horaires réguliers"],
            alert: "Consultez si l'enfant perd du poids, paraît très fatigué ou mange extrêmement peu."
          },
      "4-6": language === "ht"
        ? {
            foods: ["Repa familyal ekilibre", "Pwoteyin chak jou", "Fwi ak legim varye", "Bon dejene chak maten"],
            avoid: ["Soda", "Twòp chips ak bonbon", "Repas sote souvan"],
            tips: ["Fè timoun nan patisipe nan chwa manje yo", "Bay bon egzanp lakay", "Kenbe aktivite fizik"],
            alert: "Si gen gwo chanjman apeti, doulè vant repete oswa ralantisman kwasans."
          }
        : {
            foods: ["Repas familiaux équilibrés", "Protéines chaque jour", "Fruits et légumes variés", "Petit-déjeuner quotidien"],
            avoid: ["Sodas", "Excès de chips et biscuits", "Repas sautés régulièrement"],
            tips: ["Impliquez l'enfant dans le choix des aliments", "Donnez l'exemple à la maison", "Maintenez une activité physique"],
            alert: "Consultez si l'appétit change brutalement, en cas de douleurs abdominales répétées ou de ralentissement de croissance."
          }
    };

    const goalAdjustments = {
      routine: language === "ht"
        ? ["Kenbe menm lè pou repa yo chak jou", "Privilèjye manje senp ak natirèl"]
        : ["Gardez des horaires de repas stables", "Privilégiez des repas simples et naturels"],
      weight: language === "ht"
        ? ["Ajoute manje ki bay enèji tankou zaboka, patat, bannann", "Mete pwoteyin souvan nan repa yo"]
        : ["Ajoutez des aliments énergétiques comme avocat, patate, banane", "Intégrez des protéines régulièrement"],
      digestion: language === "ht"
        ? ["Bay plis dlo selon laj la", "Privilèjye fwi ak legim ki gen fib"]
        : ["Augmentez l'eau selon l'âge", "Privilégiez fruits et légumes riches en fibres"],
      hydration: language === "ht"
        ? ["Ofri dlo souvan", "Siveye si bouch la sèch oswa pipi a ra"]
        : ["Proposez de l'eau souvent", "Surveillez bouche sèche ou urines rares"]
    };

    const recommendation = ageGroup
      ? {
          ...guideByAge[ageGroup],
          tips: [...(guideByAge[ageGroup]?.tips || []), ...(goalAdjustments[goal] || [])]
        }
      : null;

    const handleDownloadNutritionGuide = () => {
      if (!recommendation) {
        return;
      }

      const content = [
        language === "ht" ? "Gid nitrisyon timoun" : "Guide nutrition enfant",
        "",
        `${nutritionUi.ageLabel}: ${nutritionUi.ageGroups.find((option) => option.value === ageGroup)?.label || "--"}`,
        `${nutritionUi.feedingLabel}: ${nutritionUi.feedingTypes.find((option) => option.value === feedingType)?.label || "--"}`,
        `${nutritionUi.goalLabel}: ${nutritionUi.goals.find((option) => option.value === goal)?.label || "--"}`,
        "",
        `${nutritionUi.foods}: ${recommendation.foods.join(", ")}`,
        `${nutritionUi.avoid}: ${recommendation.avoid.join(", ")}`,
        `${nutritionUi.tips}: ${recommendation.tips.join(", ")}`,
        `${nutritionUi.alert}: ${recommendation.alert}`,
      ].join("\n");

      downloadTextFile(`guide-nutrition-${ageGroup || "enfant"}.txt`, content);
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">{nutritionUi.ageLabel}</label>
            <select
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              className="w-full rounded-xl border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B2335]"
            >
              <option value="">{nutritionUi.agePlaceholder}</option>
              {nutritionUi.ageGroups.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{nutritionUi.feedingLabel}</label>
            <select
              value={feedingType}
              onChange={(e) => setFeedingType(e.target.value)}
              className="w-full rounded-xl border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B2335]"
            >
              <option value="">{nutritionUi.feedingPlaceholder}</option>
              {nutritionUi.feedingTypes.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{nutritionUi.goalLabel}</label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full rounded-xl border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B2335]"
            >
              <option value="">{nutritionUi.goalPlaceholder}</option>
              {nutritionUi.goals.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        {!recommendation ? (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-6 text-sm text-yellow-800">
              {nutritionUi.empty}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleDownloadNutritionGuide}>
                <Download className="mr-2 h-4 w-4" />
                {childTrackingUi.download}
              </Button>
            </div>
            <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">{nutritionUi.summary}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="mb-2 font-medium text-slate-800">{nutritionUi.foods}</h4>
                    <ul className="space-y-1 text-sm text-slate-600">
                      {recommendation.foods.map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="mb-2 font-medium text-slate-800">{nutritionUi.avoid}</h4>
                    <ul className="space-y-1 text-sm text-slate-600">
                      {recommendation.avoid.map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h4 className="mb-2 font-medium text-slate-800">{nutritionUi.tips}</h4>
                <ul className="space-y-1 text-sm text-slate-600">
                  {recommendation.tips.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6">
                <h4 className="mb-2 font-medium text-red-800">{nutritionUi.alert}</h4>
                <p className="text-sm text-red-700">{recommendation.alert}</p>
                {feedingType && (
                  <p className="mt-3 text-sm text-red-700">
                    {language === "ht"
                      ? `Kalite alimantasyon chwazi a: ${nutritionUi.feedingTypes.find((option) => option.value === feedingType)?.label}`
                      : `Type d'alimentation choisi : ${nutritionUi.feedingTypes.find((option) => option.value === feedingType)?.label}`}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  };

  const DevelopmentMilestones = () => {
    const developmentUi = language === "ht"
      ? {
          childName: "Non timoun nan",
          childNamePlaceholder: "Ekri non timoun nan",
          birthDate: "Dat nesans",
          ageGroupLabel: "Etap ou vle swiv",
          allStages: "Tout etap yo",
          progress: "Pwogrè jeneral",
          completed: "etap valide",
          suggestedStage: "Etap rekòmande",
          profileNotes: "Nòt jeneral",
          profileNotesPlaceholder: "Ekri sa ou remake sou devlopman timoun nan",
          milestoneDate: "Dat obsèvasyon an",
          milestoneNote: "Nòt sou etap la",
          milestoneNotePlaceholder: "Egzanp: li leve tèt li pi byen semèn sa a",
          markDone: "Make etap sa a kòm fèt",
          noBirthDate: "Antre dat nesans la pou wè etap ki pi adapte a.",
          download: "Telechaje swivi a",
          ageNow: "Laj estime",
          months: "mwa",
          years: "an",
          domains: {
            motor: "Motrisite",
            language: "Langaj",
            social: "Sosyal",
            feeding: "Alimantasyon"
          },
          groups: [
            {
              id: "0-3",
              label: "0-3 mwa",
              minMonths: 0,
              maxMonths: 3,
              milestones: [
                { id: "head-control", domain: "motor", label: "Li kòmanse kenbe tèt li" },
                { id: "tracks-face", domain: "social", label: "Li swiv figi oswa limyè ak je li" },
                { id: "coos", domain: "language", label: "Li fè ti son dous" }
              ]
            },
            {
              id: "4-6",
              label: "4-6 mwa",
              minMonths: 4,
              maxMonths: 6,
              milestones: [
                { id: "rolls-over", domain: "motor", label: "Li vire sou kote oswa sou vant" },
                { id: "laughs", domain: "social", label: "Li ri oswa montre lajwa" },
                { id: "responds-voice", domain: "language", label: "Li reyaji lè w pale avè l" }
              ]
            },
            {
              id: "7-12",
              label: "7-12 mwa",
              minMonths: 7,
              maxMonths: 12,
              milestones: [
                { id: "sits-alone", domain: "motor", label: "Li chita san twòp sipò" },
                { id: "babbling", domain: "language", label: "Li repete silab tankou ba-ba, ma-ma" },
                { id: "finger-food", domain: "feeding", label: "Li eseye pran manje ak men li" }
              ]
            },
            {
              id: "1-2-years",
              label: "1-2 an",
              minMonths: 12,
              maxMonths: 24,
              milestones: [
                { id: "walks", domain: "motor", label: "Li mache oswa eseye mache" },
                { id: "first-words", domain: "language", label: "Li di premye mo yo" },
                { id: "imitates", domain: "social", label: "Li imite granmoun yo nan jwèt" }
              ]
            },
            {
              id: "2-3-years",
              label: "2-3 an",
              minMonths: 24,
              maxMonths: 36,
              milestones: [
                { id: "runs", domain: "motor", label: "Li kouri oswa monte fasil" },
                { id: "short-sentences", domain: "language", label: "Li fè ti fraz kout" },
                { id: "plays-with-others", domain: "social", label: "Li kòmanse jwe ak lòt timoun" }
              ]
            }
          ]
        }
      : {
          childName: "Nom de l'enfant",
          childNamePlaceholder: "Entrez le nom de l'enfant",
          birthDate: "Date de naissance",
          ageGroupLabel: "Étape à suivre",
          allStages: "Toutes les étapes",
          progress: "Progression globale",
          completed: "étapes validées",
          suggestedStage: "Étape recommandée",
          profileNotes: "Notes générales",
          profileNotesPlaceholder: "Ajoutez vos observations sur le développement de l'enfant",
          milestoneDate: "Date d'observation",
          milestoneNote: "Note sur l'étape",
          milestoneNotePlaceholder: "Ex: il tient mieux sa tête cette semaine",
          markDone: "Marquer cette étape comme réalisée",
          noBirthDate: "Renseignez la date de naissance pour afficher l'étape la plus adaptée.",
          download: "Télécharger le suivi",
          ageNow: "Âge estimé",
          months: "mois",
          years: "ans",
          domains: {
            motor: "Motricité",
            language: "Langage",
            social: "Social",
            feeding: "Alimentation"
          },
          groups: [
            {
              id: "0-3",
              label: "0-3 mois",
              minMonths: 0,
              maxMonths: 3,
              milestones: [
                { id: "head-control", domain: "motor", label: "Commence à tenir sa tête" },
                { id: "tracks-face", domain: "social", label: "Suit un visage ou une lumière du regard" },
                { id: "coos", domain: "language", label: "Émet de petits sons / vocalises" }
              ]
            },
            {
              id: "4-6",
              label: "4-6 mois",
              minMonths: 4,
              maxMonths: 6,
              milestones: [
                { id: "rolls-over", domain: "motor", label: "Se retourne sur le côté ou sur le ventre" },
                { id: "laughs", domain: "social", label: "Rit et montre sa joie" },
                { id: "responds-voice", domain: "language", label: "Réagit quand on lui parle" }
              ]
            },
            {
              id: "7-12",
              label: "7-12 mois",
              minMonths: 7,
              maxMonths: 12,
              milestones: [
                { id: "sits-alone", domain: "motor", label: "S'assoit avec peu ou sans soutien" },
                { id: "babbling", domain: "language", label: "Répète des syllabes comme ba-ba, ma-ma" },
                { id: "finger-food", domain: "feeding", label: "Essaie de prendre les aliments avec la main" }
              ]
            },
            {
              id: "1-2-years",
              label: "1-2 ans",
              minMonths: 12,
              maxMonths: 24,
              milestones: [
                { id: "walks", domain: "motor", label: "Marche ou essaie de marcher" },
                { id: "first-words", domain: "language", label: "Dit ses premiers mots" },
                { id: "imitates", domain: "social", label: "Imite les adultes dans le jeu" }
              ]
            },
            {
              id: "2-3-years",
              label: "2-3 ans",
              minMonths: 24,
              maxMonths: 36,
              milestones: [
                { id: "runs", domain: "motor", label: "Court ou monte plus facilement" },
                { id: "short-sentences", domain: "language", label: "Fait de petites phrases" },
                { id: "plays-with-others", domain: "social", label: "Commence à jouer avec d'autres enfants" }
              ]
            }
          ]
        };

    const ageInMonths = calculateAgeInMonths(developmentProfile.birthDate);
    const suggestedGroup = ageInMonths === null
      ? null
      : developmentUi.groups.find((group) => ageInMonths >= group.minMonths && ageInMonths <= group.maxMonths)
        || developmentUi.groups[developmentUi.groups.length - 1];
    const visibleGroupId = developmentProfile.selectedAgeGroup === "all"
      ? suggestedGroup?.id || "all"
      : developmentProfile.selectedAgeGroup;
    const visibleGroups = visibleGroupId === "all"
      ? developmentUi.groups
      : developmentUi.groups.filter((group) => group.id === visibleGroupId);
    const totalMilestones = developmentUi.groups.reduce((count, group) => count + group.milestones.length, 0);
    const completedMilestones = developmentUi.groups.reduce(
      (count, group) => count + group.milestones.filter((milestone) => developmentProfile.records[milestone.id]?.completed).length,
      0
    );

    const handleMilestoneToggle = (milestoneId, checked) => {
      setDevelopmentProfile((previous) => ({
        ...previous,
        records: {
          ...previous.records,
          [milestoneId]: {
            ...previous.records[milestoneId],
            completed: checked,
            completedAt: checked
              ? previous.records[milestoneId]?.completedAt || getTodayDateValue()
              : "",
          },
        },
      }));
    };

    const updateMilestoneRecord = (milestoneId, field, value) => {
      setDevelopmentProfile((previous) => ({
        ...previous,
        records: {
          ...previous.records,
          [milestoneId]: {
            ...previous.records[milestoneId],
            [field]: value,
          },
        },
      }));
    };

    const handleDownloadDevelopmentProfile = () => {
      const content = [
        language === "ht" ? "Swivi etap devlopman timoun" : "Suivi des étapes de développement",
        "",
        `${developmentUi.childName}: ${developmentProfile.childName || "--"}`,
        `${developmentUi.birthDate}: ${formatToolDate(developmentProfile.birthDate, language)}`,
        `${developmentUi.progress}: ${completedMilestones}/${totalMilestones}`,
        `${developmentUi.profileNotes}: ${developmentProfile.notes || "--"}`,
        "",
        ...developmentUi.groups.map((group) => {
          const groupLines = group.milestones.map((milestone) => {
            const record = developmentProfile.records[milestone.id] || {};
            return [
              `${milestone.label}`,
              `${developmentUi.markDone}: ${record.completed ? "Oui" : "Non"}`,
              `${developmentUi.milestoneDate}: ${record.completedAt ? formatToolDate(record.completedAt, language) : "--"}`,
              `${developmentUi.milestoneNote}: ${record.note || "--"}`,
            ].join(" | ");
          });

          return [group.label, ...groupLines].join("\n");
        }),
      ].join("\n");

      downloadTextFile(`developpement-enfant-${developmentProfile.childName || "profil"}.txt`, content);
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium">{developmentUi.childName}</label>
            <Input
              value={developmentProfile.childName}
              onChange={(e) => setDevelopmentProfile((previous) => ({ ...previous, childName: e.target.value }))}
              placeholder={developmentUi.childNamePlaceholder}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">{developmentUi.birthDate}</label>
            <Input
              type="date"
              value={developmentProfile.birthDate}
              onChange={(e) => setDevelopmentProfile((previous) => ({ ...previous, birthDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">{developmentUi.ageGroupLabel}</label>
            <select
              value={developmentProfile.selectedAgeGroup}
              onChange={(e) => setDevelopmentProfile((previous) => ({ ...previous, selectedAgeGroup: e.target.value }))}
              className="w-full rounded-xl border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B2335]"
            >
              <option value="all">{developmentUi.allStages}</option>
              {developmentUi.groups.map((group) => (
                <option key={group.id} value={group.id}>{group.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200">
            <CardContent className="p-4">
              <div className="text-sm text-slate-500">{developmentUi.progress}</div>
              <div className="mt-1 text-2xl font-bold text-rose-600">{completedMilestones}/{totalMilestones}</div>
              <div className="text-sm text-slate-600">{developmentUi.completed}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
            <CardContent className="p-4">
              <div className="text-sm text-slate-500">{developmentUi.suggestedStage}</div>
              <div className="mt-1 text-xl font-bold text-blue-600">{suggestedGroup?.label || "--"}</div>
              <div className="text-sm text-slate-600">{ageInMonths === null ? developmentUi.noBirthDate : `${developmentUi.ageNow}: ${ageInMonths >= 24 ? `${Math.floor(ageInMonths / 12)} ${developmentUi.years}` : `${ageInMonths} ${developmentUi.months}`}`}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200">
            <CardContent className="flex h-full items-center justify-between p-4">
              <div>
                <div className="text-sm text-slate-500">{developmentUi.download}</div>
                <div className="text-sm text-slate-600">{language === "ht" ? "Kenbe yon kopi pou doktè oswa lekòl la" : "Gardez une copie pour le médecin ou l'école"}</div>
              </div>
              <Button variant="outline" onClick={handleDownloadDevelopmentProfile}>
                <Download className="mr-2 h-4 w-4" />
                {childTrackingUi.download}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">{developmentUi.profileNotes}</label>
          <Textarea
            value={developmentProfile.notes}
            onChange={(e) => setDevelopmentProfile((previous) => ({ ...previous, notes: e.target.value }))}
            placeholder={developmentUi.profileNotesPlaceholder}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {visibleGroups.map((group) => (
            <Card key={group.id} className={`border-l-4 ${group.id === suggestedGroup?.id ? "border-l-[#9B2335]" : "border-l-slate-300"}`}>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-700">{group.label}</div>
                    <div className="text-xs text-slate-500">{group.milestones.filter((milestone) => developmentProfile.records[milestone.id]?.completed).length}/{group.milestones.length}</div>
                  </div>
                  {group.id === suggestedGroup?.id ? (
                    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">{developmentUi.suggestedStage}</span>
                  ) : null}
                </div>

                {group.milestones.map((milestone) => (
                  <div key={milestone.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-800">{milestone.label}</div>
                        <div className="mt-1 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{developmentUi.domains[milestone.domain]}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(developmentProfile.records[milestone.id]?.completed)}
                        onChange={(e) => handleMilestoneToggle(milestone.id, e.target.checked)}
                        className="mt-1 rounded"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium">{developmentUi.milestoneDate}</label>
                        <Input
                          type="date"
                          value={developmentProfile.records[milestone.id]?.completedAt || ""}
                          onChange={(e) => updateMilestoneRecord(milestone.id, "completedAt", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium">{developmentUi.milestoneNote}</label>
                        <Input
                          value={developmentProfile.records[milestone.id]?.note || ""}
                          onChange={(e) => updateMilestoneRecord(milestone.id, "note", e.target.value)}
                          placeholder={developmentUi.milestoneNotePlaceholder}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const CommunitySupportTool = () => {
    const communityUi = language === "ht"
      ? {
          requestTitle: "Mande soutyen",
          offerTitle: "Pwopoze èd",
          supportType: "Kalite sipò",
          urgency: "Nivo ijans",
          location: "Zòn oswa vil",
          details: "Detay",
          contactPreference: "Kijan ou vle moun kontakte ou",
          availability: "Disponiblite",
          saveRequest: "Anrejistre demann lan",
          saveOffer: "Anrejistre òf la",
          recentRequests: "Dènye demann yo",
          recentOffers: "Dènye òf èd yo",
          resources: "Resous itil",
          export: "Telechaje rezime a",
          noRequests: "Pa gen demann pou kounye a.",
          noOffers: "Pa gen òf èd pou kounye a.",
          requestPlaceholder: "Eksplike sa ou bezwen oswa poukisa li ijan",
          offerPlaceholder: "Eksplike kijan ou ka ede oubyen ki lè ou disponib",
          supportTypes: [
            { value: "emotional", label: "Soutyen emosyonèl" },
            { value: "material", label: "Èd materyèl" },
            { value: "medical", label: "Resous lasante" },
            { value: "school", label: "Lekòl / devlopman" }
          ],
          offerTypes: [
            { value: "listening", label: "Koute ak ankouraje" },
            { value: "materials", label: "Bay rad / kouch / manje" },
            { value: "referral", label: "Pataje bon kontak" },
            { value: "transport", label: "Ede ak deplasman" }
          ],
          urgencyOptions: [
            { value: "standard", label: "Nòmal" },
            { value: "priority", label: "Priyorite" },
            { value: "urgent", label: "Ijans" }
          ],
          contactOptions: [
            { value: "private", label: "An prive" },
            { value: "public", label: "Nan kominote a" }
          ],
          availabilityOptions: [
            { value: "today", label: "Jodi a" },
            { value: "thisWeek", label: "Semèn sa a" },
            { value: "flexible", label: "Fleksib" }
          ],
          resourceItems: [
            { title: "Gwoup sipò manman yo", description: "Dirije moun nan vè gwoup tematik ki koresponn ak bezwen li." },
            { title: "Sant sante ak lopital", description: "Kenbe yon lis kote ki ka bay swen oswa konsèy." },
            { title: "Kontak ijans ak referans", description: "Pataje pwofesyonèl oswa sèvis serye sèlman." }
          ]
        }
      : {
          requestTitle: "Demander du soutien",
          offerTitle: "Proposer de l'aide",
          supportType: "Type de soutien",
          urgency: "Niveau d'urgence",
          location: "Zone ou ville",
          details: "Détails",
          contactPreference: "Mode de contact souhaité",
          availability: "Disponibilité",
          saveRequest: "Enregistrer la demande",
          saveOffer: "Enregistrer l'offre",
          recentRequests: "Demandes récentes",
          recentOffers: "Offres d'aide récentes",
          resources: "Ressources utiles",
          export: "Télécharger le résumé",
          noRequests: "Aucune demande enregistrée pour le moment.",
          noOffers: "Aucune offre d'aide enregistrée pour le moment.",
          requestPlaceholder: "Expliquez le besoin ou pourquoi la situation est prioritaire",
          offerPlaceholder: "Expliquez comment vous pouvez aider ou quand vous êtes disponible",
          supportTypes: [
            { value: "emotional", label: "Soutien émotionnel" },
            { value: "material", label: "Aide matérielle" },
            { value: "medical", label: "Ressources santé" },
            { value: "school", label: "École / développement" }
          ],
          offerTypes: [
            { value: "listening", label: "Écoute et encouragement" },
            { value: "materials", label: "Dons de vêtements / couches / nourriture" },
            { value: "referral", label: "Partage de contacts fiables" },
            { value: "transport", label: "Aide au déplacement" }
          ],
          urgencyOptions: [
            { value: "standard", label: "Standard" },
            { value: "priority", label: "Prioritaire" },
            { value: "urgent", label: "Urgent" }
          ],
          contactOptions: [
            { value: "private", label: "En privé" },
            { value: "public", label: "Dans la communauté" }
          ],
          availabilityOptions: [
            { value: "today", label: "Aujourd'hui" },
            { value: "thisWeek", label: "Cette semaine" },
            { value: "flexible", label: "Flexible" }
          ],
          resourceItems: [
            { title: "Groupes de soutien entre mamans", description: "Orientez la personne vers un groupe thématique adapté à son besoin." },
            { title: "Centres de santé et hôpitaux", description: "Gardez une liste de lieux de soins ou de conseils fiables." },
            { title: "Contacts d'urgence et références", description: "Partagez uniquement des professionnels et services vérifiés." }
          ]
        };

    const sortedRequests = [...communityRequests].sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || ""))).slice(0, 6);
    const sortedOffers = [...communityOffers].sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || ""))).slice(0, 6);

    const handleSaveCommunityRequest = () => {
      if (!communityRequestForm.supportType || !communityRequestForm.details.trim()) {
        return;
      }

      setCommunityRequests((previous) => ([{
        id: createToolEntryId("support-request"),
        ...communityRequestForm,
        createdAt: new Date().toISOString(),
      }, ...previous]));
      setCommunityRequestForm({
        supportType: "",
        urgency: "standard",
        location: "",
        details: "",
        contactPreference: "private"
      });
    };

    const handleSaveCommunityOffer = () => {
      if (!communityOfferForm.helpType || !communityOfferForm.details.trim()) {
        return;
      }

      setCommunityOffers((previous) => ([{
        id: createToolEntryId("support-offer"),
        ...communityOfferForm,
        createdAt: new Date().toISOString(),
      }, ...previous]));
      setCommunityOfferForm({
        helpType: "",
        availability: "thisWeek",
        location: "",
        details: ""
      });
    };

    const handleDownloadSupportSummary = () => {
      const content = [
        language === "ht" ? "Rezime soutyen kominotè" : "Résumé soutien communautaire",
        "",
        `${communityUi.recentRequests}: ${communityRequests.length}`,
        ...communityRequests.map((entry) => `${formatToolDate(String(entry.createdAt || "").slice(0, 10), language)} | ${communityUi.supportTypes.find((option) => option.value === entry.supportType)?.label || entry.supportType} | ${entry.location || "--"} | ${entry.details}`),
        "",
        `${communityUi.recentOffers}: ${communityOffers.length}`,
        ...communityOffers.map((entry) => `${formatToolDate(String(entry.createdAt || "").slice(0, 10), language)} | ${communityUi.offerTypes.find((option) => option.value === entry.helpType)?.label || entry.helpType} | ${entry.location || "--"} | ${entry.details}`),
      ].join("\n");

      downloadTextFile("soutien-communautaire.txt", content);
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button variant="outline" onClick={handleDownloadSupportSummary}>
            <Download className="mr-2 h-4 w-4" />
            {communityUi.export}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="border-rose-200 bg-gradient-to-br from-rose-50 to-white">
            <CardHeader>
              <CardTitle>{communityUi.requestTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">{communityUi.supportType}</label>
                <select
                  value={communityRequestForm.supportType}
                  onChange={(e) => setCommunityRequestForm((previous) => ({ ...previous, supportType: e.target.value }))}
                  className="w-full rounded-xl border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B2335]"
                >
                  <option value="">{communityUi.supportType}</option>
                  {communityUi.supportTypes.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">{communityUi.urgency}</label>
                  <select
                    value={communityRequestForm.urgency}
                    onChange={(e) => setCommunityRequestForm((previous) => ({ ...previous, urgency: e.target.value }))}
                    className="w-full rounded-xl border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B2335]"
                  >
                    {communityUi.urgencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">{communityUi.contactPreference}</label>
                  <select
                    value={communityRequestForm.contactPreference}
                    onChange={(e) => setCommunityRequestForm((previous) => ({ ...previous, contactPreference: e.target.value }))}
                    className="w-full rounded-xl border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B2335]"
                  >
                    {communityUi.contactOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">{communityUi.location}</label>
                <Input
                  value={communityRequestForm.location}
                  onChange={(e) => setCommunityRequestForm((previous) => ({ ...previous, location: e.target.value }))}
                  placeholder={language === "ht" ? "Eg: Delma, Jakmèl" : "Ex: Delmas, Jacmel"}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">{communityUi.details}</label>
                <Textarea
                  value={communityRequestForm.details}
                  onChange={(e) => setCommunityRequestForm((previous) => ({ ...previous, details: e.target.value }))}
                  placeholder={communityUi.requestPlaceholder}
                  rows={4}
                />
              </div>
              <Button onClick={handleSaveCommunityRequest} disabled={!communityRequestForm.supportType || !communityRequestForm.details.trim()}>
                {communityUi.saveRequest}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader>
              <CardTitle>{communityUi.offerTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">{communityUi.supportType}</label>
                <select
                  value={communityOfferForm.helpType}
                  onChange={(e) => setCommunityOfferForm((previous) => ({ ...previous, helpType: e.target.value }))}
                  className="w-full rounded-xl border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B2335]"
                >
                  <option value="">{communityUi.offerTitle}</option>
                  {communityUi.offerTypes.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">{communityUi.availability}</label>
                  <select
                    value={communityOfferForm.availability}
                    onChange={(e) => setCommunityOfferForm((previous) => ({ ...previous, availability: e.target.value }))}
                    className="w-full rounded-xl border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B2335]"
                  >
                    {communityUi.availabilityOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">{communityUi.location}</label>
                  <Input
                    value={communityOfferForm.location}
                    onChange={(e) => setCommunityOfferForm((previous) => ({ ...previous, location: e.target.value }))}
                    placeholder={language === "ht" ? "Eg: Okap, Pòtoprens" : "Ex: Cap-Haïtien, Port-au-Prince"}
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">{communityUi.details}</label>
                <Textarea
                  value={communityOfferForm.details}
                  onChange={(e) => setCommunityOfferForm((previous) => ({ ...previous, details: e.target.value }))}
                  placeholder={communityUi.offerPlaceholder}
                  rows={4}
                />
              </div>
              <Button onClick={handleSaveCommunityOffer} disabled={!communityOfferForm.helpType || !communityOfferForm.details.trim()}>
                {communityUi.saveOffer}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_.8fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{communityUi.recentRequests}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sortedRequests.length ? sortedRequests.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium text-slate-800">{communityUi.supportTypes.find((option) => option.value === entry.supportType)?.label || entry.supportType}</div>
                      <div className="rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-700">{communityUi.urgencyOptions.find((option) => option.value === entry.urgency)?.label || entry.urgency}</div>
                    </div>
                    <div className="mt-2 text-sm text-slate-600">{entry.details}</div>
                    <div className="mt-2 text-xs text-slate-500">{entry.location || "--"} · {formatToolDate(String(entry.createdAt || "").slice(0, 10), language)}</div>
                  </div>
                )) : (
                  <div className="text-sm text-slate-500">{communityUi.noRequests}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{communityUi.recentOffers}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sortedOffers.length ? sortedOffers.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium text-slate-800">{communityUi.offerTypes.find((option) => option.value === entry.helpType)?.label || entry.helpType}</div>
                      <div className="rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-700">{communityUi.availabilityOptions.find((option) => option.value === entry.availability)?.label || entry.availability}</div>
                    </div>
                    <div className="mt-2 text-sm text-slate-600">{entry.details}</div>
                    <div className="mt-2 text-xs text-slate-500">{entry.location || "--"} · {formatToolDate(String(entry.createdAt || "").slice(0, 10), language)}</div>
                  </div>
                )) : (
                  <div className="text-sm text-slate-500">{communityUi.noOffers}</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
            <CardHeader>
              <CardTitle>{communityUi.resources}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {communityUi.resourceItems.map((resource) => (
                <div key={resource.title} className="rounded-xl bg-white p-4 shadow-sm">
                  <div className="font-medium text-slate-800">{resource.title}</div>
                  <div className="mt-1 text-sm text-slate-600">{resource.description}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
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
