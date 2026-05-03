import { NextResponse } from "next/server";
import { authenticateFirebaseUserFromRequest, unauthorizedJson } from "@/lib/server/firebase-auth";
import { getDocumentAsAdmin, patchDocumentAsAdmin } from "@/lib/server/firestore-admin";

function normalizeEnvValue(value = "") {
  return String(value ?? "").trim().replace(/^['"]|['"]$/g, "");
}

function getAgoraAppId() {
  return normalizeEnvValue(process.env.NEXT_PUBLIC_AGORA_APP_ID || process.env.AGORA_APP_ID);
}

function getAgoraCredentials() {
  const customerId = normalizeEnvValue(process.env.AGORA_CUSTOMER_ID);
  const customerSecret = normalizeEnvValue(process.env.AGORA_CUSTOMER_SECRET);
  return { customerId, customerSecret };
}

function noStoreJson(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function agoraRestRequest(method, url, body, customerId, customerSecret) {
  const credentials = Buffer.from(`${customerId}:${customerSecret}`).toString("base64");
  const response = await fetch(url, {
    method,
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

export async function POST(request) {
  try {
    const authenticatedUser = await authenticateFirebaseUserFromRequest(request);
    if (!authenticatedUser?.uid) return unauthorizedJson();

    const body = await request.json().catch(() => ({}));
    const streamId = String(body?.streamId || "").trim();
    const action = String(body?.action || "").trim();
    const rtmpUrl = String(body?.rtmpUrl || "").trim();

    if (!streamId) return noStoreJson({ error: "missing_stream_id" }, 400);
    if (!["start", "stop"].includes(action)) return noStoreJson({ error: "invalid_action" }, 400);

    const appId = getAgoraAppId();
    const { customerId, customerSecret } = getAgoraCredentials();
    if (!appId || !customerId || !customerSecret) {
      return noStoreJson({ error: "agora_rtmp_config_missing" }, 503);
    }

    const stream = await getDocumentAsAdmin(`liveStreams/${streamId}`);
    if (!stream?.channelName) return noStoreJson({ error: "stream_not_found" }, 404);
    if (stream.hostId !== authenticatedUser.uid) return unauthorizedJson({ error: "not_stream_host" });

    if (action === "start") {
      if (!rtmpUrl || !rtmpUrl.startsWith("rtmp")) {
        return noStoreJson({ error: "invalid_rtmp_url" }, 400);
      }

      const res = await agoraRestRequest(
        "POST",
        `https://api.agora.io/v1/projects/${appId}/rtmp-converters`,
        {
          converter: {
            name: `yt_${streamId.slice(0, 12)}`,
            transcodeOptions: { rtcChannel: stream.channelName, videoOptions: { fps: 24, bitrate: 1500 } },
            rtmpUrl,
          },
        },
        customerId,
        customerSecret
      );

      if (!res.ok) {
        return noStoreJson({ error: "rtmp_push_start_failed", detail: res.data }, 502);
      }

      const taskId = res.data?.converter?.id || res.data?.id || "";
      await patchDocumentAsAdmin(`liveStreams/${streamId}`, {
        agoraRtmpTaskId: taskId,
        youtubePushUrl: rtmpUrl,
        updatedAt: new Date(),
      });

      return noStoreJson({ ok: true, taskId });
    }

    if (action === "stop") {
      const taskId = String(stream.agoraRtmpTaskId || "").trim();
      if (taskId) {
        await agoraRestRequest(
          "DELETE",
          `https://api.agora.io/v1/projects/${appId}/rtmp-converters/${taskId}`,
          null,
          customerId,
          customerSecret
        );
      }
      await patchDocumentAsAdmin(`liveStreams/${streamId}`, {
        agoraRtmpTaskId: null,
        youtubePushUrl: null,
        updatedAt: new Date(),
      });
      return noStoreJson({ ok: true });
    }
  } catch (error) {
    console.error("Agora live-push error:", error);
    return noStoreJson({ error: "agora_live_push_error" }, 500);
  }
}
