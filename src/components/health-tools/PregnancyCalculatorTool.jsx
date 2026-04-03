"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function PregnancyCalculatorTool({ t }) {
  const [pregnancyData, setPregnancyData] = useState({
    lastPeriod: "",
    cycleLength: 28
  });

  const calculateDueDate = () => {
    if (!pregnancyData.lastPeriod) return null;

    const lastPeriod = new Date(pregnancyData.lastPeriod);
    const dueDate = new Date(lastPeriod);
    dueDate.setDate(dueDate.getDate() + 280);

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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">
            {t("lastPeriodDate") || "Date des dernières règles"}
          </label>
          <Input
            type="date"
            value={pregnancyData.lastPeriod}
            onChange={(e) => setPregnancyData({ ...pregnancyData, lastPeriod: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">
            {t("cycleLength") || "Durée du cycle (jours)"}
          </label>
          <Input
            type="number"
            value={pregnancyData.cycleLength}
            onChange={(e) => setPregnancyData({ ...pregnancyData, cycleLength: parseInt(e.target.value) })}
            min="21"
            max="35"
          />
        </div>
      </div>

      {result ? (
        <Card className="border-pink-200 bg-gradient-to-r from-pink-50 to-purple-50">
          <CardContent className="p-6">
            <h3 className="mb-4 font-semibold">{t("pregnancyResults") || "Résultats grossesse"}</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
            <div className="mt-4 rounded-lg bg-white p-3">
              <div className="font-medium">{t("dueDate") || "Date d'accouchement prévue"}:</div>
              <div className="text-lg text-pink-600">{result.dueDate}</div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
