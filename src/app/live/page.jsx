"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  createLiveStream,
  endLiveStream,
  deleteLiveStream,
  getEndedLiveStreams,
  createPost,
  hidePost,
  subscribeToActiveLiveStreams,
  subscribeToLiveStream,
  subscribeLiveMessages,
  sendLiveMessage,
  incrementLiveViewerCount,
  updateLiveStream,
} from "@/lib/firestore";
import { resolveUserDisplayName } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Radio, Video, VideoOff, Mic, MicOff, Users, Youtube, X, AlertCircle, Send } from "lucide-react";

async function fetchAgoraLiveToken(streamId, role, idToken) {
  const res = await fetch("/api/agora/live-token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ streamId, role }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "token_error");
  }
  return res.json();
}

async function callLivePush(streamId, action, rtmpUrl, idToken) {
  const res = await fetch("/api/agora/live-push", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ streamId, action, rtmpUrl }),
  });
  return res.json();
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
      Live
    </span>
  );
}

export default function LivePage() {
  const { user, userProfile, isAdmin, canManageDoctorContent } = useAuth();
  const { t, language } = useLanguage();

  const [activeStreams, setActiveStreams] = useState([]);
  const [watchingStreamId, setWatchingStreamId] = useState(null);
  const [watchingStream, setWatchingStream] = useState(null);

  const [isHosting, setIsHosting] = useState(false);
  const [hostStreamId, setHostStreamId] = useState(null);
  const [liveTitle, setLiveTitle] = useState("");
  const [hostLoading, setHostLoading] = useState(false);
  const [hostError, setHostError] = useState("");

  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);

  const [rtmpUrl, setRtmpUrl] = useState("");
  const [rtmpActive, setRtmpActive] = useState(false);
  const [rtmpLoading, setRtmpLoading] = useState(false);
  const [showRtmpPanel, setShowRtmpPanel] = useState(false);
  const [publishToFeed, setPublishToFeed] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [endedStreams, setEndedStreams] = useState([]);
  const [recordingUrlInput, setRecordingUrlInput] = useState("");
  const [savingRecordingId, setSavingRecordingId] = useState("");
  const [endedLoading, setEndedLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const [agoraClient, setAgoraClient] = useState(null);
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [agoraError, setAgoraError] = useState("");

  const [liveMessages, setLiveMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState([]);

  const hostVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});
  const chatEndRef = useRef(null);

  const agoraClientRef = useRef(null);

  // Load ended streams when history panel opens
  useEffect(() => {
    if (!showHistory || !canManageDoctorContent) return;
    setEndedLoading(true);
    getEndedLiveStreams(20)
      .then(setEndedStreams)
      .catch(() => {})
      .finally(() => setEndedLoading(false));
  }, [showHistory, canManageDoctorContent]);

  async function handleDeleteEnded(streamId) {
    setDeletingId(streamId);
    try {
      await deleteLiveStream(streamId);
      setEndedStreams((prev) => prev.filter((s) => s.id !== streamId));
    } catch (err) {
      console.error("Delete ended stream error:", err);
    } finally {
      setDeletingId("");
    }
  }

  // ── Force-end or delete a stuck active stream (from lobby) ────
  async function handleForceEndStream(streamId) {
    setDeletingId(streamId);
    try {
      await endLiveStream(streamId);
    } catch (err) {
      console.error("Force end error:", err);
    } finally {
      setDeletingId("");
    }
  }

  async function handleForceDeleteStream(streamId) {
    setDeletingId(streamId);
    try {
      await deleteLiveStream(streamId);
    } catch (err) {
      console.error("Force delete error:", err);
    } finally {
      setDeletingId("");
    }
  }

  // ── Save YouTube recording URL ─────────────────────────────────
  async function handleSaveRecordingUrl(streamId, url) {
    setSavingRecordingId(streamId);
    try {
      await updateLiveStream(streamId, { recordingUrl: url.trim() });
      setEndedStreams((prev) =>
        prev.map((s) => s.id === streamId ? { ...s, recordingUrl: url.trim() } : s)
      );
      setRecordingUrlInput("");
    } catch (err) {
      console.error("Save recording URL error:", err);
    } finally {
      setSavingRecordingId("");
    }
  }

  // ── Live chat subscribe ────────────────────────────────────────
  const activeChatId = watchingStreamId || (isHosting ? hostStreamId : null);
  useEffect(() => {
    if (!activeChatId) { setLiveMessages([]); return; }
    const unsub = subscribeLiveMessages(activeChatId, setLiveMessages, () => {});
    return () => unsub?.();
  }, [activeChatId]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveMessages]);

  // ── Send chat message ──────────────────────────────────────────
  async function handleSendMessage(e) {
    e?.preventDefault();
    if (!chatInput.trim() || !user?.uid || !activeChatId) return;
    setChatSending(true);
    const name = resolveUserDisplayName(userProfile, user, "Membre");
    try {
      await sendLiveMessage(activeChatId, { authorId: user.uid, authorName: name, text: chatInput.trim() });
      setChatInput("");
    } catch (err) {
      console.error("Chat send error:", err);
    } finally {
      setChatSending(false);
    }
  }

  // ── Send emoji reaction ────────────────────────────────────────
  async function handleSendReaction(emoji) {
    if (!user?.uid || !activeChatId) return;
    const name = resolveUserDisplayName(userProfile, user, "Membre");
    sendLiveMessage(activeChatId, { authorId: user.uid, authorName: name, emoji }).catch(() => {});
    const id = Date.now() + Math.random();
    const left = 10 + Math.random() * 80;
    setFloatingReactions((prev) => [...prev, { id, emoji, left }]);
    setTimeout(() => setFloatingReactions((prev) => prev.filter((r) => r.id !== id)), 2500);
  }

  // ── Hide a feed post linked to a live ─────────────────────────
  async function handleHideLiveFeedPosts(stream) {
    setDeletingId(stream.id);
    try {
      if (stream.feedStartPostId) await hidePost(stream.feedStartPostId).catch(() => {});
      if (stream.feedEndPostId) await hidePost(stream.feedEndPostId).catch(() => {});
      setEndedStreams((prev) =>
        prev.map((s) => s.id === stream.id ? { ...s, feedStartPostId: null, feedEndPostId: null } : s)
      );
    } catch (err) {
      console.error("Hide feed post error:", err);
    } finally {
      setDeletingId("");
    }
  }

  // Subscribe to active live streams
  useEffect(() => {
    const unsub = subscribeToActiveLiveStreams(
      (streams) => setActiveStreams(streams),
      () => {}
    );
    return () => unsub?.();
  }, []);

  // Subscribe to current watching stream
  useEffect(() => {
    if (!watchingStreamId) { setWatchingStream(null); return; }
    const unsub = subscribeToLiveStream(
      watchingStreamId,
      (s) => {
        setWatchingStream(s);
        if (s.status === "ended") handleLeaveStream();
      },
      () => {}
    );
    return () => unsub?.();
  }, [watchingStreamId]);

  // ── Agora init helper ──────────────────────────────────────────
  async function initAgoraClient() {
    const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
    const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
    agoraClientRef.current = client;
    setAgoraClient(client);
    return { AgoraRTC, client };
  }

  // ── Start live (host) ──────────────────────────────────────────
  async function handleStartLive() {
    if (!user?.uid) return;
    const title = liveTitle.trim();
    if (!title) { setHostError(language === "ht" ? "Mete yon tit." : "Veuillez saisir un titre."); return; }
    setHostLoading(true);
    setHostError("");
    try {
      const hostName = resolveUserDisplayName(userProfile, user, "Animatrice");
      const { id: streamId, channelName } = await createLiveStream(user.uid, hostName, title);
      setHostStreamId(streamId);

      const idToken = await user.getIdToken();
      const tokenData = await fetchAgoraLiveToken(streamId, "host", idToken);

      const { AgoraRTC, client } = await initAgoraClient();
      await client.setClientRole("host");
      await client.join(tokenData.appId, tokenData.channel, tokenData.token, user.uid);

      const camTrack = await AgoraRTC.createCameraVideoTrack();
      const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
      await client.publish([camTrack, micTrack]);

      setLocalVideoTrack(camTrack);
      setLocalAudioTrack(micTrack);
      setIsHosting(true);

      if (hostVideoRef.current) camTrack.play(hostVideoRef.current);

      // Notifier les membres par email (fire and forget)
      user.getIdToken().then((idToken) => {
        fetch("/api/live-notify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ streamId }),
        }).catch(() => {});
      }).catch(() => {});

      // Post dans le feed (si activé)
      if (publishToFeed) {
        const photo = userProfile?.photoURL || userProfile?.avatarUrl || "";
        const body = language === "ht"
          ? `🔴 ${hostName} k ap fè yon live kounye a : « ${title} ». Ale sou /live pou wè l !`
          : `🔴 ${hostName} est en live maintenant : « ${title} ». Rendez-vous sur /live pour regarder !`;
        const startPost = await createPost({
          title: `🔴 Live en cours : ${title}`,
          body,
          tag: "live",
          authorId: user.uid,
          authorName: hostName,
          authorPhoto: photo,
        }).catch(() => null);
        if (startPost?.id) await updateLiveStream(streamId, { feedStartPostId: startPost.id }).catch(() => {});
      }
    } catch (err) {
      console.error("Live start error:", err);
      setHostError(err?.message || "error");
    } finally {
      setHostLoading(false);
    }
  }

  // ── Cancel + delete live (host) ───────────────────────────────
  async function handleCancelLive() {
    setHostLoading(true);
    try {
      if (rtmpActive && hostStreamId) {
        const idToken = await user.getIdToken();
        await callLivePush(hostStreamId, "stop", "", idToken).catch(() => {});
        setRtmpActive(false);
      }
      localVideoTrack?.stop(); localVideoTrack?.close();
      localAudioTrack?.stop(); localAudioTrack?.close();
      await agoraClientRef.current?.leave().catch(() => {});
      if (hostStreamId) await deleteLiveStream(hostStreamId);
      setIsHosting(false);
      setHostStreamId(null);
      setLocalVideoTrack(null);
      setLocalAudioTrack(null);
      setRemoteUsers([]);
      setShowCancelConfirm(false);
    } catch (err) {
      console.error("Live cancel error:", err);
    } finally {
      setHostLoading(false);
    }
  }

  // ── End live (host) ────────────────────────────────────────────
  async function handleEndLive() {
    setHostLoading(true);
    try {
      if (rtmpActive && hostStreamId) {
        const idToken = await user.getIdToken();
        await callLivePush(hostStreamId, "stop", "", idToken);
        setRtmpActive(false);
      }
      localVideoTrack?.stop(); localVideoTrack?.close();
      localAudioTrack?.stop(); localAudioTrack?.close();
      await agoraClientRef.current?.leave();
      if (hostStreamId) await endLiveStream(hostStreamId);

      // Auto-post fin de live (si activé)
      if (publishToFeed) {
        const hostName2 = resolveUserDisplayName(userProfile, user, "Animatrice");
        const photo2 = userProfile?.photoURL || userProfile?.avatarUrl || "";
        const bodyFR = `📹 Session live « ${liveTitle} » terminée. Merci à toutes les participantes !`;
        const endPost = await createPost({
          title: liveTitle,
          body: bodyFR,
          tag: "live",
          authorId: user.uid,
          authorName: hostName2,
          authorPhoto: photo2,
        }).catch(() => null);
        if (hostStreamId && endPost?.id) await updateLiveStream(hostStreamId, { feedEndPostId: endPost.id }).catch(() => {});
      }

      setIsHosting(false);
      setHostStreamId(null);
      setLocalVideoTrack(null);
      setLocalAudioTrack(null);
      setRemoteUsers([]);
    } catch (err) {
      console.error("Live end error:", err);
    } finally {
      setHostLoading(false);
    }
  }

  // ── Toggle camera ──────────────────────────────────────────────
  async function handleToggleCamera() {
    if (!localVideoTrack) return;
    const next = !cameraEnabled;
    await localVideoTrack.setEnabled(next);
    setCameraEnabled(next);
  }

  // ── Toggle mic ─────────────────────────────────────────────────
  async function handleToggleMic() {
    if (!localAudioTrack) return;
    const next = !micEnabled;
    await localAudioTrack.setEnabled(next);
    setMicEnabled(next);
  }

  // ── Join live (audience) ───────────────────────────────────────
  const handleJoinStream = useCallback(async (stream) => {
    if (!user?.uid) return;
    setAgoraError("");
    try {
      setWatchingStreamId(stream.id);
      await incrementLiveViewerCount(stream.id, 1);

      const idToken = await user.getIdToken();
      const tokenData = await fetchAgoraLiveToken(stream.id, "audience", idToken);

      const { AgoraRTC, client } = await initAgoraClient();
      await client.setClientRole("audience", { level: 1 });

      client.on("user-published", async (remoteUser, mediaType) => {
        await client.subscribe(remoteUser, mediaType);
        if (mediaType === "video") {
          setRemoteUsers((prev) => {
            if (prev.find((u) => u.uid === remoteUser.uid)) return prev;
            return [...prev, remoteUser];
          });
          setTimeout(() => {
            const el = remoteVideoRefs.current[remoteUser.uid];
            if (el) remoteUser.videoTrack?.play(el);
          }, 300);
        }
        if (mediaType === "audio") remoteUser.audioTrack?.play();
      });

      client.on("user-unpublished", (remoteUser) => {
        setRemoteUsers((prev) => prev.filter((u) => u.uid !== remoteUser.uid));
      });

      await client.join(tokenData.appId, tokenData.channel, tokenData.token, user.uid);

      // Subscribe to users already publishing before we joined
      for (const remoteUser of client.remoteUsers) {
        for (const mediaType of ["video", "audio"]) {
          if ((mediaType === "video" && remoteUser.hasVideo) || (mediaType === "audio" && remoteUser.hasAudio)) {
            await client.subscribe(remoteUser, mediaType).catch(() => {});
            if (mediaType === "video") {
              setRemoteUsers((prev) => prev.find((u) => u.uid === remoteUser.uid) ? prev : [...prev, remoteUser]);
              setTimeout(() => {
                const el = remoteVideoRefs.current[remoteUser.uid];
                if (el) remoteUser.videoTrack?.play(el);
              }, 300);
            }
            if (mediaType === "audio") remoteUser.audioTrack?.play();
          }
        }
      }
    } catch (err) {
      console.error("Join stream error:", err);
      setAgoraError(err?.message || "error");
      setWatchingStreamId(null);
    }
  }, [user]);

  // ── Leave stream (audience) ─────────────────────────────────────
  const handleLeaveStream = useCallback(async () => {
    try {
      if (watchingStreamId) await incrementLiveViewerCount(watchingStreamId, -1).catch(() => {});
      await agoraClientRef.current?.leave();
    } catch {}
    setWatchingStreamId(null);
    setWatchingStream(null);
    setRemoteUsers([]);
  }, [watchingStreamId]);

  // ── YouTube RTMP push ───────────────────────────────────────────
  async function handleRtmpToggle() {
    if (!hostStreamId || !user) return;
    setRtmpLoading(true);
    try {
      const idToken = await user.getIdToken();
      if (!rtmpActive) {
        if (!rtmpUrl.trim().startsWith("rtmp")) {
          setRtmpLoading(false);
          return;
        }
        const res = await callLivePush(hostStreamId, "start", rtmpUrl.trim(), idToken);
        if (res?.ok) {
          setRtmpActive(true);
          await updateLiveStream(hostStreamId, { youtubePushUrl: rtmpUrl.trim() });
        }
      } else {
        await callLivePush(hostStreamId, "stop", "", idToken);
        setRtmpActive(false);
      }
    } catch (err) {
      console.error("RTMP push error:", err);
    } finally {
      setRtmpLoading(false);
    }
  }

  // Play local video when track+ref ready
  useEffect(() => {
    if (localVideoTrack && hostVideoRef.current && isHosting) {
      localVideoTrack.play(hostVideoRef.current);
    }
  }, [localVideoTrack, isHosting]);

  // Play remote videos when remote users change
  useEffect(() => {
    remoteUsers.forEach((ru) => {
      const el = remoteVideoRefs.current[ru.uid];
      if (el && ru.videoTrack) ru.videoTrack.play(el);
    });
  }, [remoteUsers]);

  // ── Render ─────────────────────────────────────────────────────
  const isWatching = !!watchingStreamId;

  return (
    <main className="relative min-h-full bg-[linear-gradient(180deg,_#0f172a_0%,_#1e1b4b_40%,_#0f172a_100%)]">
      {/* Header */}
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/20">
            <Radio className="h-5 w-5 text-rose-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{t("liveTitle")}</h1>
            <p className="text-sm text-slate-400">{t("liveDesc")}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-16">
        {isWatching ? (
          /* ── Watching view ───────────────────────────────────── */
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <LiveBadge />
                <span className="font-semibold text-white">{watchingStream?.title || "Live"}</span>
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Users className="h-3.5 w-3.5" />
                  {watchingStream?.viewerCount || 0} {t("liveWatching")}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl border-white/20 text-white hover:bg-white/10"
                onClick={handleLeaveStream}
              >
                <X className="mr-2 h-4 w-4" />
                {language === "ht" ? "Kite live a" : "Quitter le live"}
              </Button>
            </div>

            {agoraError ? (
              <div className="flex items-start gap-3 rounded-2xl border border-rose-800 bg-rose-900/30 px-4 py-3 text-sm text-rose-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {agoraError}
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-3">
              {/* Video area */}
              <div className="lg:col-span-2 space-y-3">
                {remoteUsers.length === 0 ? (
                  <div className="flex aspect-video items-center justify-center rounded-[1.5rem] border border-white/10 bg-slate-900/60 text-slate-500">
                    <div className="text-center">
                      <Video className="mx-auto mb-2 h-10 w-10 opacity-30" />
                      <p className="text-sm">{t("liveConnecting")}</p>
                    </div>
                  </div>
                ) : (
                  remoteUsers.map((ru) => (
                    <div
                      key={ru.uid}
                      ref={(el) => { remoteVideoRefs.current[ru.uid] = el; }}
                      className="aspect-video overflow-hidden rounded-[1.5rem] bg-slate-900"
                    />
                  ))
                )}
                {/* Emoji quick reactions */}
                <div className="flex gap-2 flex-wrap">
                  {["❤️","🔥","👏","😍","🙌","😂","💪","🌸"].map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => handleSendReaction(em)}
                      className="text-xl hover:scale-125 transition-transform select-none"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
              {/* Live chat */}
              <LiveChatPanel
                messages={liveMessages}
                chatInput={chatInput}
                setChatInput={setChatInput}
                onSend={handleSendMessage}
                sending={chatSending}
                currentUid={user?.uid}
                floatingReactions={floatingReactions}
                language={language}
                chatEndRef={chatEndRef}
              />
            </div>
          </div>
        ) : isHosting ? (
          /* ── Host view ───────────────────────────────────────── */
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <LiveBadge />
              <span className="font-semibold text-white">{liveTitle}</span>
              {rtmpActive ? (
                <Badge className="gap-1.5 rounded-full bg-red-900/60 text-red-300 border-red-800">
                  <Youtube className="h-3 w-3" />
                  {t("liveYouTubePushActive")}
                </Badge>
              ) : null}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-3">
            <div className="overflow-hidden rounded-[1.5rem] bg-slate-900 aspect-video">
                  <div ref={hostVideoRef} className="h-full w-full" />
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                className={`rounded-2xl border-white/20 ${cameraEnabled ? "text-white hover:bg-white/10" : "bg-rose-900/40 text-rose-400 border-rose-800"}`}
                onClick={handleToggleCamera}
              >
                {cameraEnabled ? <Video className="mr-2 h-4 w-4" /> : <VideoOff className="mr-2 h-4 w-4" />}
                {cameraEnabled ? t("liveCamera") : t("liveCameraOff")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className={`rounded-2xl border-white/20 ${micEnabled ? "text-white hover:bg-white/10" : "bg-rose-900/40 text-rose-400 border-rose-800"}`}
                onClick={handleToggleMic}
              >
                {micEnabled ? <Mic className="mr-2 h-4 w-4" /> : <MicOff className="mr-2 h-4 w-4" />}
                {micEnabled ? t("liveMic") : t("liveMicOff")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl border-yellow-700 text-yellow-400 hover:bg-yellow-900/20"
                onClick={() => setShowRtmpPanel((v) => !v)}
              >
                <Youtube className="mr-2 h-4 w-4" />
                {t("liveYouTubePush")}
              </Button>
              <Button
                type="button"
                className="rounded-2xl bg-rose-600 text-white hover:bg-rose-700"
                disabled={hostLoading}
                onClick={handleEndLive}
              >
                {hostLoading ? t("liveEnding") : t("liveEnd")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl border-red-800 text-red-400 hover:bg-red-900/20"
                disabled={hostLoading}
                onClick={() => setShowCancelConfirm(true)}
              >
                <X className="mr-2 h-4 w-4" />
                {language === "ht" ? "Anile live a" : "Annuler le live"}
              </Button>
            </div>

            {/* Cancel confirmation */}
            {showCancelConfirm ? (
              <div className="rounded-[1.5rem] border border-red-800/50 bg-red-950/40 p-5 max-w-md space-y-3">
                <p className="text-sm font-semibold text-red-300">
                  {language === "ht" ? "Anile ak efase live a?" : "Annuler et supprimer ce live ?"}
                </p>
                <p className="text-xs text-slate-400">
                  {language === "ht"
                    ? "Live a ap efase konplètman. Aksyon sa a pa ka defèt."
                    : "Le live sera supprimé définitivement. Cette action est irréversible."}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    className="rounded-2xl bg-red-700 text-white hover:bg-red-800"
                    disabled={hostLoading}
                    onClick={handleCancelLive}
                  >
                    {hostLoading ? "..." : language === "ht" ? "Wi, efase" : "Oui, supprimer"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl border-white/20 text-white hover:bg-white/10"
                    onClick={() => setShowCancelConfirm(false)}
                  >
                    {language === "ht" ? "Non" : "Non"}
                  </Button>
                </div>
              </div>
            ) : null}

            {/* YouTube RTMP panel */}
            {showRtmpPanel ? (
              <div className="rounded-[1.5rem] border border-yellow-800/40 bg-yellow-900/10 p-4 space-y-3 max-w-lg">
                <p className="text-xs text-yellow-300/80">{t("liveRtmpHelp")}</p>
                <div className="flex gap-2">
                  <Input
                    value={rtmpUrl}
                    onChange={(e) => setRtmpUrl(e.target.value)}
                    placeholder="rtmp://a.rtmp.youtube.com/live2/xxxx-xxxx"
                    disabled={rtmpActive}
                    className="rounded-2xl border-white/20 bg-white/10 text-white placeholder:text-slate-500 focus:border-yellow-500"
                  />
                  <Button
                    type="button"
                    className={`shrink-0 rounded-2xl ${rtmpActive ? "bg-slate-700 text-slate-300" : "bg-yellow-600 text-white hover:bg-yellow-700"}`}
                    disabled={rtmpLoading}
                    onClick={handleRtmpToggle}
                  >
                    {rtmpActive ? t("liveYouTubePushStop") : t("liveYouTubePushStart")}
                  </Button>
                </div>
              </div>
            ) : null}
              </div>{/* end lg:col-span-2 */}
              <LiveChatPanel
                messages={liveMessages}
                chatInput={chatInput}
                setChatInput={setChatInput}
                onSend={handleSendMessage}
                sending={chatSending}
                currentUid={user?.uid}
                floatingReactions={floatingReactions}
                language={language}
                chatEndRef={chatEndRef}
              />
            </div>{/* end grid */}
          </div>
        ) : (
          /* ── Main lobby ──────────────────────────────────────── */
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {agoraError ? (
              <div className="lg:col-span-3 flex items-start gap-3 rounded-[1.5rem] border border-rose-800/50 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{agoraError}</span>
                <button type="button" className="ml-auto text-slate-400 hover:text-white" onClick={() => setAgoraError("")}><X className="h-4 w-4" /></button>
              </div>
            ) : null}
            {/* Active lives list */}
            <div className="lg:col-span-2 space-y-4">
              {activeStreams.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-[2rem] border border-white/10 bg-white/5 px-6 py-16 text-center">
                  <Radio className="mb-4 h-12 w-12 text-slate-600" />
                  <p className="text-slate-400">{t("liveNoActive")}</p>
                </div>
              ) : (
                activeStreams.map((stream) => (
                  <div
                    key={stream.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-[1.75rem] border border-white/10 bg-white/5 px-5 py-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <LiveBadge />
                        <span className="font-semibold text-white truncate">{stream.title}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                        <span>{stream.hostName}</span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {stream.viewerCount || 0} {t("liveWatching")}
                        </span>
                        {stream.youtubePushUrl ? (
                          <span className="flex items-center gap-1 text-red-400">
                            <Youtube className="h-3 w-3" />
                            YouTube
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {stream.hostId === user?.uid ? (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          className="rounded-2xl bg-rose-600 text-white hover:bg-rose-700 text-sm"
                          disabled={deletingId === stream.id}
                          onClick={() => handleForceEndStream(stream.id)}
                        >
                          {deletingId === stream.id ? "..." : t("liveEnd")}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-2xl border-red-800 text-red-400 hover:bg-red-950/30 text-sm"
                          disabled={deletingId === stream.id}
                          onClick={() => handleForceDeleteStream(stream.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        className="rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 text-white hover:opacity-90"
                        onClick={() => handleJoinStream(stream)}
                      >
                        {t("liveJoin")}
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Ended lives history (admins/doctors only) */}
            {canManageDoctorContent ? (
              <div className="lg:col-span-2">
                <button
                  type="button"
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-3"
                  onClick={() => setShowHistory((v) => !v)}
                >
                  <span>{showHistory ? "▾" : "▸"}</span>
                  {language === "ht" ? "Lives fini yo" : "Lives terminés"}
                  {endedStreams.length > 0 && showHistory ? (
                    <span className="ml-1 rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">{endedStreams.length}</span>
                  ) : null}
                </button>
                {showHistory ? (
                  <div className="space-y-2">
                    {endedLoading ? (
                      <p className="text-xs text-slate-500 px-1">{language === "ht" ? "K ap chaje..." : "Chargement..."}</p>
                    ) : endedStreams.length === 0 ? (
                      <p className="text-xs text-slate-500 px-1">{language === "ht" ? "Pa gen live fini." : "Aucun live terminé."}</p>
                    ) : (
                      endedStreams.map((stream) => (
                        <div
                          key={stream.id}
                          className="rounded-[1.5rem] border border-white/5 bg-white/[0.03] px-4 py-3 space-y-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium text-slate-300 truncate text-sm">{stream.title}</p>
                              <p className="text-xs text-slate-500">
                                {stream.hostName}
                                {stream.endedAt?.toDate
                                  ? ` · ${stream.endedAt.toDate().toLocaleDateString(language === "ht" ? "fr-HT" : "fr-FR")}`
                                  : ""}
                              </p>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              {(stream.feedStartPostId || stream.feedEndPostId) ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="rounded-2xl border-amber-800 text-amber-400 hover:bg-amber-950/30 text-xs h-8 px-3"
                                  disabled={deletingId === stream.id}
                                  onClick={() => handleHideLiveFeedPosts(stream)}
                                >
                                  {language === "ht" ? "Kache nan feed" : "Masquer du feed"}
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-2xl border-red-900 text-red-400 hover:bg-red-950/40 text-xs h-8 px-3"
                                disabled={deletingId === stream.id}
                                onClick={() => handleDeleteEnded(stream.id)}
                              >
                                <X className="mr-1 h-3 w-3" />
                                {deletingId === stream.id ? "..." : language === "ht" ? "Efase" : "Supprimer"}
                              </Button>
                            </div>
                          </div>
                          {/* Recording URL */}
                          {stream.recordingUrl ? (
                            <a
                              href={stream.recordingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-rose-400 hover:underline"
                            >
                              <Youtube className="h-3 w-3" />
                              {language === "ht" ? "Gade anrejistreman" : "Voir l'enregistrement"}
                            </a>
                          ) : (
                            <div className="flex gap-2 max-w-sm">
                              <Input
                                value={savingRecordingId === stream.id ? recordingUrlInput : ""}
                                onChange={(e) => { setSavingRecordingId(stream.id); setRecordingUrlInput(e.target.value); }}
                                placeholder={language === "ht" ? "URL YouTube anrejistreman..." : "URL YouTube de l'enregistrement..."}
                                className="rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-600 text-xs h-8"
                              />
                              <Button
                                type="button"
                                className="rounded-2xl bg-rose-700 text-white text-xs h-8 px-3 hover:bg-rose-800 shrink-0"
                                disabled={savingRecordingId !== stream.id || !recordingUrlInput.trim()}
                                onClick={() => handleSaveRecordingUrl(stream.id, recordingUrlInput)}
                              >
                                {language === "ht" ? "Anrejistre" : "Enregistrer"}
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Admin: start live panel */}
            {canManageDoctorContent ? (
              <div>
                <Card className="rounded-[2rem] border-white/10 bg-white/5 text-white">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Radio className="h-4 w-4 text-rose-400" />
                      {t("liveStart")}
                    </CardTitle>
                    <CardDescription className="text-slate-400 text-xs">
                      {t("liveHostOnly")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      value={liveTitle}
                      onChange={(e) => { setLiveTitle(e.target.value); setHostError(""); }}
                      placeholder={t("liveTitlePlaceholder")}
                      className="rounded-2xl border-white/20 bg-white/10 text-white placeholder:text-slate-500 focus:border-rose-500"
                    />
                    {hostError ? (
                      <p className="text-xs text-rose-400">{hostError}</p>
                    ) : null}
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={publishToFeed}
                        onChange={(e) => setPublishToFeed(e.target.checked)}
                        className="accent-rose-500"
                      />
                      {language === "ht" ? "Pibliye nan feed la" : "Publier dans le feed"}
                    </label>
                    <Button
                      type="button"
                      className="w-full rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 text-white hover:opacity-90"
                      disabled={hostLoading || !liveTitle.trim()}
                      onClick={handleStartLive}
                    >
                      {hostLoading ? t("liveStarting") : t("liveStart")}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}

function LiveChatPanel({ messages, chatInput, setChatInput, onSend, sending, currentUid, floatingReactions, language, chatEndRef }) {
  return (
    <div className="relative flex flex-col rounded-[1.5rem] border border-white/10 bg-white/5 overflow-hidden" style={{ height: "420px" }}>
      {/* Floating emoji reactions */}
      {floatingReactions.map((r) => (
        <span
          key={r.id}
          className="pointer-events-none absolute bottom-14 text-2xl animate-bounce select-none"
          style={{ left: `${r.left}%`, animation: "floatUp 2.4s ease-out forwards" }}
        >
          {r.emoji}
        </span>
      ))}

      {/* Header */}
      <div className="shrink-0 px-4 py-2 border-b border-white/10 text-xs font-semibold text-slate-400 uppercase tracking-wide">
        {language === "ht" ? "Mesaj live" : "Chat live"}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scroll-smooth">
        {messages.length === 0 ? (
          <p className="text-center text-xs text-slate-600 mt-6">
            {language === "ht" ? "Pa gen mesaj. Ekri premye a!" : "Aucun message. Soyez le premier !"}
          </p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2 text-sm ${msg.authorId === currentUid ? "flex-row-reverse" : ""}`}>
              {msg.type === "reaction" ? (
                <span className="text-xl self-center">{msg.emoji}</span>
              ) : (
                <div className={`max-w-[85%] rounded-2xl px-3 py-1.5 ${msg.authorId === currentUid ? "bg-rose-700/60 text-white" : "bg-white/10 text-slate-200"}`}>
                  {msg.authorId !== currentUid && (
                    <span className="block text-[10px] font-semibold text-rose-300 mb-0.5">{msg.authorName}</span>
                  )}
                  <span>{msg.text}</span>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={onSend} className="shrink-0 flex gap-2 border-t border-white/10 px-3 py-2">
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder={language === "ht" ? "Ekri yon mesaj..." : "Écrire un message..."}
          maxLength={200}
          className="flex-1 rounded-2xl bg-white/10 border border-white/10 text-white text-sm px-3 py-1.5 placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
        />
        <button
          type="submit"
          disabled={sending || !chatInput.trim()}
          className="shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>

      <style>{`
        @keyframes floatUp {
          0%   { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-120px) scale(1.5); }
        }
      `}</style>
    </div>
  );
}
