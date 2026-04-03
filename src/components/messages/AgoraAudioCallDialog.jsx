"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getFirebaseAuth } from "@/lib/firebase";
import { Loader2, Mic, MicOff, Phone, PhoneOff, Volume2 } from "lucide-react";

 let agoraRtcModulePromise = null;

 async function loadAgoraRtcSdk() {
   if (typeof window === "undefined") {
     return null;
   }

   if (!agoraRtcModulePromise) {
     agoraRtcModulePromise = import("agora-rtc-sdk-ng").catch((error) => {
       agoraRtcModulePromise = null;
       throw error;
     });
   }

   const sdkModule = await agoraRtcModulePromise;
   return sdkModule?.default || sdkModule;
 }

async function getCurrentFirebaseIdToken() {
  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser;
  if (!currentUser || typeof currentUser.getIdToken !== "function") {
    return "";
  }

  try {
    return String(await currentUser.getIdToken()).trim();
  } catch (error) {
    console.error("Error resolving Firebase ID token for Agora:", error);
    return "";
  }
}

 function resolveCallErrorCode(error) {
   return String(error?.message || error || "").trim().toLowerCase();
 }

 function getClientAgoraAppId() {
   return String(process.env.NEXT_PUBLIC_AGORA_APP_ID || "").trim();
 }

 function resolveCallErrorMessage(errorCode, labels) {
   if (errorCode === "agora_config_missing") {
     return labels?.callConfigMissingError || labels?.callConnectionError || "Impossible de connecter l'appel.";
   }

   if (errorCode === "agora_sdk_missing" || errorCode === "agora_sdk_unavailable") {
     return labels?.callSdkMissingError || labels?.callConnectionError || "Impossible de connecter l'appel.";
   }

   if (errorCode === "auth_required") {
     return labels?.callAuthRequiredError || labels?.callConnectionError || "Impossible de connecter l'appel.";
   }

   return labels?.callConnectionError || "Impossible de connecter l'appel.";
 }

