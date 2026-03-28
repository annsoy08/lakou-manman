const SPECIALTY_KEYWORDS = {
  pediatre: ["pédi", "pedy", "pedi", "pediatric", "pédiatre", "pediatrician", "child", "enfant", "bébé", "bebe", "nouveau-né", "newborn", "timoun", "tibebe"],
  gynecologie: ["gyn", "gyne", "gyné", "gynéc", "obst", "grossesse", "fertilité", "fertilite", "post-partum", "post partum", "cycle", "menstru", "contracep", "pelvien"],
  psychologie: ["psych", "émotion", "emotion", "stress", "anxi", "anxie", "trist", "charge mentale", "parentalité", "parentalite", "adolesc", "bien-être", "bien etre", "soutien", "mental"],
};

export const DOCTOR_SPECIALTY_STARTER_PROFILES = [
  {
    id: "carlos-lucio-pierre",
    starterSpecialtyKey: "gynecologie",
    displayName: "Carlos Lucio Pierre",
    specialty: "Gynécologie et obstétrique",
    headline: "Suivi gynécologique, grossesse et post-partum",
    bio: "Accompagnement des femmes et des mamans pour le suivi gynécologique, la grossesse, le post-partum et les repères de prévention au quotidien.",
    city: "Port-au-Prince",
    country: "Haïti",
    location: "Port-au-Prince, Haïti",
    languages: ["Français", "Créole"],
    phone: "+509 47 72 3218",
    whatsapp: "+509 47 72 3218",
    email: "",
    bookingUrl: "tel:+50947723218",
    videoUrl: "",
    videoTitle: "",
    yearsOfExperience: "12 ans d'expérience",
    education: "MD - Gynécologie et obstétrique",
    licenseNumber: "",
    published: true,
    featured: true,
    matchNames: ["Carlos Lucio Pierre", "Dr Lucio"],
  },
  {
    id: "carl-henz-beaubrun",
    starterSpecialtyKey: "pediatre",
    displayName: "Carl Henz Beaubrun",
    specialty: "Pédiatrie",
    headline: "Suivi du nourrisson, de l'enfant et repères utiles pour les parents",
    bio: "Suivi pédiatrique avec une attention particulière pour la croissance, la prévention, les questions fréquentes des familles et l'orientation rapide en cas de doute.",
    city: "Port-au-Prince",
    country: "Haïti",
    location: "Port-au-Prince, Haïti",
    languages: ["Français", "Créole"],
    phone: "+509 34 56 78 90",
    whatsapp: "+509 34 56 78 90",
    email: "",
    bookingUrl: "tel:+50934567890",
    videoUrl: "",
    videoTitle: "",
    yearsOfExperience: "Pédiatre",
    education: "MD - Pédiatrie",
    licenseNumber: "",
    published: true,
    featured: true,
    matchNames: ["Carl Henz Beaubrun", "Carl Beaubrun", "Dr Beaubrun"],
  },
  {
    id: "samantha-pierre",
    starterSpecialtyKey: "pediatre",
    displayName: "Samantha Pierre",
    specialty: "Pédiatrie",
    headline: "Croissance, prévention, nutrition et suivi de l'enfant",
    bio: "Accompagnement pédiatrique pour répondre aux questions des parents sur la croissance, l'alimentation, les symptômes fréquents et les signes d'alerte à surveiller.",
    city: "Port-au-Prince",
    country: "Haïti",
    location: "Port-au-Prince, Haïti",
    languages: ["Français", "Créole"],
    phone: "",
    whatsapp: "",
    email: "",
    bookingUrl: "",
    videoUrl: "",
    videoTitle: "",
    yearsOfExperience: "Pédiatre",
    education: "MD - Pédiatrie",
    licenseNumber: "",
    published: true,
    featured: true,
    matchNames: ["Samantha Pierre"],
  },
  {
    id: "psychologie-lakou",
    starterSpecialtyKey: "psychologie",
    displayName: "Espace Psychologie Lakou Manman",
    specialty: "Psychologie et soutien émotionnel",
    headline: "Stress, charge mentale, parentalité, adolescence et bien-être familial",
    bio: "Un espace de soutien pour aider les mamans et les familles à retrouver des repères autour du stress, de la fatigue, des émotions et des grandes transitions de vie.",
    city: "En ligne",
    country: "Haïti",
    location: "Accompagnement à distance et communautaire",
    languages: ["Français", "Créole"],
    phone: "",
    whatsapp: "",
    email: "",
    bookingUrl: "#contact-form",
    videoUrl: "",
    videoTitle: "",
    yearsOfExperience: "Accompagnement pas à pas",
    education: "Écoute, soutien et premiers repères",
    licenseNumber: "",
    published: true,
    featured: true,
    matchNames: [],
  },
];

