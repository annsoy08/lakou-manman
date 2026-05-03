const AUTH_ROUTES = new Set(["/login", "/register", "/forgot-password"]);
const MARKETING_ROUTES = new Set(["/"]);
const ONBOARDING_EXEMPT_ROUTES = new Set(["/doctor-dashboard", "/gynecologie-dashboard", "/psychologie-dashboard", "/pediatre-dashboard"]);
const CANONICAL_ADMIN_EMAILS = new Set(["bannsoraya2@gmail.com"]);

function normalizeRole(value = "") {
  return String(value || "").trim().toLowerCase();
}

function normalizeEmail(value = "") {
  return String(value || "").trim().toLowerCase();
}

function hasOnboardingBypass(profile = null, user = null) {
  const role = normalizeRole(profile && profile.role ? profile.role : "");
  const email = normalizeEmail(
    (profile && profile.email ? profile.email : "")
      || (user && user.email ? user.email : "")
      || ""
  );
  return role === "admin" || role === "doctor_editor" || role === "doctor" || CANONICAL_ADMIN_EMAILS.has(email);
}

export function isAuthRoutePath(pathname = "") {
  return AUTH_ROUTES.has(pathname);
}

export function isMarketingRoutePath(pathname = "") {
  return MARKETING_ROUTES.has(pathname);
}

export function isProtectedRoutePath(pathname = "") {
  return !isAuthRoutePath(pathname) && !isMarketingRoutePath(pathname);
}

export function profileNeedsOnboarding(profile, user) {
  if (!user) {
    return false;
  }

  if (hasOnboardingBypass(profile, user)) {
    return false;
  }

  if (profile && profile.onboardingCompletedAt) {
    return false;
  }

  const interests = Array.isArray(profile && profile.interests)
    ? profile.interests.filter((value) => typeof value === "string" && value.trim())
    : [];
  const locationMode = typeof (profile && profile.locationMode) === "string" ? profile.locationMode.trim() : "";
  const hasName = Boolean(
    String(
      (profile && (profile.name || profile.displayName || profile.fullName))
        || (user && user.displayName ? user.displayName : "")
        || ""
    ).trim()
  );
  const hasLocation = locationMode === "diaspora"
    ? Boolean(String((profile && (profile.country || profile.city)) || "").trim())
    : Boolean(String((profile && profile.city) || "").trim());

  if (hasName && (hasLocation || interests.length > 0)) {
    return false;
  }

  const hasOtherProfileData = Boolean(
    String((profile && (profile.bio || profile.childAges || profile.country)) || "").trim()
  );
  if (profile && hasName && hasOtherProfileData) {
    return false;
  }

  return true;
}

export function getAppShellRedirectTarget({ pathname = "", user = null, userProfile = null, authLoading = false } = {}) {
  if (authLoading) {
    return null;
  }

  const isAuthRoute = isAuthRoutePath(pathname);
  const isMarketingRoute = isMarketingRoutePath(pathname);
  const isProtectedRoute = isProtectedRoutePath(pathname);
  const isOnboardingRoute = pathname === "/onboarding";
  const needsOnboarding = profileNeedsOnboarding(userProfile, user);
  const isOnboardingExemptRoute = ONBOARDING_EXEMPT_ROUTES.has(pathname);

  if (!user) {
    return isProtectedRoute ? "/" : null;
  }

  if (isAuthRoute) {
    return needsOnboarding ? "/onboarding" : "/feed";
  }

  if (isMarketingRoute) {
    return needsOnboarding ? "/onboarding" : null;
  }

  if (isOnboardingRoute && !needsOnboarding) {
    return "/feed";
  }

  if (!isOnboardingRoute && !isOnboardingExemptRoute && needsOnboarding) {
    return "/onboarding";
  }

  return null;
}
