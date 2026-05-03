import { NextResponse } from "next/server";
import { authenticateFirebaseUserFromRequest, unauthorizedJson } from "@/lib/server/firebase-auth";
import { getDocumentAsAdmin } from "@/lib/server/firestore-admin";
import * as agoraTokenSdkImport from "agora-token";

const agoraTokenSdk = agoraTokenSdkImport?.default || agoraTokenSdkImport;

function normalizeEnvValue(value = "") {
  return String(value ?? "").trim().replace(/^['"]|['"]$/g, "");
}

function getAgoraAppId() {
  return normalizeEnvValue(process.env.NEXT_PUBLIC_AGORA_APP_ID || process.env.AGORA_APP_ID);
}

function getAgoraAppCertificate() {
  return normalizeEnvValue(process.env.AGORA_APP_CERTIFICATE);
}

function noStoreJson(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request) {
  try {
    const authenticatedUser = await authenticateFirebaseUserFromRequest(request);
    if (!authenticatedUser?.uid) {
      return unauthorizedJson();
    }

    const requestBody = await request.json().catch(() => ({}));
    const conversationId = String(requestBody?.conversationId || "").trim();
    if (!conversationId) {
      return noStoreJson({ error: "missing_conversation_id" }, 400);
    }

    const appId = getAgoraAppId();
    const appCertificate = getAgoraAppCertificate();
    if (!appId || !appCertificate) {
      return noStoreJson({ error: "agora_config_missing" }, 503);
    }

    const callSession = await getDocumentAsAdmin(`conversationCalls/${conversationId}`);
    if (!callSession?.conversationId || !Array.isArray(callSession?.participants)) {
      return noStoreJson({ error: "conversation_call_not_found" }, 404);
    }

    const participants = callSession.participants
      .map((participantId) => String(participantId || "").trim())
      .filter(Boolean);

    if (!participants.includes(authenticatedUser.uid)) {
      return unauthorizedJson({ error: "unauthorized_call_participant" });
    }

    const callStatus = String(callSession.status || "").trim().toLowerCase();
    if (!callStatus || !["ringing", "active"].includes(callStatus)) {
      return noStoreJson({ error: "conversation_call_not_joinable" }, 409);
    }

    const channelName = String(callSession.channelName || "").trim();
    if (!channelName) {
      return noStoreJson({ error: "missing_call_channel" }, 409);
    }

    const RtcTokenBuilder = agoraTokenSdk?.RtcTokenBuilder;
    const RtcRole = agoraTokenSdk?.RtcRole;
    if (!RtcTokenBuilder || !RtcRole) {
      return noStoreJson({ error: "agora_sdk_missing" }, 503);
    }

    const privilegeExpiredTs = Math.floor(Date.now() / 1000) + 60 * 60;
    const rtcRole = RtcRole.PUBLISHER ?? RtcRole.ROLE_PUBLISHER ?? 1;
    const token = typeof RtcTokenBuilder.buildTokenWithUserAccount === "function"
      ? RtcTokenBuilder.buildTokenWithUserAccount(
          appId,
          appCertificate,
          channelName,
          authenticatedUser.uid,
          rtcRole,
          privilegeExpiredTs
        )
      : RtcTokenBuilder.buildTokenWithUid(
          appId,
          appCertificate,
          channelName,
          0,
          rtcRole,
          privilegeExpiredTs
        );

    return noStoreJson({
      appId,
      channel: channelName,
      token,
      uid: authenticatedUser.uid,
      expiresAt: privilegeExpiredTs,
    });
  } catch (error) {
    console.error("Agora token error:", error);
    return noStoreJson({ error: "agora_token_error" }, 500);
  }
}
