"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { createUserProfile, getUserProfile, updateUserPresence, updateUserProfile } from "@/lib/firestore";
import { resolveUserDisplayName } from "@/lib/utils";
import { logTechnicalEvent, setTelemetryUserContext, trackError } from "@/lib/telemetry";

const AuthContext = createContext({});
const getAdminStorageKey = (uid) => `admin_access_${uid}`;
const CANONICAL_ADMIN_EMAILS = new Set(["bannsoraya2@gmail.com"]);
const DEFAULT_USER_NAME = "Membre";
const PRESENCE_HEARTBEAT_MS = 30000;
const PRESENCE_SYNC_DEDUP_MS = 15000;
const PRESENCE_RETRY_AFTER_NETWORK_ERROR_MS = 30000;
const USER_PROFILE_CACHE_PREFIX = "cached_user_profile_";
const CACHEABLE_PROFILE_FIELDS = [
  "email",
  "name",
  "displayName",
  "fullName",
  "photo",
  "role",
  "country",
  "city",
  "locationMode",
  "childAges",
  "childAgeStage",
  "bio",
  "interests",
  "followingIds",
  "suggestedGroupIds",
  "onboardingCompletedAt",
  "moderationStatus",
  "messagingRestricted",
];

function getUserProfileCacheKey(uid = "") {
  return `${USER_PROFILE_CACHE_PREFIX}${uid}`;
}

function buildCachedUserProfile(profile = {}) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    return null;
  }

  const nextProfile = {};

  CACHEABLE_PROFILE_FIELDS.forEach((field) => {
    const value = profile[field];

    if (typeof value === "string") {
      nextProfile[field] = value;
      return;
    }

    if (typeof value === "boolean") {
      nextProfile[field] = value;
      return;
    }

    if (Array.isArray(value)) {
      nextProfile[field] = value.filter((item) => typeof item === "string" || typeof item === "number");
    }
  });

  return Object.keys(nextProfile).length > 0 ? nextProfile : null;
}

function readCachedUserProfile(uid = "") {
  if (typeof window === "undefined" || !uid) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(getUserProfileCacheKey(uid));
    if (!raw) {
      return null;
    }

    return buildCachedUserProfile(JSON.parse(raw));
  } catch (error) {
    trackError(error, {
      scope: "auth_read_cached_profile",
      uid,
    });
    return null;
  }
}

function persistCachedUserProfile(uid = "", profile = null) {
  if (typeof window === "undefined" || !uid) {
    return;
  }

  try {
    const cachedProfile = buildCachedUserProfile(profile);
    if (!cachedProfile) {
      return;
    }

    window.localStorage.setItem(getUserProfileCacheKey(uid), JSON.stringify(cachedProfile));
  } catch (error) {
    trackError(error, {
      scope: "auth_persist_cached_profile",
      uid,
    });
  }
}

function normalizeEmail(value = "") {
  return String(value || "").trim().toLowerCase();
}

function isCanonicalAdminEmail(email = "") {
  return CANONICAL_ADMIN_EMAILS.has(normalizeEmail(email));
}

function createAuthError(code, message) {
  const error = new Error(message || code);
  error.code = code;
  return error;
}

