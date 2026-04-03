import { NextResponse } from "next/server";

const FIREBASE_ACCOUNTS_LOOKUP_URL = "https://identitytoolkit.googleapis.com/v1/accounts:lookup";

function normalizeEnvValue(value = "") {
  return String(value ?? "").trim().replace(/^['"]|['"]$/g, "");
}

function getFirebaseWebApiKey() {
  return normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_WEB_API_KEY);
}

function getMissingConfigKeys() {
  const missingKeys = [];

  if (!getFirebaseWebApiKey()) {
    missingKeys.push("NEXT_PUBLIC_FIREBASE_API_KEY or FIREBASE_WEB_API_KEY");
  }

  return missingKeys;
}

export function getFirebaseAuthConfigIssues() {
  return getMissingConfigKeys();
}

export function hasFirebaseAuthServerConfig() {
  return getMissingConfigKeys().length === 0;
}

function readJsonSafely(rawText = "") {
  if (!rawText) {
    return null;
  }

  try {
    return JSON.parse(rawText);
  } catch {
    return null;
  }
}

export function extractBearerToken(request) {
  const authorizationHeader = String(request?.headers?.get("authorization") || "").trim();
  if (!authorizationHeader.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authorizationHeader.slice("Bearer ".length).trim();
}

export async function verifyFirebaseIdToken(idToken) {
  const normalizedToken = String(idToken || "").trim();
  if (!normalizedToken) {
    return null;
  }

  const apiKey = getFirebaseWebApiKey();
  if (!apiKey) {
    throw new Error(`firebase_auth_config_missing:${getMissingConfigKeys().join(",")}`);
  }

  const response = await fetch(`${FIREBASE_ACCOUNTS_LOOKUP_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ idToken: normalizedToken }),
    cache: "no-store",
  });

  const rawPayload = await response.text();
  const payload = readJsonSafely(rawPayload);
  const resolvedUser = Array.isArray(payload?.users) ? payload.users[0] : null;

  if (!response.ok || !resolvedUser?.localId) {
    return null;
  }

  return {
    uid: String(resolvedUser.localId || "").trim(),
    email: String(resolvedUser.email || "").trim().toLowerCase(),
    emailVerified: Boolean(resolvedUser.emailVerified),
    displayName: String(resolvedUser.displayName || "").trim(),
  };
}

export async function authenticateFirebaseUserFromRequest(request) {
  const token = extractBearerToken(request);
  if (!token) {
    return null;
  }

  return verifyFirebaseIdToken(token);
}

export function unauthorizedJson(payload = { error: "unauthorized" }) {
  return NextResponse.json(payload, {
    status: 401,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
