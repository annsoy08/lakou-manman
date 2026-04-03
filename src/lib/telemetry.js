import { fetchWithTimeout } from "./fetch-wrapper";

const TELEMETRY_QUEUE_KEY = "lakou_manman_telemetry_queue_v1";
const MAX_TELEMETRY_ENTRIES = 100;
let telemetryFlushInFlight = false;

let telemetryUserContext = {
  userId: "",
  role: "",
  isAuthenticated: false,
};

function isClientDebugLoggingEnabled() {
  const flag = String(
    process.env.NEXT_PUBLIC_ENABLE_CLIENT_DEBUG_LOGS
      || process.env.NEXT_PUBLIC_ENABLE_TELEMETRY_DEBUG
      || ""
  ).trim().toLowerCase();

  return flag === "true" || flag === "1" || flag === "yes";
}

function isBrowser() {
  return typeof window !== "undefined";
}

function buildId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const sessionId = buildId();

function getEnvironment() {
  return process.env.NODE_ENV || "development";
}

function readTelemetryQueue() {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(TELEMETRY_QUEUE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function removeTelemetryQueueEntries(entryIds = []) {
  if (!isBrowser() || !Array.isArray(entryIds) || entryIds.length === 0) {
    return;
  }

  const ids = new Set(entryIds.filter(Boolean));
  if (ids.size === 0) {
    return;
  }

  const queue = readTelemetryQueue();
  if (!queue.length) {
    return;
  }

  writeTelemetryQueue(queue.filter((entry) => !ids.has(entry?.id)));
}

function writeTelemetryQueue(entries) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(TELEMETRY_QUEUE_KEY, JSON.stringify(entries.slice(-MAX_TELEMETRY_ENTRIES)));
  } catch {
  }
}

function getRuntimeContext() {
  if (!isBrowser()) {
    return {
      sessionId,
      environment: getEnvironment(),
      pathname: "",
      href: "",
      online: true,
      language: "",
      userAgent: "",
      viewport: null,
      user: telemetryUserContext,
    };
  }

  return {
    sessionId,
    environment: getEnvironment(),
    pathname: window.location.pathname,
    href: window.location.href,
    online: typeof navigator === "undefined" ? true : navigator.onLine,
    language: typeof navigator === "undefined" ? "" : navigator.language,
    userAgent: typeof navigator === "undefined" ? "" : navigator.userAgent,
    viewport: typeof window.innerWidth === "number" && typeof window.innerHeight === "number"
      ? { width: window.innerWidth, height: window.innerHeight }
      : null,
    user: telemetryUserContext,
  };
}

function sanitizePayload(payload = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }

  const sanitized = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    if (value instanceof Error) {
      sanitized[key] = serializeError(value);
      return;
    }

    if (typeof value === "function") {
      return;
    }

    sanitized[key] = value;
  });
  return sanitized;
}

function serializeError(error) {
  if (!error) {
    return {
      name: "Error",
      message: "Unknown error",
      stack: "",
      code: "",
    };
  }

  return {
    name: String(error.name || "Error"),
    message: String(error.message || error),
    stack: typeof error.stack === "string" ? error.stack.slice(0, 4000) : "",
    code: String(error.code || ""),
  };
}

function sendToAnalyticsProviders(entry) {
  if (!isBrowser()) {
    return;
  }

  try {
    if (typeof window.gtag === "function") {
      if (entry.type === "page_view") {
        window.gtag("event", "page_view", {
          page_path: entry.context.pathname,
          page_location: entry.context.href,
          user_id: entry.context.user?.userId || undefined,
        });
      }

      if (entry.type === "event") {
        window.gtag("event", entry.name, sanitizePayload(entry.payload));
      }

      if (entry.type === "error") {
        window.gtag("event", "exception", {
          description: entry.payload?.error?.message || entry.name,
          fatal: false,
        });
      }
    }
  } catch {
  }
}

function recordTelemetry(type, name, payload = {}) {
  const entry = {
    id: buildId(),
    type,
    name,
    payload: sanitizePayload(payload),
    context: getRuntimeContext(),
    timestamp: new Date().toISOString(),
  };

  const queue = readTelemetryQueue();
  queue.push(entry);
  writeTelemetryQueue(queue);

  if (getEnvironment() !== "production" && isClientDebugLoggingEnabled()) {
    const logger = type === "error" ? console.error : console.info;
    logger(`[telemetry:${type}] ${name}`, entry.payload);
  }

  sendToAnalyticsProviders(entry);
  return entry;
}

export function setTelemetryUserContext(userContext = {}) {
  telemetryUserContext = {
    ...telemetryUserContext,
    ...sanitizePayload(userContext),
  };
}

export function trackPageView(pathname, payload = {}) {
  return recordTelemetry("page_view", "page_view", {
    pathname,
    ...payload,
  });
}

export function trackEvent(name, payload = {}) {
  return recordTelemetry("event", name, payload);
}

export function trackMetric(name, value, payload = {}) {
  return recordTelemetry("metric", name, {
    value,
    ...payload,
  });
}

export function logTechnicalEvent(name, payload = {}) {
  return recordTelemetry("technical", name, payload);
}

export function trackError(error, payload = {}) {
  return recordTelemetry("error", payload.scope || "runtime_error", {
    ...payload,
    error: serializeError(error),
  });
}

export function flushTelemetry(reason = "manual") {
  if (!isBrowser()) {
    return false;
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return false;
  }

  if (telemetryFlushInFlight) {
    return false;
  }

  const endpoint = process.env.NEXT_PUBLIC_MONITORING_ENDPOINT || process.env.NEXT_PUBLIC_TELEMETRY_ENDPOINT || "/api/telemetry";
  if (!endpoint) {
    return false;
  }

  const queue = readTelemetryQueue();
  if (!queue.length) {
    return false;
  }

  const eventsToFlush = queue.slice(-25);
  const flushedEntryIds = eventsToFlush.map((entry) => entry?.id).filter(Boolean);
  if (!eventsToFlush.length) {
    return false;
  }

  const body = JSON.stringify({
    reason,
    sessionId,
    count: eventsToFlush.length,
    events: eventsToFlush,
  });

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const sent = navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
      if (sent) {
        removeTelemetryQueueEntries(flushedEntryIds);
      }
      return sent;
    }
  } catch {
  }

  try {
    telemetryFlushInFlight = true;
    fetchWithTimeout(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    })
      .then(() => {
        removeTelemetryQueueEntries(flushedEntryIds);
      })
      .catch(() => {})
      .finally(() => {
        telemetryFlushInFlight = false;
      });
    return true;
  } catch {
    telemetryFlushInFlight = false;
    return false;
  }
}

export function getTelemetryQueueSnapshot() {
  return readTelemetryQueue();
}
