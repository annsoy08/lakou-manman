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
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request) {
  try {
    const authenticatedUser = await authenticateFirebaseUserFromRequest(request);
    if (!authenticatedUser?.uid) return unauthorizedJson();

    const body = await request.json().catch(() => ({}));
    const streamId = String(body?.streamId || "").trim();
    const role = String(body?.role || "audience").trim();

    if (!streamId) return noStoreJson({ error: "missing_stream_id" }, 400);

    const appId = getAgoraAppId();
    const appCertificate = getAgoraAppCertificate();
    if (!appId || !appCertificate) return noStoreJson({ error: "agora_config_missing" }, 503);

    const stream = await getDocumentAsAdmin(`liveStreams/${streamId}`);
    if (!stream?.channelName) return noStoreJson({ error: "stream_not_found" }, 404);
    if (stream.status === "ended") return noStoreJson({ error: "stream_ended" }, 409);

    if (role === "host" && stream.hostId !== authenticatedUser.uid) {
      return unauthorizedJson({ error: "not_stream_host" });
    }

    const RtcTokenBuilder = agoraTokenSdk?.RtcTokenBuilder;
    const RtcRole = agoraTokenSdk?.RtcRole;
    if (!RtcTokenBuilder || !RtcRole) return noStoreJson({ error: "agora_sdk_missing" }, 503);

    const agoraRole = role === "host"
      ? (RtcRole.PUBLISHER ?? RtcRole.ROLE_PUBLISHER ?? 1)
      : (RtcRole.SUBSCRIBER ?? RtcRole.ROLE_SUBSCRIBER ?? 2);

    const privilegeExpiredTs = Math.floor(Date.now() / 1000) + 4 * 60 * 60;
    const token = typeof RtcTokenBuilder.buildTokenWithUserAccount === "function"
      ? RtcTokenBuilder.buildTokenWithUserAccount(
          appId, appCertificate, stream.channelName, authenticatedUser.uid, agoraRole, privilegeExpiredTs
        )
      : RtcTokenBuilder.buildTokenWithUid(
          appId, appCertificate, stream.channelName, 0, agoraRole, privilegeExpiredTs
        );

    return noStoreJson({
      appId,
      channel: stream.channelName,
      token,
      uid: authenticatedUser.uid,
      role,
      expiresAt: privilegeExpiredTs,
    });
  } catch (error) {
    console.error("Agora live-token error:", error);
    return noStoreJson({ error: "agora_live_token_error" }, 500);
  }
}
