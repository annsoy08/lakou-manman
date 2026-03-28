"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import SpecialtyDoctorPublicPage from "@/components/doctor/SpecialtyDoctorPublicPage";
import { getGynecologyPageConfig } from "@/lib/doctor-specialty-page-config";

export default function GynecologyPage() {
  const { t, language } = useLanguage();
  const { ui, theme, defaultArticles } = getGynecologyPageConfig(language, t);

  return (
    <SpecialtyDoctorPublicPage
      specialtyKey="gynecologie"
      dashboardPath="/gynecologie-dashboard"
      ui={ui}
      theme={theme}
      defaultArticles={defaultArticles}
    />
  );
}
