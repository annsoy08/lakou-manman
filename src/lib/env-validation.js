/**
 * Validation centralisée des variables d'environnement
 * Détecte les variables manquantes ou invalides au démarrage
 */

// Variables publiques (disponibles côté navigateur)
const REQUIRED_CLIENT_ENV_VARS = {
  // Firebase Configuration
  NEXT_PUBLIC_FIREBASE_API_KEY: { required: true, type: 'string' },
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: { required: true, type: 'string' },
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: { required: true, type: 'string' },
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: { required: true, type: 'string' },
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: { required: true, type: 'string' },
  NEXT_PUBLIC_FIREBASE_APP_ID: { required: true, type: 'string' },
  NEXT_PUBLIC_FIREBASE_VAPID_KEY: { required: false, type: 'string' },
  NEXT_PUBLIC_FIRESTORE_FORCE_LONG_POLLING: { required: false, type: 'boolean', default: 'false' },
  NEXT_PUBLIC_AGORA_APP_ID: { required: false, type: 'string' },

  // URLs
  NEXT_PUBLIC_SITE_URL: { required: true, type: 'string' },
  NEXT_PUBLIC_URL: { required: true, type: 'string' },

  // Stripe (public)
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: { required: true, type: 'string' },
};

// Variables serveur (secrets / non exposées au navigateur)
const REQUIRED_SERVER_ENV_VARS = {
  // Firebase Admin (server-side)
  FIREBASE_ADMIN_PROJECT_ID: { required: true, type: 'string' },
  FIREBASE_ADMIN_CLIENT_EMAIL: { required: true, type: 'string' },
  FIREBASE_ADMIN_PRIVATE_KEY: { required: true, type: 'string' },
  FIREBASE_WEB_API_KEY: { required: true, type: 'string' },
  AGORA_APP_ID: { required: false, type: 'string' },
  AGORA_APP_CERTIFICATE: { required: false, type: 'string' },

  // Email (Resend)
  RESEND_API_KEY: { required: true, type: 'string' },
  CONTACT_FROM_EMAIL: { required: true, type: 'email' },
  CONTACT_TO_EMAIL: { required: true, type: 'email' },
  GROUP_NOTIFICATION_FROM_EMAIL: { required: true, type: 'email' },
  GROUP_NOTIFICATION_REPLY_TO_EMAIL: { required: true, type: 'email' },

  // Stripe (secret)
  STRIPE_SECRET_KEY: { required: true, type: 'string' },

  // MonCash
  MONCASH_CLIENT_ID: { required: true, type: 'string' },
  MONCASH_CLIENT_SECRET: { required: true, type: 'string' },
  MONCASH_API_BASE_URL: { required: true, type: 'url', default: 'https://sandbox.moncashbutton.digicelgroup.com/Api' },
  MONCASH_GATEWAY_BASE_URL: { required: true, type: 'url', default: 'https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware' },
  MONCASH_WEBHOOK_SECRET: { required: false, type: 'string' },
  MONCASH_WEBHOOK_REQUIRE_SIGNATURE: { required: false, type: 'boolean', default: 'false' },
  MONCASH_ALLOW_DEMO: { required: false, type: 'boolean', default: 'false' },
};

const REQUIRED_ENV_VARS = {
  ...REQUIRED_CLIENT_ENV_VARS,
  ...REQUIRED_SERVER_ENV_VARS,
};

const CLIENT_ENV_VALUES = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_AGORA_APP_ID: process.env.NEXT_PUBLIC_AGORA_APP_ID,
  NEXT_PUBLIC_FIREBASE_VAPID_KEY: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  NEXT_PUBLIC_FIRESTORE_FORCE_LONG_POLLING: process.env.NEXT_PUBLIC_FIRESTORE_FORCE_LONG_POLLING,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
};

// Validation helpers
function isValidEmail(value) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

function isValidUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isValidBoolean(value) {
  return ['true', 'false'].includes(String(value).toLowerCase());
}

function readEnvValue(name) {
  if (typeof window !== "undefined" && Object.prototype.hasOwnProperty.call(CLIENT_ENV_VALUES, name)) {
    return CLIENT_ENV_VALUES[name];
  }

  return process.env[name];
}

function validateEnvVar(name, config) {
  const value = readEnvValue(name);

  // Vérifier si la variable est requise et manquante
  if (config.required && (!value || value.trim() === '')) {
    return {
      valid: false,
      error: `Required environment variable ${name} is missing or empty`,
    };
  }

  // Si la variable n'est pas requise et est manquante, utiliser la valeur par défaut
  if (!value && config.default) {
    return {
      valid: true,
      value: config.default,
      warning: `Using default value for ${name}: ${config.default}`,
    };
  }

  // Validation par type
  if (value) {
    switch (config.type) {
      case 'email':
        if (!isValidEmail(value)) {
          return {
            valid: false,
            error: `Invalid email format for ${name}: ${value}`,
          };
        }
        break;

      case 'url':
        if (!isValidUrl(value)) {
          return {
            valid: false,
            error: `Invalid URL format for ${name}: ${value}`,
          };
        }
        break;

      case 'boolean':
        if (!isValidBoolean(value)) {
          return {
            valid: false,
            error: `Invalid boolean format for ${name}: ${value}. Expected 'true' or 'false'`,
          };
        }
        break;

      case 'string':
      default:
        // Pas de validation spécifique pour les strings
        break;
    }
  }

  return { valid: true, value: value || config.default };
}

function resolveScopeVars(scope) {
  if (scope === "client") return REQUIRED_CLIENT_ENV_VARS;
  if (scope === "server") return REQUIRED_SERVER_ENV_VARS;
  return REQUIRED_ENV_VARS;
}

// Validation principale
export function validateEnvironment(scope = "all") {
  const errors = [];
  const warnings = [];
  const validated = {};

  const scopedVars = resolveScopeVars(scope);

  for (const [name, config] of Object.entries(scopedVars)) {
    const result = validateEnvVar(name, config);

    if (!result.valid) {
      errors.push(result.error);
    } else {
      validated[name] = result.value;

      if (result.warning) {
        warnings.push(result.warning);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    validated,
  };
}

export function validateClientEnvironment() {
  return validateEnvironment("client");
}

export function validateServerEnvironment() {
  return validateEnvironment("server");
}

// Fonction pour obtenir une variable validée (avec fallback)
export function getValidatedEnvVar(name, fallback = null) {
  const config = REQUIRED_ENV_VARS[name];
  if (!config) {
    // Variable non définie dans notre config, retourner la valeur brute
    return readEnvValue(name) || fallback;
  }

  const result = validateEnvVar(name, config);
  return result.valid ? result.value : fallback;
}

// Validation au démarrage (server-side uniquement)
export function validateEnvironmentOnStart() {
  if (typeof window !== 'undefined') {
    // Côté client, on ne fait rien pour éviter d'exposer les erreurs
    return;
  }

  const validation = validateEnvironment("server");

  if (!validation.valid) {
    console.error('❌ Environment validation failed:');
    validation.errors.forEach(error => console.error(`  - ${error}`));

    // En développement, on peut continuer avec un warning
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Continuing in development mode, but some features may not work properly.');
      return;
    }

    // En production, on arrête le processus
    throw new Error('Environment validation failed. Please check your environment variables.');
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠️ Environment warnings:');
    validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  console.log('✅ Environment validation passed');
}

// Export pour les tests
export { REQUIRED_ENV_VARS, REQUIRED_CLIENT_ENV_VARS, REQUIRED_SERVER_ENV_VARS };
