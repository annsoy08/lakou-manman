"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const developmentMilestonesStorageKey = "lakou-manman-development-milestones";

function getTodayDateValue() {
  return new Date().toISOString().slice(0, 10);
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

export default function DevelopmentMilestonesTool({ language, downloadButtonLabel, onDownloadFile }) {
  const [developmentProfile, setDevelopmentProfile] = useState(() => readToolStateFromStorage(developmentMilestonesStorageKey, {
    childName: "",
    birthDate: "",
    selectedAgeGroup: "all",
    notes: "",
    records: {}
  }));

  useEffect(() => {
    writeToolStateToStorage(developmentMilestonesStorageKey, developmentProfile);
  }, [developmentProfile]);

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
    if (typeof onDownloadFile !== "function") {
      return;
    }

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

    onDownloadFile(`developpement-enfant-${developmentProfile.childName || "profil"}.txt`, content);
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
        <Card className="border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50">
          <CardContent className="p-4">
            <div className="text-sm text-slate-500">{developmentUi.progress}</div>
            <div className="mt-1 text-2xl font-bold text-rose-600">{completedMilestones}/{totalMilestones}</div>
            <div className="text-sm text-slate-600">{developmentUi.completed}</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
          <CardContent className="p-4">
            <div className="text-sm text-slate-500">{developmentUi.suggestedStage}</div>
            <div className="mt-1 text-xl font-bold text-blue-600">{suggestedGroup?.label || "--"}</div>
            <div className="text-sm text-slate-600">{ageInMonths === null ? developmentUi.noBirthDate : `${developmentUi.ageNow}: ${ageInMonths >= 24 ? `${Math.floor(ageInMonths / 12)} ${developmentUi.years}` : `${ageInMonths} ${developmentUi.months}`}`}</div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50">
          <CardContent className="flex h-full items-center justify-between p-4">
            <div>
              <div className="text-sm text-slate-500">{developmentUi.download}</div>
              <div className="text-sm text-slate-600">{language === "ht" ? "Kenbe yon kopi pou doktè oswa lekòl la" : "Gardez une copie pour le médecin ou l'école"}</div>
            </div>
            <Button variant="outline" onClick={handleDownloadDevelopmentProfile}>
              <Download className="mr-2 h-4 w-4" />
              {downloadButtonLabel}
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
}
