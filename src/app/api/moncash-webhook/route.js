import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import {
  getFirestoreAdminConfigIssues,
  hasFirestoreAdminConfig,
  markShopItemSoldAsAdmin,
  updateShopOrderByTransactionIdAsAdmin,
} from "@/lib/server/firestore-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEBHOOK_SIGNATURE_HEADER_NAMES = [
  "x-moncash-signature",
  "x-signature",
  "moncash-signature",
  "x-webhook-signature",
];
const SUPPORTED_WEBHOOK_EVENTS = new Set([
  "payment.completed",
  "payment.failed",
  "payment.pending",
]);

function jsonNoStore(payload, init = {}) {
  return NextResponse.json(payload, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...(init.headers || {}),
    },
  });
}

function parseWebhookBody(rawBody = "") {
  if (!rawBody) {
    return null;
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}

function getWebhookSignature(request) {
  for (const headerName of WEBHOOK_SIGNATURE_HEADER_NAMES) {
    const headerValue = String(request.headers.get(headerName) || "").trim();
    if (headerValue) {
      return headerValue;
    }
  }

  return "";
}

function normalizeSignature(signature = "") {
  return String(signature || "")
    .trim()
    .replace(/^sha256=/i, "")
    .toLowerCase();
}

function isValidWebhookSignature(rawBody = "", signature = "", secret = "") {
  const normalizedSecret = String(secret || "").trim();
  const normalizedSignature = normalizeSignature(signature);
  if (!normalizedSecret) {
    return true;
  }

  if (!rawBody || !normalizedSignature || normalizedSignature.length % 2 !== 0) {
    return false;
  }

  const expectedDigest = createHmac("sha256", normalizedSecret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expectedDigest, "hex");
  const receivedBuffer = Buffer.from(normalizedSignature, "hex");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

function isWebhookSecretRequired() {
  return process.env.NODE_ENV === "production"
    || String(process.env.MONCASH_WEBHOOK_REQUIRE_SIGNATURE || "").trim().toLowerCase() === "true";
}

function getWebhookEvent(body = {}) {
  return String(body?.event || body?.type || "").trim().toLowerCase();
}

function getWebhookTransactionId(body = {}) {
  return String(
    body?.transaction_id ||
      body?.transactionId ||
      body?.payment_id ||
      body?.paymentId ||
      body?.reference ||
      ""
  ).trim();
}

function getWebhookUpdatePayload(event, body = {}) {
  const rawStatus = String(body?.status || "").trim().toLowerCase();

  if (event === "payment.completed") {
    return {
      paymentStatus: "completed",
      status: "completed",
      supportStatus: "resolved",
      transactionId: getWebhookTransactionId(body),
      referenceNumber: body?.reference_number || body?.referenceNumber || "",
      webhookEvent: event,
      moncashStatus: rawStatus || "completed",
      lastWebhookAt: new Date().toISOString(),
    };
  }

  if (event === "payment.failed") {
    return {
      paymentStatus: "failed",
      status: "failed",
      supportStatus: "action_required",
      transactionId: getWebhookTransactionId(body),
      referenceNumber: body?.reference_number || body?.referenceNumber || "",
      webhookEvent: event,
      moncashStatus: rawStatus || "failed",
      lastWebhookAt: new Date().toISOString(),
    };
  }

  if (event === "payment.pending") {
    return {
      paymentStatus: "pending",
      status: "pending",
      supportStatus: "monitoring",
      transactionId: getWebhookTransactionId(body),
      referenceNumber: body?.reference_number || body?.referenceNumber || "",
      webhookEvent: event,
      moncashStatus: rawStatus || "pending",
      lastWebhookAt: new Date().toISOString(),
    };
  }

  return null;
}

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const body = parseWebhookBody(rawBody);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonNoStore(
        {
          success: false,
          error: "Invalid webhook payload",
        },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.MONCASH_WEBHOOK_SECRET;
    const signature = getWebhookSignature(request);
    if (!webhookSecret && isWebhookSecretRequired()) {
      return jsonNoStore(
        {
          success: false,
          error: "Webhook signature secret is not configured",
        },
        { status: 503 }
      );
    }

    if (webhookSecret && !isValidWebhookSignature(rawBody, signature, webhookSecret)) {
      return jsonNoStore(
        {
          success: false,
          error: "Invalid webhook signature",
        },
        { status: 401 }
      );
    }

    const event = getWebhookEvent(body);
    const { payment_id, status, transaction_id } = body;
    const lookupTransactionId = getWebhookTransactionId(body);
    const updatePayload = getWebhookUpdatePayload(event, body);

    if (!event) {
      return jsonNoStore(
        {
          success: false,
          error: "Missing webhook event",
        },
        { status: 400 }
      );
    }

    if (!SUPPORTED_WEBHOOK_EVENTS.has(event)) {
      return jsonNoStore({
        success: true,
        ignored: true,
        event,
        message: "Unsupported webhook event ignored",
      });
    }

    if (updatePayload && !lookupTransactionId) {
      return jsonNoStore(
        {
          success: false,
          error: "Missing transaction id",
          event,
        },
        { status: 400 }
      );
    }

    if (!hasFirestoreAdminConfig()) {
      const configIssues = getFirestoreAdminConfigIssues();
      return jsonNoStore(
        {
          success: false,
          error: "Firebase admin configuration is missing",
          ...(process.env.NODE_ENV !== "production" ? { missing: configIssues } : {}),
        },
        { status: 503 }
      );
    }

    let matchedOrder = null;
    if (updatePayload && lookupTransactionId) {
      matchedOrder = await updateShopOrderByTransactionIdAsAdmin(lookupTransactionId, {
        ...updatePayload,
        realMonCash: true,
      });

      if (matchedOrder?.itemId && updatePayload.paymentStatus === "completed") {
        await markShopItemSoldAsAdmin(matchedOrder.itemId);
      }
    }

    console.log("MONCASH WEBHOOK: Received webhook", {
      event,
      payment_id,
      transaction_id: lookupTransactionId,
      status,
      matchedOrderId: matchedOrder?.id || null,
    });

    switch (event) {
      case "payment.completed":
        console.log("MONCASH WEBHOOK: Payment completed", {
          payment_id,
          transaction_id,
          status,
          matchedOrderId: matchedOrder?.id || null,
        });

        return jsonNoStore({
          success: true,
          matched: Boolean(matchedOrder),
          message: matchedOrder ? "Payment completed successfully" : "Payment completed, no matching order found",
          payment_id,
          transaction_id: lookupTransactionId,
          status: "completed",
        });

      case "payment.failed":
        console.log("MONCASH WEBHOOK: Payment failed", {
          payment_id,
          transaction_id,
          status,
          matchedOrderId: matchedOrder?.id || null,
        });

        return jsonNoStore({
          success: true,
          matched: Boolean(matchedOrder),
          message: matchedOrder ? "Payment failed" : "Payment failed, no matching order found",
          payment_id,
          transaction_id: lookupTransactionId,
          status: "failed",
        });

      case "payment.pending":
        console.log("MONCASH WEBHOOK: Payment pending", {
          payment_id,
          transaction_id,
          status,
          matchedOrderId: matchedOrder?.id || null,
        });

        return jsonNoStore({
          success: true,
          matched: Boolean(matchedOrder),
          message: matchedOrder
            ? "Payment pending SMS confirmation"
            : "Payment pending, no matching order found",
          payment_id,
          transaction_id: lookupTransactionId,
          status: "pending",
        });

      default:
        console.log("MONCASH WEBHOOK: Unknown event", event);
        return jsonNoStore({
          success: true,
          message: "Webhook received",
          event,
        });
    }
  } catch (error) {
    console.error("MONCASH WEBHOOK ERROR:", error);
    return jsonNoStore(
      {
        success: false,
        error: "Webhook processing failed",
        message: String(error?.message || "Unexpected webhook error"),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return jsonNoStore({
    message: "MonCash webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
