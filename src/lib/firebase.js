import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, setLogLevel as setFirestoreLogLevel } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { validateClientEnvironment, getValidatedEnvVar } from "./env-validation";

function isClientDebugLoggingEnabled() {
  const flag = String(process.env.NEXT_PUBLIC_ENABLE_CLIENT_DEBUG_LOGS || "").trim().toLowerCase();
  return flag === "true" || flag === "1" || flag === "yes";
}

if (typeof window !== "undefined") {
  setFirestoreLogLevel("silent");
}

if (typeof window !== 'undefined' && !window.__lakouEnvValidated) {
  const validation = validateClientEnvironment();
  if (!validation.valid && isClientDebugLoggingEnabled()) {
    console.warn('⚠️ Environment validation failed:', validation.errors);
    console.info('💡 To fix: Copy .env.local.example to .env.local and fill in your values');
  }
  window.__lakouEnvValidated = true;
}

function normalizeConfigValue(value = "") {
  return String(value ?? "").trim().replace(/^['"]|['"]$/g, "");
}

const firebaseConfig = {
  apiKey: normalizeConfigValue(getValidatedEnvVar('NEXT_PUBLIC_FIREBASE_API_KEY')),
  authDomain: normalizeConfigValue(getValidatedEnvVar('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN')),
  projectId: normalizeConfigValue(getValidatedEnvVar('NEXT_PUBLIC_FIREBASE_PROJECT_ID')),
  storageBucket: normalizeConfigValue(getValidatedEnvVar('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET')),
  messagingSenderId: normalizeConfigValue(getValidatedEnvVar('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID')),
  appId: normalizeConfigValue(getValidatedEnvVar('NEXT_PUBLIC_FIREBASE_APP_ID')),
};

function isPlaceholderValue(value = "") {
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return true;
  return (
    normalized === "undefined" ||
    normalized === "null" ||
    normalized.includes("your_") ||
    normalized.includes("demo") ||
    normalized.includes("example") ||
    normalized.includes("changeme")
  );
}

function isValidApiKey(value = "") {
  return /^AIza[0-9A-Za-z_-]{35}$/.test(String(value).trim());
}

function isValidAuthDomain(value = "") {
  return /^[a-z0-9-]+(?:\.firebaseapp\.com|\.web\.app)$/i.test(String(value).trim());
}

function isValidProjectId(value = "") {
  return /^[a-z0-9-]+$/i.test(String(value).trim());
}

function isValidStorageBucket(value = "") {
  return /^[a-z0-9.-]+(?:\.appspot\.com|\.firebasestorage\.app)$/i.test(String(value).trim());
}

function isValidMessagingSenderId(value = "") {
  return /^\d{6,}$/.test(String(value).trim());
}

function isValidAppId(value = "") {
  return /^\d+:[a-z0-9]+:web:[0-9a-z]+$/i.test(String(value).trim());
}

function getFirebaseConfigIssues(config) {
  const issues = [];

  if (isPlaceholderValue(config.apiKey) || !isValidApiKey(config.apiKey)) {
    issues.push("apiKey");
  }

  if (isPlaceholderValue(config.authDomain) || !isValidAuthDomain(config.authDomain)) {
    issues.push("authDomain");
  }

  if (isPlaceholderValue(config.projectId) || !isValidProjectId(config.projectId)) {
    issues.push("projectId");
  }

  if (isPlaceholderValue(config.storageBucket) || !isValidStorageBucket(config.storageBucket)) {
    issues.push("storageBucket");
  }

  if (isPlaceholderValue(config.messagingSenderId) || !isValidMessagingSenderId(config.messagingSenderId)) {
    issues.push("messagingSenderId");
  }

  if (isPlaceholderValue(config.appId) || !isValidAppId(config.appId)) {
    issues.push("appId");
  }

  return issues;
}

function hasValidFirebaseConfig(config) {
  return getFirebaseConfigIssues(config).length === 0;
}

function shouldForceFirestoreLongPolling() {
  const explicitPreference = normalizeConfigValue(process.env.NEXT_PUBLIC_FIRESTORE_FORCE_LONG_POLLING);

  if (explicitPreference === "true" || explicitPreference === "1") {
    return true;
  }

  if (explicitPreference === "false" || explicitPreference === "0") {
    return false;
  }

  if (typeof window === "undefined") {
    return false;
  }

  const hostname = String(window.location.hostname || "").trim().toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1";
}

let app = null;
let auth = null;
let db = null;
let storage = null;
let appResolved = false;
let authResolved = false;
let dbResolved = false;
let storageResolved = false;

function getFirebaseApp() {
  if (appResolved) {
    return app;
  }

  appResolved = true;

  try {
    if (!hasValidFirebaseConfig(firebaseConfig)) {
      if (isClientDebugLoggingEnabled()) {
        console.warn(
          `Firebase config is missing or invalid (${getFirebaseConfigIssues(firebaseConfig).join(", ")}). App will run without Firebase services.`
        );
      }
      app = null;
      return app;
    }

    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    return app;
  } catch (error) {
    if (isClientDebugLoggingEnabled()) {
      console.warn("Firebase app initialization failed, using mock services:", error.message);
    }
    app = null;
    return app;
  }
}

function getFirebaseAuth() {
  if (authResolved) {
    return auth;
  }

  authResolved = true;

  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    auth = null;
    return auth;
  }

  try {
    auth = getAuth(firebaseApp);
    return auth;
  } catch (error) {
    if (isClientDebugLoggingEnabled()) {
      console.warn("Firebase auth initialization failed, auth features disabled:", error.message);
    }
    auth = null;
    return auth;
  }
}

function getFirebaseDb() {
  if (dbResolved) {
    return db;
  }

  dbResolved = true;

  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    db = null;
    return db;
  }

  try {
    db = initializeFirestore(
      firebaseApp,
      shouldForceFirestoreLongPolling()
        ? { experimentalForceLongPolling: true }
        : { experimentalAutoDetectLongPolling: true }
    );
    return db;
  } catch (error) {
    try {
      db = getFirestore(firebaseApp);
      return db;
    } catch (fallbackError) {
      if (isClientDebugLoggingEnabled()) {
        console.warn("Firebase Firestore initialization failed:", fallbackError.message || error.message);
      }
      db = null;
      return db;
    }
  }
}

function getFirebaseStorage() {
  if (storageResolved) {
    return storage;
  }

  storageResolved = true;

  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    storage = null;
    return storage;
  }

  try {
    storage = getStorage(firebaseApp);
    return storage;
  } catch (error) {
    if (isClientDebugLoggingEnabled()) {
      console.warn("Firebase Storage initialization failed:", error.message);
    }
    storage = null;
    return storage;
  }
}

export { db, storage, getFirebaseApp, getFirebaseAuth, getFirebaseDb, getFirebaseStorage };
export default app;
