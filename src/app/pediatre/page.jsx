"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import SpecialtyDoctorPublicPage from "@/components/doctor/SpecialtyDoctorPublicPage";
import { getPediatrePageConfig } from "@/lib/doctor-specialty-page-config";

export default function PediatricianPage() {
  const { t, language } = useLanguage();
  const { ui, theme, defaultArticles } = getPediatrePageConfig(language, t);

  return (
    <SpecialtyDoctorPublicPage
      specialtyKey="pediatre"
      dashboardPath="/pediatre-dashboard"
      ui={ui}
      theme={theme}
      defaultArticles={defaultArticles}
    />
  );
}
