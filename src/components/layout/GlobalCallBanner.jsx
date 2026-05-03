"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  subscribeToUserConversationCalls,
  acceptConversationCall,
  declineConversationCall,
  endConversationCall,
} from "@/lib/firestore";
import { Phone, PhoneOff } from "lucide-react";
import AgoraAudioCallDialog from "@/components/messages/AgoraAudioCallDialog";

function buildCallLabels(language) {
  const ht = language === "ht";
  return {
    callTitle: ht ? "Apèl vwa" : "Appel vocal",
    callBadge: ht ? "Apèl" : "Appel",
    callConnecting: ht ? "Ap konekte..." : "Connexion...",
    callWaiting: ht ? "Ap tann..." : "En attente...",
    callWaitingDescription: ht ? "Ap tann repons la..." : "En attente de réponse...",
    incomingCall: ht ? "Apèl k ap antre" : "Appel entrant",
    callParticipantConnected: ht ? "Konekte" : "Connecté",
    callConnected: ht ? "Apèl an kou" : "Appel en cours",
    callConnectionError: ht ? "Erè koneksyon" : "Erreur de connexion",
    callConfigMissingError: ht ? "Konfigirasyon manke" : "Configuration manquante",
    callSdkMissingError: ht ? "SDK manke" : "SDK manquant",
    callAuthRequiredError: ht ? "Otantifikasyon obligatwa" : "Authentification requise",
    callUnknownParticipant: ht ? "Manm enkoni" : "Membre inconnu",
    callMute: ht ? "Souf mikwo" : "Couper le micro",
    callUnmute: ht ? "Aktive mikwo" : "Activer le micro",
    callEnd: ht ? "Fini apèl" : "Terminer",
    callClose: ht ? "Fèmen" : "Fermer",
  };
}

export default function GlobalCallBanner() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const pathname = usePathname();
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCallSession, setActiveCallSession] = useState(null);
  const [actionLoading, setActionLoading] = useState("");

  useEffect(() => {
    if (!user?.uid) {
      setIncomingCall(null);
      return;
    }

    const unsub = subscribeToUserConversationCalls(
      user.uid,
      (calls) => {
        const ringing = calls.find(
          (c) => c.status === "ringing" && c.calleeId === user.uid
        ) || null;
        setIncomingCall(ringing);

        if (activeCallSession) {
          const stillActive = calls.find(
            (c) => c.conversationId === activeCallSession.conversationId && ["ringing", "active"].includes(c.status)
          );
          if (!stillActive) {
            setActiveCallSession(null);
          }
        }
      },
      () => {}
    );

    return () => unsub?.();
  }, [user?.uid, activeCallSession]);

  const labels = buildCallLabels(language);

  async function handleAccept() {
    if (!user?.uid || !incomingCall) return;
    setActionLoading("accept");
    try {
      await acceptConversationCall(incomingCall.conversationId, user.uid);
      setActiveCallSession({ ...incomingCall, status: "active" });
      setIncomingCall(null);
    } catch (err) {
      console.error("Accept call error:", err);
    } finally {
      setActionLoading("");
    }
  }

  async function handleDecline() {
    if (!user?.uid || !incomingCall) return;
    setActionLoading("decline");
    try {
      await declineConversationCall(incomingCall.conversationId, user.uid);
      setIncomingCall(null);
    } catch (err) {
      console.error("Decline call error:", err);
    } finally {
      setActionLoading("");
    }
  }

  async function handleEndActiveCall() {
    if (!user?.uid || !activeCallSession) return;
    try {
      await endConversationCall(activeCallSession.conversationId, user.uid);
    } catch (err) {
      console.error("End call error:", err);
    } finally {
      setActiveCallSession(null);
    }
  }

  if (activeCallSession) {
    return (
      <AgoraAudioCallDialog
        open
        callSession={activeCallSession}
        currentUserId={user?.uid || ""}
        remoteParticipantName={activeCallSession.callerName || (language === "ht" ? "Yon manm" : "Un membre")}
        labels={labels}
        onClose={() => setActiveCallSession(null)}
        onEndCall={handleEndActiveCall}
        onConnectionError={handleEndActiveCall}
      />
    );
  }

  if (!incomingCall || pathname === "/messages") return null;

  const callerName = incomingCall.callerName || (language === "ht" ? "Yon manm" : "Un membre");

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-4 rounded-[2rem] border border-white/20 bg-slate-900/95 px-5 py-3 shadow-2xl backdrop-blur-md">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/20">
        <Phone className="h-5 w-5 text-green-400 animate-pulse" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{language === "ht" ? "Apèl k ap antre" : "Appel entrant"}</p>
        <p className="truncate font-semibold text-white">{callerName}</p>
      </div>
      <div className="flex gap-2 ml-2">
        <button
          type="button"
          disabled={!!actionLoading}
          onClick={handleAccept}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          aria-label={language === "ht" ? "Reponn" : "Répondre"}
        >
          <Phone className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={!!actionLoading}
          onClick={handleDecline}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-700 text-white hover:bg-rose-800 disabled:opacity-50"
          aria-label={language === "ht" ? "Refize" : "Refuser"}
        >
          <PhoneOff className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