export default function AgoraAudioCallDialog({
  open,
  callSession,
  currentUserId,
  remoteParticipantName,
  labels,
  onClose,
  onEndCall,
  onConnectionError,
}) {
  const clientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const mountedRef = useRef(false);
  const latestLabelsRef = useRef(labels);
  const latestOnConnectionErrorRef = useRef(onConnectionError);
  const [connectionState, setConnectionState] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    latestLabelsRef.current = labels;
    latestOnConnectionErrorRef.current = onConnectionError;
  }, [labels, onConnectionError]);

  useEffect(() => {
    let cancelled = false;

    async function cleanupClient() {
      const localAudioTrack = localAudioTrackRef.current;
      localAudioTrackRef.current = null;
      if (localAudioTrack) {
        try {
          localAudioTrack.stop();
          localAudioTrack.close();
        } catch (error) {
          console.error("Error cleaning local Agora audio track:", error);
        }
      }

      const client = clientRef.current;
      clientRef.current = null;
      if (client) {
        try {
          client.removeAllListeners();
          await client.leave();
        } catch (error) {
          console.error("Error leaving Agora call:", error);
        }
      }
    }

    async function abortIfCancelled() {
      if (!cancelled) {
        return false;
      }

      await cleanupClient();
      return true;
    }

    async function joinCall() {
      if (!open || !callSession?.conversationId || !currentUserId) {
        return;
      }

      await cleanupClient();
      setConnectionState("connecting");
      setErrorMessage("");
      setRemoteConnected(false);
      setIsMuted(false);

      try {
        if (!getClientAgoraAppId()) {
          throw new Error("agora_config_missing");
        }

        const idToken = await getCurrentFirebaseIdToken();
        if (!idToken) {
          throw new Error("auth_required");
        }

        const tokenResponse = await fetch("/api/agora/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ conversationId: callSession.conversationId }),
        });
        const tokenPayload = await tokenResponse.json().catch(() => ({}));

        if (await abortIfCancelled()) {
          return;
        }

        if (!tokenResponse.ok || !tokenPayload?.appId || !tokenPayload?.token || !tokenPayload?.channel) {
          throw new Error(tokenPayload?.error || "token_request_failed");
        }

        const AgoraRTC = await loadAgoraRtcSdk();
        if (await abortIfCancelled()) {
          return;
        }

        if (!AgoraRTC?.createClient || !AgoraRTC?.createMicrophoneAudioTrack) {
          throw new Error("agora_sdk_unavailable");
        }

        const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        clientRef.current = client;

        client.on("user-published", async (remoteUser, mediaType) => {
          await client.subscribe(remoteUser, mediaType);
          if (mediaType === "audio") {
            remoteUser.audioTrack?.play();
            if (!cancelled && mountedRef.current) {
              setRemoteConnected(true);
            }
          }
        });

        client.on("user-unpublished", (remoteUser, mediaType) => {
          if (mediaType === "audio") {
            remoteUser.audioTrack?.stop();
            if (!cancelled && mountedRef.current) {
              setRemoteConnected(false);
            }
          }
        });

        client.on("user-left", () => {
          if (!cancelled && mountedRef.current) {
            setRemoteConnected(false);
          }
        });

        const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        localAudioTrackRef.current = localAudioTrack;

        if (await abortIfCancelled()) {
          return;
        }

        await client.join(tokenPayload.appId, tokenPayload.channel, tokenPayload.token, tokenPayload.uid || currentUserId);

        if (await abortIfCancelled()) {
          return;
        }

        await client.publish([localAudioTrack]);

        if (!cancelled && mountedRef.current) {
          setConnectionState("connected");
        }
      } catch (error) {
        const errorCode = resolveCallErrorCode(error);
        if (!["agora_config_missing", "agora_sdk_missing", "agora_sdk_unavailable", "auth_required", "uid_conflict", "operation_aborted"].includes(errorCode)) {
          console.error("Error joining Agora call:", error);
        }

        if (!cancelled && mountedRef.current) {
          setConnectionState("error");
          setErrorMessage(resolveCallErrorMessage(errorCode, latestLabelsRef.current));
        }
        await cleanupClient();

        if (!cancelled && mountedRef.current && typeof latestOnConnectionErrorRef.current === "function") {
          latestOnConnectionErrorRef.current(errorCode);
        }
      }
    }

    if (open) {
      joinCall();
    }

    return () => {
      cancelled = true;
      cleanupClient();
    };
  }, [callSession?.conversationId, currentUserId, open]);

  async function handleToggleMute() {
    const localAudioTrack = localAudioTrackRef.current;
    if (!localAudioTrack) {
      return;
    }

    const nextMuted = !isMuted;
    try {
      await localAudioTrack.setEnabled(!nextMuted);
      setIsMuted(nextMuted);
    } catch (error) {
      console.error("Error toggling Agora microphone:", error);
      setErrorMessage(labels?.callConnectionError || "Impossible de connecter l'appel.");
    }
  }

  if (!open || !callSession?.conversationId) {
    return null;
  }

  const isOutgoingCall = String(callSession.callerId || "") === String(currentUserId || "");
  const statusLabel = errorMessage
    ? labels?.callConnectionError
    : connectionState === "connecting"
      ? labels?.callConnecting
      : callSession.status === "ringing"
        ? (isOutgoingCall ? labels?.callWaiting : labels?.incomingCall)
        : remoteConnected
          ? labels?.callParticipantConnected
          : labels?.callConnected;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/60 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(247,242,247,0.98)_100%)] shadow-[0_32px_90px_-32px_rgba(15,23,42,0.45)]">
        <div className="bg-[linear-gradient(90deg,_#9B2335_0%,_#7B1A2C_100%)] px-6 py-4 text-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-rose-100">{labels?.callTitle}</p>
              <h3 className="mt-1 text-lg font-semibold">{remoteParticipantName || labels?.callUnknownParticipant}</h3>
            </div>
            <Badge variant="secondary" className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-white">
              {labels?.callBadge}
            </Badge>
          </div>
        </div>

        <div className="space-y-5 p-6">
          <div className="flex items-center justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[radial-gradient(circle,_rgba(155,35,53,0.18)_0%,_rgba(155,35,53,0.08)_55%,_transparent_70%)] text-[#9B2335]">
              {connectionState === "connecting" ? (
                <Loader2 className="h-10 w-10 animate-spin" />
              ) : errorMessage ? (
                <PhoneOff className="h-10 w-10" />
              ) : remoteConnected ? (
                <Volume2 className="h-10 w-10" />
              ) : (
                <Phone className="h-10 w-10" />
              )}
            </div>
          </div>

          <div className="space-y-2 text-center">
            <p className="text-base font-medium text-slate-900">{statusLabel}</p>
            {callSession.status === "ringing" && isOutgoingCall ? (
              <p className="text-sm text-slate-500">{labels?.callWaitingDescription}</p>
            ) : null}
            {errorMessage ? (
              <p className="text-sm text-rose-600">{errorMessage}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-2xl border-[#eadbe8] bg-white/95"
              onClick={handleToggleMute}
              disabled={connectionState !== "connected"}
            >
              {isMuted ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
              {isMuted ? labels?.callUnmute : labels?.callMute}
            </Button>
            <Button
              type="button"
              className="h-12 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600"
              onClick={onEndCall}
            >
              <PhoneOff className="mr-2 h-4 w-4" />
              {labels?.callEnd}
            </Button>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              className="text-sm font-medium text-slate-500 transition hover:text-slate-700"
              onClick={onClose}
            >
              {labels?.callClose}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