function normalizeString(value = "") {
  return String(value || "").trim().toLowerCase();
}

export function matchesSpecialtyContent(specialtyKey = "", value = "") {
  const normalizedValue = normalizeString(value);
  const keywords = SPECIALTY_KEYWORDS[specialtyKey] || [];
  return keywords.some((keyword) => normalizedValue.includes(keyword));
}

export function isSpecialtyProfile(specialtyKey = "", profile = {}) {
  return [profile.specialty, profile.headline, profile.bio, profile.displayName].some((value) => matchesSpecialtyContent(specialtyKey, value));
}

export function isSpecialtyArticle(specialtyKey = "", article = {}, specialtyProfileIds = new Set()) {
  if (specialtyProfileIds.has(String(article?.authorId || "").trim())) {
    return true;
  }

  return [article.authorSpecialty, article.category, article.title, article.text, article.body, article.excerpt].some((value) => matchesSpecialtyContent(specialtyKey, value));
}

export function isSpecialtyVideo(specialtyKey = "", video = {}, specialtyProfileIds = new Set()) {
  if (specialtyProfileIds.has(String(video?.authorId || "").trim())) {
    return true;
  }

  return [video.authorSpecialty, video.category, video.title, video.description].some((value) => matchesSpecialtyContent(specialtyKey, value));
}

export function getStarterDoctorProfilesForSpecialty(specialtyKey = "") {
  return DOCTOR_SPECIALTY_STARTER_PROFILES
    .filter((profile) => profile.starterSpecialtyKey === specialtyKey)
    .map((profile) => ({ ...profile }));
}

export function buildSpecialtyDoctorProfiles(profileData = [], specialtyKey = "") {
  const starterProfiles = getStarterDoctorProfilesForSpecialty(specialtyKey);
  const starterIds = new Set(starterProfiles.map((profile) => String(profile.id || "").trim()));
  const matchingProfiles = profileData.filter((profile) => starterIds.has(String(profile.id || "").trim()) || isSpecialtyProfile(specialtyKey, profile));
  const mergedProfiles = new Map(starterProfiles.map((profile) => [String(profile.id || "").trim(), profile]));

  matchingProfiles.forEach((profile) => {
    const profileId = String(profile.id || "").trim();
    mergedProfiles.set(profileId, {
      ...(mergedProfiles.get(profileId) || {}),
      ...profile,
    });
  });

  return [...mergedProfiles.values()].sort((left, right) => {
    if (Boolean(left?.featured) !== Boolean(right?.featured)) {
      return Boolean(right?.featured) - Boolean(left?.featured);
    }

    return String(left?.displayName || "").localeCompare(String(right?.displayName || ""), "fr", { sensitivity: "base" });
  });
}

export function getProfileLocation(profile = {}) {
  return [profile.city, profile.country].filter(Boolean).join(", ");
}

export function getProfileLanguages(profile = {}) {
  if (Array.isArray(profile.languages)) {
    return profile.languages.filter(Boolean);
  }

  return String(profile.languages || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function getProfileInitials(profile = {}, fallback = "DR") {
  const source = String(profile.displayName || "").trim();

  if (!source) {
    return fallback;
  }

  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((entry) => entry[0] || "")
    .join("")
    .toUpperCase();
}

export function findStarterDoctorUserMatch(profile = {}, users = []) {
  const normalizedEmail = normalizeString(profile.email);
  const normalizedNames = [profile.displayName, ...(Array.isArray(profile.matchNames) ? profile.matchNames : [])]
    .map((value) => normalizeString(value))
    .filter(Boolean);

  return users.find((user) => {
    const userEmail = normalizeString(user?.email);
    const userName = normalizeString(user?.name || user?.displayName);

    if (normalizedEmail && userEmail === normalizedEmail) {
      return true;
    }

    return normalizedNames.includes(userName);
  }) || null;
}
