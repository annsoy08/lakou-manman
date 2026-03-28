import { createSign } from "crypto";

const FIRESTORE_SCOPE = "https://www.googleapis.com/auth/datastore";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

let cachedAccessToken = "";
let cachedAccessTokenExpiresAt = 0;

function normalizeEnvValue(value = "") {
  return String(value ?? "").trim().replace(/^['"]|['"]$/g, "");
}

function getProjectId() {
  return normalizeEnvValue(process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
}

function getClientEmail() {
  return normalizeEnvValue(process.env.FIREBASE_ADMIN_CLIENT_EMAIL);
}

function getPrivateKey() {
  return normalizeEnvValue(process.env.FIREBASE_ADMIN_PRIVATE_KEY).replace(/\\n/g, "\n");
}

function getMissingConfigKeys() {
  const missingKeys = [];

  if (!getProjectId()) {
    missingKeys.push("FIREBASE_ADMIN_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  }

  if (!getClientEmail()) {
    missingKeys.push("FIREBASE_ADMIN_CLIENT_EMAIL");
  }

  if (!getPrivateKey()) {
    missingKeys.push("FIREBASE_ADMIN_PRIVATE_KEY");
  }

  return missingKeys;
}

export function getFirestoreAdminConfigIssues() {
  return getMissingConfigKeys();
}

export function hasFirestoreAdminConfig() {
  return getMissingConfigKeys().length === 0;
}

function assertFirestoreAdminConfig() {
  const missingKeys = getMissingConfigKeys();
  if (missingKeys.length > 0) {
    throw new Error(`firebase_admin_config_missing:${missingKeys.join(",")}`);
  }
}

function base64UrlEncode(value) {
  const rawValue = typeof value === "string" ? value : JSON.stringify(value);
  return Buffer.from(rawValue)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createJwtAssertion() {
  const clientEmail = getClientEmail();
  const privateKey = getPrivateKey();
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + 3600;
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: GOOGLE_TOKEN_URL,
    iat: issuedAt,
    exp: expiresAt,
    scope: FIRESTORE_SCOPE,
  };
  const signingInput = `${base64UrlEncode(header)}.${base64UrlEncode(payload)}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();

  const signature = signer
    .sign(privateKey, "base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  return `${signingInput}.${signature}`;
}

async function readJsonSafely(response) {
  const rawText = await response.text();

  if (!rawText) {
    return null;
  }

  try {
    return JSON.parse(rawText);
  } catch {
    return { raw: rawText };
  }
}

async function getAccessToken(forceRefresh = false) {
  if (!forceRefresh && cachedAccessToken && cachedAccessTokenExpiresAt > Date.now() + 60_000) {
    return cachedAccessToken;
  }

  assertFirestoreAdminConfig();

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: createJwtAssertion(),
    }).toString(),
    cache: "no-store",
  });

  const tokenPayload = await readJsonSafely(tokenResponse);
  if (!tokenResponse.ok || !tokenPayload?.access_token) {
    throw new Error(
      tokenPayload?.error_description
        || tokenPayload?.error
        || `firebase_admin_token_request_failed:${tokenResponse.status}`
    );
  }

  cachedAccessToken = String(tokenPayload.access_token || "").trim();
  cachedAccessTokenExpiresAt = Date.now() + Math.max((Number(tokenPayload.expires_in) || 3600) * 1000 - 60_000, 60_000);
  return cachedAccessToken;
}

function getFirestoreBaseUrl() {
  return `https://firestore.googleapis.com/v1/projects/${getProjectId()}/databases/(default)`;
}

async function firestoreRequest(path, options = {}, allowRetry = true) {
  const accessToken = await getAccessToken();
  const response = await fetch(`${getFirestoreBaseUrl()}${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const payload = await readJsonSafely(response);
  if (response.status === 401 && allowRetry) {
    cachedAccessToken = "";
    cachedAccessTokenExpiresAt = 0;
    return firestoreRequest(path, options, false);
  }

  if (!response.ok) {
    throw new Error(
      payload?.error?.message
        || payload?.error?.status
        || `firestore_admin_request_failed:${response.status}`
    );
  }

  return payload;
}

function toFirestoreValue(value) {
  if (value === null) {
    return { nullValue: null };
  }

  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }

  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((entry) => toFirestoreValue(entry)),
      },
    };
  }

  if (typeof value === "string") {
    return { stringValue: value };
  }

  if (typeof value === "boolean") {
    return { booleanValue: value };
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return { nullValue: null };
    }

    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }

  if (value && typeof value === "object") {
    return {
      mapValue: {
        fields: toFirestoreFields(value),
      },
    };
  }

  return { nullValue: null };
}

function toFirestoreFields(data = {}) {
  return Object.entries(data).reduce((accumulator, [key, value]) => {
    if (value !== undefined) {
      accumulator[key] = toFirestoreValue(value);
    }
    return accumulator;
  }, {});
}

function createTimestampWrapper(timestampValue = "") {
  const timestampMs = Date.parse(timestampValue);
  return {
    toMillis() {
      return Number.isFinite(timestampMs) ? timestampMs : 0;
    },
    toDate() {
      return Number.isFinite(timestampMs) ? new Date(timestampMs) : new Date(0);
    },
    toString() {
      return timestampValue;
    },
    valueOf() {
      return this.toMillis();
    },
  };
}

function fromFirestoreValue(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(value, "nullValue")) {
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(value, "stringValue")) {
    return value.stringValue;
  }

  if (Object.prototype.hasOwnProperty.call(value, "booleanValue")) {
    return Boolean(value.booleanValue);
  }

  if (Object.prototype.hasOwnProperty.call(value, "integerValue")) {
    return Number(value.integerValue || 0);
  }

  if (Object.prototype.hasOwnProperty.call(value, "doubleValue")) {
    return Number(value.doubleValue || 0);
  }

  if (Object.prototype.hasOwnProperty.call(value, "timestampValue")) {
    return createTimestampWrapper(String(value.timestampValue || ""));
  }

  if (Object.prototype.hasOwnProperty.call(value, "mapValue")) {
    return fromFirestoreFields(value.mapValue?.fields || {});
  }

  if (Object.prototype.hasOwnProperty.call(value, "arrayValue")) {
    return Array.isArray(value.arrayValue?.values)
      ? value.arrayValue.values.map((entry) => fromFirestoreValue(entry))
      : [];
  }

  return null;
}

function fromFirestoreFields(fields = {}) {
  return Object.entries(fields).reduce((accumulator, [key, value]) => {
    accumulator[key] = fromFirestoreValue(value);
    return accumulator;
  }, {});
}

function normalizeDocumentPath(documentName = "") {
  const marker = "/documents/";
  const markerIndex = documentName.indexOf(marker);
  return markerIndex >= 0 ? documentName.slice(markerIndex + marker.length) : "";
}

function fromFirestoreDocument(document = {}) {
  const documentName = String(document.name || "").trim();
  const documentPath = normalizeDocumentPath(documentName);
  const documentId = documentPath ? documentPath.split("/").pop() || "" : "";
  return {
    id: documentId,
    ...fromFirestoreFields(document.fields || {}),
    __documentName: documentName,
    __documentPath: documentPath,
  };
}

function normalizeShopOrderPaymentStatus(value = "") {
  const normalized = String(value || "").trim().toLowerCase();

  if (["paid", "completed", "success", "succeeded"].includes(normalized)) {
    return "completed";
  }

  if (["failed", "failure", "error", "declined"].includes(normalized)) {
    return "failed";
  }

  if (["refunded", "refund"].includes(normalized)) {
    return "refunded";
  }

  if (["cancelled", "canceled"].includes(normalized)) {
    return "cancelled";
  }

  if (["pending", "processing", "initiated"].includes(normalized)) {
    return "pending";
  }

  return normalized || "pending";
}

function normalizeShopOrderSupportStatus(value = "") {
  const normalized = String(value || "").trim().toLowerCase();

  if (["resolved", "done", "closed", "complete"].includes(normalized)) {
    return "resolved";
  }

  if (["monitoring", "pending", "followup", "follow_up"].includes(normalized)) {
    return "monitoring";
  }

  if (["action_required", "issue", "attention", "needs_attention"].includes(normalized)) {
    return "action_required";
  }

  if (["refunded", "refund"].includes(normalized)) {
    return "refunded";
  }

  return normalized || "none";
}

function getDefaultSupportStatusFromPaymentStatus(status = "", isRealMonCash = false) {
  const normalizedStatus = normalizeShopOrderPaymentStatus(status);

  if (normalizedStatus === "completed") {
    return "resolved";
  }

  if (normalizedStatus === "refunded") {
    return "refunded";
  }

  if (["failed", "cancelled"].includes(normalizedStatus)) {
    return "action_required";
  }

  if (normalizedStatus === "pending" && isRealMonCash) {
    return "monitoring";
  }

  return "none";
}

function normalizeShopOrderFulfillmentStatus(value = "") {
  const normalized = String(value || "").trim().toLowerCase();

  if (["awaiting_payment", "payment_pending", "pending_payment"].includes(normalized)) {
    return "awaiting_payment";
  }

  if (["confirmed", "payment_confirmed", "paid"].includes(normalized)) {
    return "confirmed";
  }

  if (["preparing", "processing", "packing"].includes(normalized)) {
    return "preparing";
  }

  if (["ready_for_pickup", "ready", "pickup_ready"].includes(normalized)) {
    return "ready_for_pickup";
  }

  if (["in_delivery", "shipping", "shipped", "in_transit"].includes(normalized)) {
    return "in_delivery";
  }

  if (["delivered", "completed_delivery"].includes(normalized)) {
    return "delivered";
  }

  if (["cancelled", "canceled"].includes(normalized)) {
    return "cancelled";
  }

  if (["refund_requested", "refund_pending"].includes(normalized)) {
    return "refund_requested";
  }

  if (["refunded", "refund_complete"].includes(normalized)) {
    return "refunded";
  }

  return normalized || "awaiting_payment";
}

function getDefaultFulfillmentStatusFromPaymentStatus(status = "") {
  const normalizedStatus = normalizeShopOrderPaymentStatus(status);

  if (normalizedStatus === "completed") {
    return "confirmed";
  }

  if (normalizedStatus === "refunded") {
    return "refunded";
  }

  if (normalizedStatus === "cancelled") {
    return "cancelled";
  }

  return "awaiting_payment";
}

function shouldPreserveExistingShopOrderStatus(currentStatus = "", nextStatus = "") {
  const normalizedCurrentStatus = normalizeShopOrderPaymentStatus(currentStatus);
  const normalizedNextStatus = normalizeShopOrderPaymentStatus(nextStatus);

  if (!normalizedNextStatus || normalizedCurrentStatus === normalizedNextStatus) {
    return false;
  }

  if (["completed", "refunded", "cancelled"].includes(normalizedCurrentStatus)) {
    return ["pending", "failed"].includes(normalizedNextStatus);
  }

  if (normalizedCurrentStatus === "failed") {
    return normalizedNextStatus === "pending";
  }

  return false;
}

function normalizeShopOrderProofStatus(value = "") {
  const normalized = String(value || "").trim().toLowerCase();

  if (["missing", "absent"].includes(normalized)) {
    return "missing";
  }

  if (["pending", "awaiting", "to_review", "review_pending"].includes(normalized)) {
    return "pending";
  }

  if (["provided", "submitted", "received"].includes(normalized)) {
    return "provided";
  }

  if (["verified", "confirmed", "validated"].includes(normalized)) {
    return "verified";
  }

  if (["rejected", "invalid"].includes(normalized)) {
    return "rejected";
  }

  return normalized || "pending";
}

function stripUndefinedFields(data = {}) {
  return Object.entries(data).reduce((accumulator, [key, value]) => {
    if (value !== undefined) {
      accumulator[key] = value;
    }
    return accumulator;
  }, {});
}

async function queryFirstDocumentByField(collectionId, fieldName, value) {
  const queryPayload = {
    structuredQuery: {
      from: [{ collectionId }],
      where: {
        fieldFilter: {
          field: { fieldPath: fieldName },
          op: "EQUAL",
          value: toFirestoreValue(value),
        },
      },
      limit: 1,
    },
  };

  const queryResponse = await firestoreRequest("/documents:runQuery", {
    method: "POST",
    body: queryPayload,
  });

  if (!Array.isArray(queryResponse)) {
    return null;
  }

  const match = queryResponse.find((entry) => entry?.document);
  return match?.document ? fromFirestoreDocument(match.document) : null;
}

async function patchDocument(documentPath, data = {}) {
  const normalizedDocumentPath = String(documentPath || "").trim();
  const fields = toFirestoreFields(stripUndefinedFields(data));
  const fieldPaths = Object.keys(fields);

  if (!normalizedDocumentPath || fieldPaths.length === 0) {
    return null;
  }

  const queryString = new URLSearchParams();
  fieldPaths.forEach((fieldPath) => {
    queryString.append("updateMask.fieldPaths", fieldPath);
  });

  return firestoreRequest(`/documents/${normalizedDocumentPath}?${queryString.toString()}`, {
    method: "PATCH",
    body: { fields },
  });
}

export async function updateShopOrderByTransactionIdAsAdmin(transactionId, data = {}) {
  const normalizedTransactionId = String(transactionId || "").trim();
  if (!normalizedTransactionId) {
    return null;
  }

  const existingOrder = await queryFirstDocumentByField("shopOrders", "transactionId", normalizedTransactionId);
  if (!existingOrder?.id || !existingOrder.__documentPath) {
    return null;
  }

  const normalizedExistingStatus = normalizeShopOrderPaymentStatus(
    existingOrder.paymentStatus || existingOrder.status || ""
  );
  const normalizedIncomingStatus = normalizeShopOrderPaymentStatus(
    data.paymentStatus ?? data.status ?? ""
  );
  const nextData = {
    ...(data && typeof data === "object" ? data : {}),
    realMonCash: data.realMonCash ?? existingOrder.realMonCash,
  };

  if (shouldPreserveExistingShopOrderStatus(normalizedExistingStatus, normalizedIncomingStatus)) {
    delete nextData.paymentStatus;
    delete nextData.status;
    delete nextData.supportStatus;
    delete nextData.fulfillmentStatus;
  }

  const nextPaymentStatus = nextData.paymentStatus || nextData.status;
  const normalizedPaymentStatus = nextPaymentStatus ? normalizeShopOrderPaymentStatus(nextPaymentStatus) : null;
  const payload = stripUndefinedFields({
    ...nextData,
    ...(normalizedPaymentStatus ? {
      paymentStatus: normalizedPaymentStatus,
      status: normalizedPaymentStatus,
      supportStatus: nextData.supportStatus || getDefaultSupportStatusFromPaymentStatus(normalizedPaymentStatus, Boolean(nextData.realMonCash)),
      fulfillmentStatus: nextData.fulfillmentStatus || getDefaultFulfillmentStatusFromPaymentStatus(normalizedPaymentStatus),
    } : {}),
    ...(nextData.paymentProofStatus ? { paymentProofStatus: normalizeShopOrderProofStatus(nextData.paymentProofStatus) } : {}),
    updatedAt: new Date(),
  });

  await patchDocument(existingOrder.__documentPath, payload);
  return {
    ...existingOrder,
    ...payload,
    id: existingOrder.id,
  };
}

export async function markShopItemSoldAsAdmin(itemId) {
  const normalizedItemId = String(itemId || "").trim();
  if (!normalizedItemId) {
    throw new Error("Missing shop item id");
  }

  await patchDocument(`shopItems/${normalizedItemId}`, {
    status: "sold",
    soldAt: new Date(),
    updatedAt: new Date(),
  });

  return normalizedItemId;
}
