"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import SpecialtyDoctorPublicPage from "@/components/doctor/SpecialtyDoctorPublicPage";
import { getPsychologyPageConfig } from "@/lib/doctor-specialty-page-config";

export default function PsychologyPage() {
  const { t, language } = useLanguage();
  const { ui, theme, defaultArticles } = getPsychologyPageConfig(language, t);

  return (
    <SpecialtyDoctorPublicPage
      specialtyKey="psychologie"
      dashboardPath="/psychologie-dashboard"
      ui={ui}
      theme={theme}
      defaultArticles={defaultArticles}
    />
  );
}