function isTransientFirebaseNetworkError(error) {
  const code = String((error && error.code) || "").toLowerCase();
  const message = String((error && error.message) || "").toLowerCase();

  return (
    code === "unavailable"
    || code === "auth/network-request-failed"
    || code === "failed-precondition"
    || message.includes("offline")
    || message.includes("network")
    || message.includes("name_not_resolved")
    || message.includes("err_name_not_resolved")
    || message.includes("could not reach cloud firestore backend")
    || message.includes("client is offline")
  );
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminAccessOverride, setAdminAccessOverride] = useState(false);
  const presenceBackoffUntilRef = useRef(0);
  const presenceRetryTimeoutRef = useRef(null);
  const lastPresenceSyncRef = useRef({ uid: "", isOnline: null, syncedAt: 0 });
  const canUseNetwork = () => typeof navigator === "undefined" || navigator.onLine;
  const readAdminAccessOverride = (uid) => {
    if (typeof window === "undefined" || !uid) {
      return false;
    }

    try {
      return window.localStorage.getItem(getAdminStorageKey(uid)) === "true";
    } catch (error) {
      trackError(error, {
        scope: "auth_read_admin_override",
        uid,
      });
      return false;
    }
  };
  const persistAdminAccessOverride = (uid, enabled) => {
    if (typeof window === "undefined" || !uid) {
      return;
    }

    try {
      if (enabled) {
        window.localStorage.setItem(getAdminStorageKey(uid), "true");
      } else {
        window.localStorage.removeItem(getAdminStorageKey(uid));
      }
    } catch (error) {
      trackError(error, {
        scope: "auth_persist_admin_override",
        uid,
        enabled: Boolean(enabled),
      });
    }

    setAdminAccessOverride(Boolean(enabled));
  };
  const clearPresenceRetryTimeout = () => {
    if (presenceRetryTimeoutRef.current && typeof window !== "undefined") {
      window.clearTimeout(presenceRetryTimeoutRef.current);
      presenceRetryTimeoutRef.current = null;
    }
  };
  const resetPresenceBackoff = () => {
    presenceBackoffUntilRef.current = 0;
    clearPresenceRetryTimeout();
  };
  const schedulePresenceRetryWindow = (uid, isOnline, error) => {
    if (typeof window === "undefined") {
      return;
    }

    const retryAt = Date.now() + PRESENCE_RETRY_AFTER_NETWORK_ERROR_MS;
    presenceBackoffUntilRef.current = retryAt;
    clearPresenceRetryTimeout();
    logTechnicalEvent("auth_presence_backoff_started", {
      uid,
      isOnline,
      retryAfterMs: PRESENCE_RETRY_AFTER_NETWORK_ERROR_MS,
      code: String((error && error.code) || ""),
    });
    presenceRetryTimeoutRef.current = window.setTimeout(() => {
      presenceRetryTimeoutRef.current = null;
      presenceBackoffUntilRef.current = 0;
      logTechnicalEvent("auth_presence_backoff_expired", {
        uid,
        isOnline,
      });
    }, PRESENCE_RETRY_AFTER_NETWORK_ERROR_MS);
  };
  const syncPresence = async (uid, isOnline) => {
    if (!uid || !canUseNetwork()) {
      return;
    }

    const now = Date.now();
    const lastSync = lastPresenceSyncRef.current;

    if (presenceBackoffUntilRef.current > now) {
      return;
    }

    if (
      lastSync.uid === uid
      && lastSync.isOnline === isOnline
      && now - lastSync.syncedAt < PRESENCE_SYNC_DEDUP_MS
    ) {
      return;
    }

    try {
      await updateUserPresence(uid, { isOnline });
      lastPresenceSyncRef.current = {
        uid,
        isOnline,
        syncedAt: Date.now(),
      };
    } catch (error) {
      if (isTransientFirebaseNetworkError(error)) {
        schedulePresenceRetryWindow(uid, isOnline, error);
        logTechnicalEvent("auth_sync_presence_deferred", {
          uid,
          isOnline,
          code: String((error && error.code) || ""),
        });
        return;
      }

      console.error("Error updating user presence:", error);
      trackError(error, {
        scope: "auth_sync_presence",
        uid,
        isOnline,
      });
    }
  };
  const resolveAuth = () => {
    try {
      const auth = getFirebaseAuth();
      return auth;
    } catch (error) {
      console.error("Firebase auth unavailable:", error);
      trackError(error, { scope: "auth_resolve_auth" });
      return null;
    }
  };
  const buildUserProfileFromAuth = (firebaseUser, profile = null) => {
    const normalizedEmail = normalizeEmail(
      ((profile && profile.email) || (firebaseUser && firebaseUser.email) || "")
    );
    const fallbackName = normalizedEmail && normalizedEmail.includes("@")
      ? normalizedEmail.split("@")[0]
      : DEFAULT_USER_NAME;
    const resolvedName = resolveUserDisplayName(profile, firebaseUser, fallbackName);

    return {
      ...(profile || {}),
      email: normalizedEmail,
      name: resolvedName,
      displayName: (profile && profile.displayName) || (firebaseUser && firebaseUser.displayName) || resolvedName,
      fullName: (profile && profile.fullName) || resolvedName,
      photo: (profile && profile.photo) || (firebaseUser && firebaseUser.photoURL) || "",
      role: isCanonicalAdminEmail((firebaseUser && firebaseUser.email) || "") ? "admin" : ((profile && profile.role) || "user"),
    };
  };

  const ensureUserProfileIntegrity = async (firebaseUser, profile = null) => {
    if (!firebaseUser) {
      return profile;
    }

    const ensuredProfile = buildUserProfileFromAuth(firebaseUser, profile);

    if (!ensuredProfile.email) {
      throw createAuthError("auth/missing-email", "User email is required");
    }

    if (!ensuredProfile.name) {
      throw createAuthError("auth/missing-name", "User name is required");
    }

    if (!canUseNetwork()) {
      return ensuredProfile;
    }

    const needsBackfill = !profile
      || !profile.email
      || !profile.name
      || !profile.displayName
      || !profile.fullName
      || (!profile.photo && Boolean(firebaseUser.photoURL))
      || (isCanonicalAdminEmail(firebaseUser.email) && profile.role !== "admin");

    if (needsBackfill) {
      try {
        await updateUserProfile(firebaseUser.uid, ensuredProfile);
      } catch (error) {
        console.error("Error ensuring user profile integrity:", error);
      }
    }

    return ensuredProfile;
  };

  const hydrateAuthenticatedUserProfile = async (firebaseUser, options = {}) => {
    if (!firebaseUser) {
      setUserProfile(null);
      return null;
    }

    const { preferCache = false } = options;

    const cachedProfile = readCachedUserProfile(firebaseUser.uid);
    const fallbackProfile = buildUserProfileFromAuth(firebaseUser, cachedProfile);

    if (!fallbackProfile.email) {
      throw createAuthError("auth/missing-email", "User email is required");
    }

    if (cachedProfile) {
      setUserProfile(fallbackProfile);
      persistCachedUserProfile(firebaseUser.uid, fallbackProfile);
      persistAdminAccessOverride(
        firebaseUser.uid,
        fallbackProfile && fallbackProfile.role === "admin" || isCanonicalAdminEmail(firebaseUser.email)
      );
      logTechnicalEvent("auth_profile_cache_used", {
        uid: firebaseUser.uid,
        reason: preferCache ? "bootstrap" : "fallback",
      });

      if (preferCache) {
        return fallbackProfile;
      }
    }

    if (canUseNetwork()) {
      try {
        const fetchedProfile = await getUserProfile(firebaseUser.uid);
        const effectiveProfile = await ensureUserProfileIntegrity(firebaseUser, fetchedProfile);
        setUserProfile(effectiveProfile);
        persistCachedUserProfile(firebaseUser.uid, effectiveProfile);
        persistAdminAccessOverride(
          firebaseUser.uid,
          effectiveProfile && effectiveProfile.role === "admin" || isCanonicalAdminEmail(firebaseUser.email)
        );
        return effectiveProfile;
      } catch (error) {
        if (isTransientFirebaseNetworkError(error) && cachedProfile) {
          logTechnicalEvent("auth_profile_refresh_deferred", {
            uid: firebaseUser.uid,
            usedCache: true,
            code: String((error && error.code) || ""),
          });
          return fallbackProfile;
        }

        console.error("Error hydrating user profile:", error);
        trackError(error, {
          scope: "auth_hydrate_profile",
          uid: firebaseUser.uid,
          usedCache: Boolean(cachedProfile),
        });
      }
    }

    setUserProfile(fallbackProfile);
    persistCachedUserProfile(firebaseUser.uid, fallbackProfile);
    persistAdminAccessOverride(
      firebaseUser.uid,
      fallbackProfile && fallbackProfile.role === "admin" || isCanonicalAdminEmail(firebaseUser.email)
    );
    return fallbackProfile;
  };

  const ensureGoogleUserProfile = async (firebaseUser) => {
    const baseProfile = buildUserProfileFromAuth(firebaseUser, null);

    if (!baseProfile.email) {
      throw createAuthError("auth/missing-email", "Google account must provide an email");
    }

    const existingProfile = canUseNetwork() ? await getUserProfile(firebaseUser.uid) : null;
    if (!existingProfile && canUseNetwork()) {
      await createUserProfile(firebaseUser.uid, {
        name: baseProfile.name,
        displayName: baseProfile.displayName,
        fullName: baseProfile.fullName,
        email: baseProfile.email,
        photo: baseProfile.photo,
        country: "",
        city: "",
        locationMode: "",
        childAges: "",
        childAgeStage: "",
        bio: "",
        interests: [],
        followingIds: [],
        suggestedGroupIds: [],
        onboardingCompletedAt: "",
        role: baseProfile.role,
      });
    }

    return hydrateAuthenticatedUserProfile(firebaseUser);
  };

  useEffect(() => {
    setTelemetryUserContext({
      userId: (user && user.uid) || "",
      role: (userProfile && userProfile.role) || "",
      isAuthenticated: Boolean(user),
    });
  }, [user, userProfile && userProfile.role]);

  useEffect(() => {
    let currentUid = null;
    let heartbeatIntervalId = null;
    setLoading(true);

    try {
      const auth = resolveAuth();

      if (!auth) {
        console.warn("Firebase auth not available, using mock auth");
        logTechnicalEvent("auth_unavailable", { online: canUseNetwork() });
        setLoading(false);
        return;
      }

      const clearPresenceHeartbeat = () => {
        if (heartbeatIntervalId && typeof window !== "undefined") {
          window.clearInterval(heartbeatIntervalId);
          heartbeatIntervalId = null;
        }
      };

      const startPresenceHeartbeat = () => {
        clearPresenceHeartbeat();

        if (typeof window === "undefined") {
          return;
        }

        if (typeof navigator !== "undefined" && !navigator.onLine) {
          return;
        }

        if (document.visibilityState !== "visible" || (typeof document.hasFocus === "function" && !document.hasFocus())) {
          return;
        }

        heartbeatIntervalId = window.setInterval(() => {
          if (
            !currentUid
            || document.visibilityState !== "visible"
            || (typeof document.hasFocus === "function" && !document.hasFocus())
            || (typeof navigator !== "undefined" && !navigator.onLine)
          ) {
            return;
          }

          syncPresence(currentUid, true);
        }, PRESENCE_HEARTBEAT_MS);
      };

      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        try {
          if (currentUid && currentUid !== ((firebaseUser && firebaseUser.uid) || "")) {
            syncPresence(currentUid, false);
          }

          setUser(firebaseUser);

          if (firebaseUser) {
            currentUid = firebaseUser.uid;
            resetPresenceBackoff();
            setAdminAccessOverride(readAdminAccessOverride(firebaseUser.uid));
            logTechnicalEvent("auth_state_changed", {
              uid: firebaseUser.uid,
              online: canUseNetwork(),
            });

            try {
              await hydrateAuthenticatedUserProfile(firebaseUser, { preferCache: true });
              const shouldAppearOnline = document.visibilityState === "visible"
                && (typeof document.hasFocus !== "function" || document.hasFocus());
              syncPresence(firebaseUser.uid, shouldAppearOnline);
              if (shouldAppearOnline) {
                startPresenceHeartbeat();
              } else {
                clearPresenceHeartbeat();
              }
            } catch (error) {
              const cachedBootstrapProfile = readCachedUserProfile(firebaseUser.uid);
              const fallbackBootstrapProfile = buildUserProfileFromAuth(
                firebaseUser,
                cachedBootstrapProfile || userProfile
              );

              console.error("Error bootstrapping authenticated profile:", error);
              trackError(error, {
                scope: "auth_bootstrap_profile",
                uid: firebaseUser.uid,
                usedCache: Boolean(cachedBootstrapProfile),
              });

              if (fallbackBootstrapProfile && fallbackBootstrapProfile.email && fallbackBootstrapProfile.name) {
                setUserProfile(fallbackBootstrapProfile);
                persistCachedUserProfile(firebaseUser.uid, fallbackBootstrapProfile);
                persistAdminAccessOverride(
                  firebaseUser.uid,
                  fallbackBootstrapProfile.role === "admin" || isCanonicalAdminEmail(firebaseUser.email)
                );
                logTechnicalEvent("auth_bootstrap_profile_recovered", {
                  uid: firebaseUser.uid,
                  code: String((error && error.code) || ""),
                  usedCache: Boolean(cachedBootstrapProfile),
                  transient: isTransientFirebaseNetworkError(error),
                });
                const shouldAppearOnline = document.visibilityState === "visible"
                  && (typeof document.hasFocus !== "function" || document.hasFocus());
                syncPresence(firebaseUser.uid, shouldAppearOnline);
                if (shouldAppearOnline) {
                  startPresenceHeartbeat();
                } else {
                  clearPresenceHeartbeat();
                }
                return;
              }

              setUserProfile(null);
              setAdminAccessOverride(false);
              clearPresenceHeartbeat();
              currentUid = null;

              try {
                await signOut(auth);
              } catch (signOutError) {
                console.error("Error signing out after auth bootstrap failure:", signOutError);
                trackError(signOutError, {
                  scope: "auth_bootstrap_profile_signout",
                  uid: firebaseUser.uid,
                });
              }

              setUser(null);
            }
          } else {
            logTechnicalEvent("auth_signed_out", {
              uid: (firebaseUser && firebaseUser.uid) || currentUid || "",
            });
            clearPresenceHeartbeat();
            resetPresenceBackoff();
            currentUid = null;
            setUser(null);
            setUserProfile(null);
            setAdminAccessOverride(false);
          }
        } catch (error) {
          console.error("Error handling auth state change:", error);
          trackError(error, {
            scope: "auth_state_change_handler",
            uid: (firebaseUser && firebaseUser.uid) || currentUid || "",
          });
          clearPresenceHeartbeat();
          resetPresenceBackoff();
          currentUid = null;
          setUser(null);
          setUserProfile(null);
          setAdminAccessOverride(false);
        } finally {
          setLoading(false);
        }
      });

      const handleVisibilityChange = async () => {
        if (!currentUid) {
          return;
        }

        try {
          const shouldAppearOnline = document.visibilityState === "visible"
            && (typeof document.hasFocus !== "function" || document.hasFocus());

          if (shouldAppearOnline) {
            startPresenceHeartbeat();
          } else {
            clearPresenceHeartbeat();
          }

          await syncPresence(currentUid, shouldAppearOnline);
        } catch (error) {
          console.error("Error syncing visibility presence:", error);
        }
      };

      const handleWindowFocus = async () => {
        if (!currentUid || document.visibilityState !== "visible") {
          return;
        }

        try {
          startPresenceHeartbeat();
          await syncPresence(currentUid, true);
        } catch (error) {
          console.error("Error syncing focused presence:", error);
        }
      };

      const handleWindowBlur = async () => {
        if (!currentUid) {
          return;
        }

        if (document.visibilityState === "visible") {
          return;
        }

        try {
          clearPresenceHeartbeat();
          await syncPresence(currentUid, false);
        } catch (error) {
          console.error("Error syncing blurred presence:", error);
        }
      };

      const handleWindowOnline = async () => {
        if (!currentUid) {
          return;
        }

        try {
          resetPresenceBackoff();
          const shouldAppearOnline = document.visibilityState === "visible"
            && (typeof document.hasFocus !== "function" || document.hasFocus());
          await syncPresence(currentUid, shouldAppearOnline);
          if (shouldAppearOnline) {
            startPresenceHeartbeat();
            if (auth.currentUser && canUseNetwork()) {
              await hydrateAuthenticatedUserProfile(auth.currentUser);
            }
          }
        } catch (error) {
          console.error("Error syncing online presence:", error);
          trackError(error, {
            scope: "auth_window_online",
            uid: currentUid,
          });
        }
      };

      const handleWindowOffline = () => {
        clearPresenceHeartbeat();
        clearPresenceRetryTimeout();
      };

      const handlePageHide = () => {
        if (!currentUid) {
          return;
        }

        clearPresenceHeartbeat();
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("focus", handleWindowFocus);
      window.addEventListener("blur", handleWindowBlur);
      window.addEventListener("online", handleWindowOnline);
      window.addEventListener("offline", handleWindowOffline);
      window.addEventListener("pagehide", handlePageHide);

      return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("focus", handleWindowFocus);
        window.removeEventListener("blur", handleWindowBlur);
        window.removeEventListener("online", handleWindowOnline);
        window.removeEventListener("offline", handleWindowOffline);
        window.removeEventListener("pagehide", handlePageHide);
        clearPresenceHeartbeat();
        clearPresenceRetryTimeout();

        if (currentUid) {
          syncPresence(currentUid, false);
        }

        unsubscribe();
      };
    } catch (error) {
      console.error("Auth setup failed:", error);
      trackError(error, { scope: "auth_setup_failed" });
      setLoading(false);
    }
  }, []);

  async function register(email, password, profileData) {
    const auth = resolveAuth();

    if (!auth) {
      throw new Error("Firebase auth not available");
    }
    
    try {
      const normalizedEmail = normalizeEmail(email);
      const normalizedName = String((profileData && profileData.name) || "").trim();

      if (!normalizedEmail) {
        throw createAuthError("auth/missing-email", "Email is required");
      }

      if (!normalizedName) {
        throw createAuthError("auth/missing-name", "Name is required");
      }

      const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      await updateProfile(cred.user, { displayName: normalizedName });
      await createUserProfile(cred.user.uid, {
        name: normalizedName,
        displayName: normalizedName,
        fullName: normalizedName,
        email: normalizedEmail,
        photo: "",
        country: profileData.country || "",
        city: profileData.city || "",
        locationMode: profileData.locationMode || "",
        childAges: profileData.childAges || "",
        childAgeStage: profileData.childAgeStage || "",
        bio: profileData.bio || "",
        interests: Array.isArray(profileData.interests) ? profileData.interests : [],
        followingIds: [],
        suggestedGroupIds: [],
        onboardingCompletedAt: "",
        role: "user",
      });

      await hydrateAuthenticatedUserProfile(cred.user);

      return cred.user;
    } catch (error) {
      console.error("Error registering user:", error);
      trackError(error, {
        scope: "auth_register",
        email: normalizeEmail(email),
      });
      throw error;
    }
  }

  async function login(email, password) {
    const auth = resolveAuth();

    if (!auth) {
      throw new Error("Firebase auth not available");
    }
    
    try {
      const normalizedEmail = normalizeEmail(email);

      if (!normalizedEmail) {
        throw createAuthError("auth/missing-email", "Email is required");
      }

      const cred = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      await hydrateAuthenticatedUserProfile(cred.user);

      return cred.user;
    } catch (error) {
      console.error("Error logging in:", error);
      trackError(error, {
        scope: "auth_login",
        email: normalizeEmail(email),
      });
      throw error;
    }
  }

  async function signInWithGoogle() {
    const auth = resolveAuth();

    if (!auth) {
      throw new Error("Firebase auth not available");
    }

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      const cred = await signInWithPopup(auth, provider);

      if (!normalizeEmail((cred.user && cred.user.email) || "")) {
        await signOut(auth);
        throw createAuthError("auth/missing-email", "Google account must provide an email");
      }

      await ensureGoogleUserProfile(cred.user);
      return cred.user;
    } catch (error) {
      if ((error && error.code) === "auth/popup-closed-by-user") {
        console.info("Google sign-in popup closed before completion.");
        logTechnicalEvent("auth_google_signin_cancelled", {
          code: String((error && error.code) || ""),
        });
      } else if ((error && error.code) === "auth/operation-not-allowed") {
        console.warn("Google sign-in provider is not enabled in Firebase Authentication.");
        trackError(error, { scope: "auth_google_signin" });
      } else {
        console.error("Error signing in with Google:", error);
        trackError(error, { scope: "auth_google_signin" });
      }
      throw error;
    }
  }

  async function logout() {
    const auth = resolveAuth();

    if (!auth) {
      setUser(null);
      setUserProfile(null);
      return;
    }
    
    try {
      const uid = user && user.uid ? user.uid : "";
      await signOut(auth);
      if (uid) {
        syncPresence(uid, false);
      }
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error("Error logging out:", error);
      trackError(error, { scope: "auth_logout" });
      throw error;
    }
  }

  async function resetPassword(email) {
    const auth = resolveAuth();

    if (!auth) {
      throw new Error("Firebase auth not available");
    }
    
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Error resetting password:", error);
      trackError(error, {
        scope: "auth_reset_password",
        email: normalizeEmail(email),
      });
      throw error;
    }
  }

  const refreshProfile = useCallback(async () => {
    const auth = resolveAuth();
    const fallbackProfile = buildUserProfileFromAuth(user, userProfile);

    if (!user) {
      return null;
    }

    if (!auth || !canUseNetwork()) {
      setUserProfile((previousProfile) => previousProfile || fallbackProfile);
      persistCachedUserProfile(user.uid, fallbackProfile);
      persistAdminAccessOverride(
        user.uid,
        fallbackProfile && fallbackProfile.role === "admin" || isCanonicalAdminEmail(user.email)
      );
      return fallbackProfile;
    }

    if (user && auth && canUseNetwork()) {
      try {
        const effectiveProfile = await hydrateAuthenticatedUserProfile(user);
        return effectiveProfile;
      } catch (error) {
        console.error("Error refreshing profile:", error);
        trackError(error, {
          scope: "auth_refresh_profile",
          uid: user.uid,
        });
        setUserProfile(fallbackProfile);
        persistCachedUserProfile(user.uid, fallbackProfile);
        persistAdminAccessOverride(
          user.uid,
          fallbackProfile && fallbackProfile.role === "admin" || isCanonicalAdminEmail(user.email)
        );
        return fallbackProfile;
      }
    }

    return null;
  }, [user, userProfile]);

  const isAdmin = (userProfile && userProfile.role === "admin") || adminAccessOverride || isCanonicalAdminEmail((user && user.email) || "");
  const isDoctorEditor = userProfile && userProfile.role === "doctor_editor";
  const canManageDoctorContent = isAdmin || isDoctorEditor;

  const value = useMemo(() => ({
    user,
    userProfile,
    loading,
    isAdmin,
    isDoctorEditor,
    canManageDoctorContent,
    register,
    login,
    signInWithGoogle,
    logout,
    resetPassword,
    refreshProfile,
    persistAdminAccessOverride,
    isCanonicalAdminEmail,
  }), [
    user,
    userProfile,
    loading,
    isAdmin,
    isDoctorEditor,
    canManageDoctorContent,
    refreshProfile,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
