"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  sendMessage, 
  markMessagesAsRead,
  markMessagesAsDelivered,
  setConversationTypingState,
  createConversation,
  getUserConversations,
  getUserConversationCalls,
  getDiscoverableUsersPage,
  subscribeToUserConversationRequests,
  subscribeToUserConversations,
  subscribeToConversationMessages,
  subscribeToConversationCall,
  subscribeToUserConversationCalls,
  acceptConversationRequest,
  acceptConversationCall,
  declineConversationRequest,
  declineConversationCall,
  blockUser,
  endConversationCall,
  unblockUser,
  reportUser,
  hideConversationForUser,
  muteConversationForUser,
  startConversationCall,
  subscribeToBlockedUsers,
  subscribeToUserConversationSafetySettings,
 } from "@/lib/firestore";
 import { Card, CardContent } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
 import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
 import ActionDialog from "@/components/ui/action-dialog";
 import AgoraAudioCallDialog from "@/components/messages/AgoraAudioCallDialog";
 import VoiceRecorder from "@/components/messages/VoiceRecorder";
 import ImageShare from "@/components/messages/ImageShare";
 import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
 import { getFirebaseStorage } from "@/lib/firebase";
 import {
  MessageCircle,
  Send,
  ArrowLeft,
  ShoppingBag,
  User,
  Smile,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Phone,
  Search,
  MoreHorizontal,
 } from "lucide-react";
 import { getInitials } from "@/lib/utils";

const ONLINE_PRESENCE_TTL_MS = 75 * 1000;
const TYPING_STATUS_TTL_MS = 4000;
const MESSAGES_BOOTSTRAP_TIMEOUT_MS = 12000;
const MESSAGES_LISTENER_RETRY_LIMIT = 5;
const DIRECTORY_PAGE_SIZE = 36;
const EMOJI_OPTIONS = [
  "😊",
  "😂",
  "😍",
  "🥰",
  "😘",
  "🙏",
  "❤️",
  "💕",
  "🌸",
  "✨",
  "🎉",
  "🤱",
  "👶",
  "🍼",
  "😴",
  "😅",
  "🤗",
  "💪",
  "🙌",
  "👍",
  "🔥",
  "🥹",
  "🤍",
  "🤎",
  "💙",
  "💜",
  "😁",
  "😉",
  "😇",
  "🤔",
  "😌",
  "👏",
  "🎈",
  "🌺",
  "🌞",
  "🌈",
  "💐",
  "🫶",
  "🌟",
];

function normalizeSearchTerm(value) {
  return String(value || "").trim().toLowerCase();
}

function matchesSearchTerm(searchTerm, values = []) {
  if (!searchTerm) {
    return true;
  }

  return values
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.trim().toLowerCase())
    .some((value) => value.includes(searchTerm));
}

function isRetryableMessageListenerError(error) {
  const code = String(error?.code || "").trim().toLowerCase();
  const message = String(error?.message || "").trim().toLowerCase();

  return code === "permission-denied"
    || code === "firestore/permission-denied"
    || code === "unavailable"
    || code === "firestore/unavailable"
    || code === "failed-precondition"
    || code === "firestore/failed-precondition"
    || message.includes("insufficient permissions")
    || message.includes("client is offline")
    || message.includes("network");
}

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const discoveryUi = language === "ht"
    ? {
        requestsTitle: "Demann mesaj",
        discussionsTitle: "Diskisyon",
        noRequests: "Pa gen demann pou kounye a",
        incoming: "Resevwa",
        outgoing: "Voye",
        accept: "Aksepte",
        decline: "Refize",
        membersTitle: "Moun",
        memberListEmpty: "Pa gen lòt moun pou kounye a",
        online: "Anliy",
        offline: "Pa anliy",
        lastSeen: "Dènye prezans",
        openConversation: "Louvri diskisyon an",
        requestConversation: "Voye yon mesaj",
        pending: "An atant",
        requestCreated: "Diskisyon an pare.",
        requestPending: "Gen deja yon demann mesaj an atant pou moun sa a.",
        requestError: "Nou pa t ka louvri diskisyon an.",
        requestAccepted: "Diskisyon an pare.",
        requestDeclined: "Demann nan refize.",
        onlineNow: "anliy kounye a",
        typingNow: "Ap ekri kounye a...",
        optionalMessageEmpty: "Pa gen mesaj ajoute pou kounye a.",
        dialogSuccessTitle: "Aksyon reyisi",
        dialogInfoTitle: "Mesaj",
        dialogErrorTitle: "Gen yon pwoblèm",
        sentStatus: "Voye",
        deliveredStatus: "Livre",
        seenStatus: "Li",
        sendMessageError: "Nou pa t ka voye mesaj la.",
        imageUploadError: "Nou pa t ka voye imaj yo.",
        audioUploadError: "Nou pa t ka voye mesaj vokal la.",
        audioPermissionError: "Nou pa ka jwenn mikwo a. Verifye pèmisyon yo.",
        imageLimitError: "Ou ka voye jiska 5 imaj an menm tan.",
        imageTypeError: "Se sèlman fichye imaj yo aksepte.",
        imageSizeError: "Chak imaj dwe pi piti pase 5 MB.",
        blocked: "Bloke",
        unblock: "Debloke",
        reportUser: "Siyale",
        muteConversation: "Mete an sourdine",
        unmuteConversation: "Retire sourdine",
        hideConversation: "Kache",
        restoreConversation: "Reparèt",
        blockedBadge: "Bloke",
        mutedBadge: "An sourdine",
        hiddenBadge: "Kache",
        interactionBlocked: "Entèraksyon sa a bloke ant de kont sa yo.",
        messagingRestricted: "Kont sa a gen restriksyon sou mesaj kounye a.",
        requestRateLimited: "Tanpri tann yon ti moman anvan ou voye yon lòt demann konvèsasyon.",
        messageRateLimited: "Ou ap voye mesaj twò vit. Tann yon ti moman.",
        duplicateMessage: "Menm mesaj la deja voye dènyèman.",
        conversationMuted: "Konvèsasyon an mete an sourdine.",
        conversationUnmuted: "Konvèsasyon an pa an sourdine ankò.",
        conversationHidden: "Konvèsasyon an kache nan lis la.",
        conversationRestored: "Konvèsasyon an reparèt nan lis la.",
        userReported: "Siyalman an voye bay ekip modération an.",
        userBlocked: "Itilizatè a bloke.",
        userUnblocked: "Itilizatè a debloke.",
        blockAction: "Bloke",
        blockConfirm: "Èske ou vle bloke itilizatè sa a?",
        unblockConfirm: "Èske ou vle debloke itilizatè sa a?",
        reportPrompt: "Dekri pwoblèm nan oswa rezon siyalisyon an.",
        blockDialogTitle: "Bloke itilizatè sa a",
        unblockDialogTitle: "Debloke itilizatè sa a",
        reportDialogTitle: "Voye yon signalman",
        reportDialogMessage: "Bay kèk detay klè pou ekip modération an ka konprann sitiyasyon an byen vit.",
        blockedConversationNotice: "Ou bloke itilizatè sa a. Debloke li pou rekòmanse pale.",
        cannotSendBlocked: "Ou pa ka voye mesaj nan konvèsasyon sa a kounye a.",
        emojiPicker: "Emoji",
        emojiPickerTitle: "Ajoute yon emoji",
        searchPeoplePlaceholder: "Chèche yon moun, yon vil oswa yon peyi...",
        searchSidebarPlaceholder: "Chèche nan demann yo, diskisyon yo ak moun yo...",
        loadMorePeople: "Chaje plis moun",
        loadingPeople: "Ap chaje plis moun...",
        memberSearchEmpty: "Pa gen moun ki koresponn ak rechèch sa a pou kounye a.",
        searchNoResults: "Pa gen rezilta ki koresponn ak rechèch sa a pou kounye a.",
        filterAll: "Tout",
        manageConversation: "Jere diskisyon an",
        callAction: "Rele",
        callTitle: "Apèl odyo",
        callBadge: "Agora",
        callConnecting: "Ap konekte apèl la...",
        callWaiting: "Ap tann moun nan reponn...",
        callWaitingDescription: "Lòt moun nan kapab rantre nan apèl la dèske li aksepte li.",
        callConnected: "Ou konekte sou apèl la.",
        callParticipantConnected: "Lòt moun nan konekte sou apèl la.",
        callConnectionError: "Nou pa t ka konekte apèl la kounye a.",
        callConfigMissingError: "Apèl odyo yo poko konfigire sou aplikasyon an. Ajoute kle Agora yo pou aktive yo.",
        callSdkMissingError: "Modil apèl odyo a poko enstale sou pwojè a.",
        callAuthRequiredError: "Ou dwe konekte ankò pou itilize apèl odyo a.",
        callMute: "Fèmen mikwo",
        callUnmute: "Relimen mikwo",
        callEnd: "Fèmen",
        callClose: "Fèmen fenèt la",
        callUnknownParticipant: "Patisipan",
        incomingCall: "Apèl k ap antre",
        incomingCallTitle: "Apèl k ap antre",
        incomingCallMessage: "vle pale avè w kounye a.",
        callAccept: "Reponn",
        callDecline: "Refize",
        callEnded: "Apèl la fini.",
        callDeclined: "Apèl la refize.",
        callMissed: "Ou gen yon apèl manke.",
        callNoAnswer: "Apèl la pa jwenn repons.",
        loadError: "Nou pa t ka chaje mesaj yo kounye a.",
        loadTimeout: "Chajman mesaj yo pran twòp tan. Verifye koneksyon an epi eseye ankò.",
        conversationLoadError: "Nou pa t ka chaje konvèsasyon sa a kounye a.",
      }
    : {
        requestsTitle: "Demandes de message",
        discussionsTitle: "Discussions",
        noRequests: "Aucune demande pour le moment",
        incoming: "Reçue",
        outgoing: "Envoyée",
        accept: "Accepter",
        decline: "Refuser",
        membersTitle: "Personnes",
        memberListEmpty: "Aucune autre personne pour le moment",
        online: "En ligne",
        offline: "Hors ligne",
        lastSeen: "Dernière présence",
        openConversation: "Ouvrir la discussion",
        requestConversation: "Envoyer un message",
        pending: "En attente",
        requestCreated: "La discussion est prête.",
        requestPending: "Une demande de message est déjà en attente pour cette personne.",
        requestError: "Impossible d'ouvrir la discussion.",
        requestAccepted: "La discussion est prête.",
        requestDeclined: "La demande a été refusée.",
        onlineNow: "en ligne maintenant",
        typingNow: "Écrit en ce moment...",
        optionalMessageEmpty: "Aucun message ajouté pour le moment.",
        dialogSuccessTitle: "Action réussie",
        dialogInfoTitle: "Messages",
        dialogErrorTitle: "Un problème est survenu",
        sentStatus: "Envoyé",
        deliveredStatus: "Livré",
        seenStatus: "Vu",
        sendMessageError: "Impossible d'envoyer le message.",
        imageUploadError: "Impossible d'envoyer les images.",
        audioUploadError: "Impossible d'envoyer le message vocal.",
        audioPermissionError: "Impossible d'accéder au microphone. Vérifiez les permissions.",
        imageLimitError: "Vous pouvez envoyer jusqu'à 5 images à la fois.",
        imageTypeError: "Seuls les fichiers image sont acceptés.",
        imageSizeError: "Chaque image doit faire moins de 5 Mo.",
        blocked: "Bloqué",
        unblock: "Débloquer",
        reportUser: "Signaler",
        muteConversation: "Mettre en sourdine",
        unmuteConversation: "Retirer la sourdine",
        hideConversation: "Masquer",
        restoreConversation: "Réafficher",
        blockedBadge: "Bloqué",
        mutedBadge: "En sourdine",
        hiddenBadge: "Masquée",
        interactionBlocked: "Cette interaction est bloquée entre les deux comptes.",
        messagingRestricted: "Ce compte a actuellement une restriction de messagerie.",
        requestRateLimited: "Veuillez patienter un instant avant d'envoyer une nouvelle demande de message.",
        messageRateLimited: "Vous envoyez des messages trop rapidement. Patientez un instant.",
        duplicateMessage: "Le même message a déjà été envoyé récemment.",
        conversationMuted: "La conversation a été mise en sourdine.",
        conversationUnmuted: "La conversation n'est plus en sourdine.",
        conversationHidden: "La conversation a été masquée de votre liste.",
        conversationRestored: "La conversation est revenue dans votre liste.",
        userReported: "Le signalement a été transmis à l'équipe de modération.",
        userBlocked: "L'utilisateur a été bloqué.",
        userUnblocked: "L'utilisateur a été débloqué.",
        blockAction: "Bloquer",
        blockConfirm: "Voulez-vous bloquer cet utilisateur ?",
        unblockConfirm: "Voulez-vous débloquer cet utilisateur ?",
        reportPrompt: "Décrivez le problème ou la raison du signalement.",
        blockDialogTitle: "Bloquer cet utilisateur",
        unblockDialogTitle: "Débloquer cet utilisateur",
        reportDialogTitle: "Envoyer un signalement",
        reportDialogMessage: "Ajoutez quelques détails pour aider l'équipe de modération à comprendre rapidement la situation.",
        blockedConversationNotice: "Vous avez bloqué cet utilisateur. Débloquez-le pour reprendre la conversation.",
        cannotSendBlocked: "Vous ne pouvez pas envoyer de message dans cette conversation pour le moment.",
        emojiPicker: "Emojis",
        emojiPickerTitle: "Ajouter un emoji",
        searchPeoplePlaceholder: "Rechercher une personne, une ville ou un pays...",
        searchSidebarPlaceholder: "Rechercher dans les demandes, discussions et personnes...",
        loadMorePeople: "Charger plus de personnes",
        loadingPeople: "Chargement de plus de personnes...",
        memberSearchEmpty: "Aucune personne ne correspond à cette recherche pour le moment.",
        searchNoResults: "Aucun résultat ne correspond à cette recherche pour le moment.",
        filterAll: "Tout",
        manageConversation: "Gérer la discussion",
        callAction: "Appeler",
        callTitle: "Appel audio",
        callBadge: "Agora",
        callConnecting: "Connexion de l'appel...",
        callWaiting: "En attente de réponse...",
        callWaitingDescription: "La personne pourra rejoindre l'appel dès qu'elle l'acceptera.",
        callConnected: "Vous êtes connecté à l'appel.",
        callParticipantConnected: "La personne a rejoint l'appel.",
        callConnectionError: "Impossible de connecter l'appel pour le moment.",
        callConfigMissingError: "Les appels audio ne sont pas encore configurés dans l'application. Ajoutez les clés Agora pour les activer.",
        callSdkMissingError: "Le module d'appel audio n'est pas encore installé sur le projet.",
        callAuthRequiredError: "Reconnectez-vous pour utiliser l'appel audio.",
        callMute: "Couper le micro",
        callUnmute: "Réactiver le micro",
        callEnd: "Terminer",
        callClose: "Fermer",
        callUnknownParticipant: "Participant",
        incomingCall: "Appel entrant",
        incomingCallTitle: "Appel entrant",
        incomingCallMessage: "souhaite vous parler maintenant.",
        callAccept: "Répondre",
        callDecline: "Refuser",
        callEnded: "L'appel est terminé.",
        callDeclined: "L'appel a été refusé.",
        callMissed: "Vous avez un appel manqué.",
        callNoAnswer: "L'appel est resté sans réponse.",
        loadError: "Les messages n'ont pas pu être chargés pour le moment.",
        loadTimeout: "Le chargement des messages a dépassé le délai prévu. Vérifiez la connexion puis réessayez.",
        conversationLoadError: "Cette conversation n'a pas pu être chargée pour le moment.",
      };
  const [conversations, setConversations] = useState([]);
  const [members, setMembers] = useState([]);
  const [conversationRequests, setConversationRequests] = useState([]);
  const [blockedUserIds, setBlockedUserIds] = useState([]);
  const [conversationSafetySettings, setConversationSafetySettings] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [conversationLoadError, setConversationLoadError] = useState("");
  const [requestActionId, setRequestActionId] = useState("");
  const [requestingMemberId, setRequestingMemberId] = useState("");
  const [safetyActionLoading, setSafetyActionLoading] = useState("");
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState("");
  const [activeSidebarFilter, setActiveSidebarFilter] = useState("all");
  const [memberDirectoryCursor, setMemberDirectoryCursor] = useState(null);
  const [hasMoreDirectoryMembers, setHasMoreDirectoryMembers] = useState(false);
  const [loadingMoreDirectoryMembers, setLoadingMoreDirectoryMembers] = useState(false);
  const [conversationActionsOpen, setConversationActionsOpen] = useState(false);
  const [conversationCalls, setConversationCalls] = useState([]);
  const [currentCallSession, setCurrentCallSession] = useState(null);
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [callActionLoading, setCallActionLoading] = useState("");
  const messagesEndRef = useRef(null);
  const conversationActionsRef = useRef(null);
  const [showImageShare, setShowImageShare] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [clearAudio, setClearAudio] = useState(false);
  const [requestedConversationId, setRequestedConversationId] = useState("");
  const [requestedMemberId, setRequestedMemberId] = useState("");
  const [presenceNow, setPresenceNow] = useState(() => Date.now());
  const [composerFeedback, setComposerFeedback] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [listenerBootstrapRevision, setListenerBootstrapRevision] = useState(0);
  const handledMissedCallKeysRef = useRef(new Set());
  const sessionStartMsRef = useRef(Date.now());
  const listenerRetryCountRef = useRef(0);
  const listenerRetryTimeoutRef = useRef(null);
  const [requestDialog, setRequestDialog] = useState({
    open: false,
    title: "",
    message: "",
    tone: "success",
  });
  const [safetyDialog, setSafetyDialog] = useState({
    open: false,
    mode: "block",
    targetUserId: "",
    conversationId: "",
    currentlyBlocked: false,
    details: "",
  });
  const typingTimeoutRef = useRef(null);
  const activeTypingConversationIdRef = useRef("");
  const publishedTypingStateRef = useRef({ conversationId: "", isTyping: false });

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setRequestedConversationId(params.get("conversationId") || "");
    setRequestedMemberId(params.get("memberId") || "");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const intervalId = window.setInterval(() => {
      setPresenceNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setLoading(false);
      setLoadError("");
      return;
    }

    setLoading(true);
    setLoadError("");
    let bootstrapResolved = false;
    const bootstrapTimeoutId = typeof window !== "undefined"
      ? window.setTimeout(() => {
          if (bootstrapResolved) {
            return;
          }

          setLoading(false);
          setLoadError(discoveryUi.loadTimeout);
        }, MESSAGES_BOOTSTRAP_TIMEOUT_MS)
      : null;
    let retryScheduled = false;

    const clearBootstrapTimeout = () => {
      if (bootstrapTimeoutId && typeof window !== "undefined") {
        window.clearTimeout(bootstrapTimeoutId);
      }
    };

    const settleBootstrap = () => {
      if (bootstrapResolved) {
        return;
      }

      bootstrapResolved = true;
      clearBootstrapTimeout();
      setLoading(false);
    };

    const clearListenerRetryTimeout = () => {
      if (listenerRetryTimeoutRef.current && typeof window !== "undefined") {
        window.clearTimeout(listenerRetryTimeoutRef.current);
        listenerRetryTimeoutRef.current = null;
      }
    };

    const resetListenerRetryState = () => {
      listenerRetryCountRef.current = 0;
      clearListenerRetryTimeout();
    };

    const scheduleListenerRetry = (error) => {
      if (
        retryScheduled
        || !isRetryableMessageListenerError(error)
        || listenerRetryCountRef.current >= MESSAGES_LISTENER_RETRY_LIMIT
        || typeof window === "undefined"
      ) {
        return false;
      }

      retryScheduled = true;
      listenerRetryCountRef.current += 1;
      console.warn("Retrying messages listeners after transient Firestore error:", {
        code: String(error?.code || "").trim(),
        message: String(error?.message || "").trim(),
        attempt: listenerRetryCountRef.current,
        limit: MESSAGES_LISTENER_RETRY_LIMIT,
      });
      clearBootstrapTimeout();
      clearListenerRetryTimeout();
      setLoadError("");
      setLoading(true);
      listenerRetryTimeoutRef.current = window.setTimeout(() => {
        listenerRetryTimeoutRef.current = null;
        setListenerBootstrapRevision((currentValue) => currentValue + 1);
      }, 900 * listenerRetryCountRef.current);
      return true;
    };

    let isActive = true;
    let unsubscribeConversations = () => {};
    let unsubscribeRequests = () => {};
    let unsubscribeBlockedUsers = () => {};
    let unsubscribeConversationSafety = () => {};
    let unsubscribeConversationCalls = () => {};

    const loadConversationsFallback = async () => {
      try {
        const nextConversations = await getUserConversations(user.uid);
        if (!isActive) {
          return true;
        }

        resetListenerRetryState();
        setLoadError("");
        setConversations(Array.isArray(nextConversations) ? nextConversations.filter(Boolean) : []);
        settleBootstrap();
        return true;
      } catch (error) {
        if (!isActive) {
          return false;
        }

        console.error("Error loading conversations fallback:", error);
        setLoadError(discoveryUi.loadError);
        settleBootstrap();
        return false;
      }
    };

    const loadConversationCallsFallback = async () => {
      try {
        const nextCalls = await getUserConversationCalls(user.uid);
        if (!isActive) {
          return true;
        }

        resetListenerRetryState();
        setConversationCalls(Array.isArray(nextCalls) ? nextCalls : []);
        return true;
      } catch (error) {
        if (!isActive) {
          return false;
        }

        console.error("Error loading conversation calls fallback:", error);
        return false;
      }
    };

    const startListeners = async () => {
      try {
        if (typeof user?.getIdToken === "function") {
          await user.getIdToken();
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (scheduleListenerRetry(error)) {
          return;
        }

        console.error("Error preparing messages auth token:", error);
        const loadedFallback = await loadConversationsFallback();
        if (loadedFallback) {
          await loadConversationCallsFallback();
          return;
        }
        return;
      }

      if (!isActive) {
        return;
      }

      unsubscribeConversations = subscribeToUserConversations(
        user.uid,
        (nextConversations) => {
          resetListenerRetryState();
          setLoadError("");
          setConversations(nextConversations);
          settleBootstrap();
        },
        (error) => {
          if (scheduleListenerRetry(error)) {
            return;
          }

          console.error("Error subscribing to conversations:", error);
          void loadConversationsFallback();
        }
      );

      getDiscoverableUsersPage({
        excludeUserId: user.uid,
        limitCount: DIRECTORY_PAGE_SIZE,
      })
        .then((directoryPage) => {
          if (!isActive) {
            return;
          }

          setMembers(Array.isArray(directoryPage?.users) ? directoryPage.users : []);
          setMemberDirectoryCursor(directoryPage?.nextCursor || null);
          setHasMoreDirectoryMembers(Boolean(directoryPage?.hasMore));
        })
        .catch((error) => {
          console.error("Error loading member directory:", error);
          if (!isActive) {
            return;
          }
        });

      unsubscribeRequests = subscribeToUserConversationRequests(
        user.uid,
        (nextRequests) => {
          setConversationRequests(nextRequests);
        },
        (error) => {
          console.error("Error subscribing to conversation requests:", error);
        }
      );

      unsubscribeBlockedUsers = subscribeToBlockedUsers(
        user.uid,
        (nextBlockedUserIds) => {
          setBlockedUserIds(nextBlockedUserIds);
        },
        (error) => {
          console.error("Error subscribing to blocked users:", error);
        }
      );

      unsubscribeConversationSafety = subscribeToUserConversationSafetySettings(
        user.uid,
        (nextSettings) => {
          setConversationSafetySettings(nextSettings);
        },
        (error) => {
          console.error("Error subscribing to conversation safety settings:", error);
        }
      );

      unsubscribeConversationCalls = subscribeToUserConversationCalls(
        user.uid,
        (nextCalls) => {
          resetListenerRetryState();
          setConversationCalls(nextCalls);
        },
        (error) => {
          if (scheduleListenerRetry(error)) {
            return;
          }

          console.error("Error subscribing to conversation calls:", error);
          void loadConversationCallsFallback();
        }
      );
    };

    startListeners();

    return () => {
      isActive = false;
      clearBootstrapTimeout();
      clearListenerRetryTimeout();
      unsubscribeConversations();
      unsubscribeRequests();
      unsubscribeBlockedUsers();
      unsubscribeConversationSafety();
      unsubscribeConversationCalls();
    };
  }, [authLoading, discoveryUi.loadError, discoveryUi.loadTimeout, listenerBootstrapRevision, user]);

  useEffect(() => {
    setConversationActionsOpen(false);
  }, [selectedConversation?.id]);

  useEffect(() => {
    if (!requestedConversationId || !user?.uid) {
      return;
    }

    const requestedConversation = conversations.find((conversation) => conversation.id === requestedConversationId);

    if (!requestedConversation) {
      return;
    }

    hideConversationForUser(user.uid, requestedConversation.id, false).catch(() => {});
    setSelectedConversation((currentConversation) => (
      currentConversation?.id === requestedConversation.id ? currentConversation : requestedConversation
    ));

    if (typeof window !== "undefined") {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete("conversationId");
      window.history.replaceState({}, "", nextUrl.toString());
    }

    setRequestedConversationId("");
  }, [conversations, requestedConversationId, user?.uid]);

  useEffect(() => {
    if (!requestedMemberId || !user?.uid || loading) {
      return;
    }

    const existing = conversations.find((conversation) =>
      Array.isArray(conversation?.participants)
      && conversation.participants.includes(requestedMemberId)
      && conversation.participants.includes(user.uid)
      && conversation.participants.length === 2
    );

    if (existing) {
      hideConversationForUser(user.uid, existing.id, false).catch(() => {});
      setSelectedConversation((current) => current?.id === existing.id ? current : existing);
      setRequestedMemberId("");
      if (typeof window !== "undefined") {
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.delete("memberId");
        window.history.replaceState({}, "", nextUrl.toString());
      }
    } else if (conversations.length > 0 || !loading) {
      createConversation([user.uid, requestedMemberId])
        .then((conversationId) => {
          setRequestedConversationId(conversationId);
        })
        .catch((err) => {
          console.error("Error creating conversation from memberId:", err);
        })
        .finally(() => {
          setRequestedMemberId("");
          if (typeof window !== "undefined") {
            const nextUrl = new URL(window.location.href);
            nextUrl.searchParams.delete("memberId");
            window.history.replaceState({}, "", nextUrl.toString());
          }
        });
    }
  }, [conversations, requestedMemberId, user?.uid, loading]);

  useEffect(() => {
    if (!currentCallSession?.conversationId) {
      return;
    }

    return subscribeToConversationCall(
      currentCallSession.conversationId,
      (nextCall) => {
        if (!nextCall) {
          setCurrentCallSession(null);
          setCallDialogOpen(false);
          openRequestDialog({
            tone: "info",
            title: discoveryUi.dialogInfoTitle,
            message: discoveryUi.callEnded,
          });
          return;
        }

        if (["declined", "ended", "missed"].includes(nextCall.status)) {
          setCurrentCallSession(null);
          setCallDialogOpen(false);
          if (nextCall.status === "missed") {
            const callKey = `${nextCall.conversationId}:${getTimestampMillis(nextCall.missedAt || nextCall.updatedAt)}`;
            handledMissedCallKeysRef.current.add(callKey);
          }
          openRequestDialog({
            tone: "info",
            title: discoveryUi.dialogInfoTitle,
            message: nextCall.status === "declined"
              ? discoveryUi.callDeclined
              : nextCall.status === "missed"
                ? (nextCall.calleeId === user?.uid ? discoveryUi.callMissed : discoveryUi.callNoAnswer)
                : discoveryUi.callEnded,
          });
          return;
        }

        setCurrentCallSession(nextCall);
      },
      (error) => {
        console.error("Error subscribing to current conversation call:", error);
      }
    );
  }, [currentCallSession?.conversationId, discoveryUi.callDeclined, discoveryUi.callEnded, discoveryUi.callMissed, discoveryUi.callNoAnswer, discoveryUi.dialogInfoTitle, user?.uid]);

  useEffect(() => {
    handledMissedCallKeysRef.current = new Set();
    sessionStartMsRef.current = Date.now();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    const missedCalls = conversationCalls.filter((call) => call.status === "missed");

    missedCalls.forEach((call) => {
      const callKey = `${call.conversationId}:${getTimestampMillis(call.missedAt || call.updatedAt)}`;
      if (handledMissedCallKeysRef.current.has(callKey)) {
        return;
      }
      handledMissedCallKeysRef.current.add(callKey);
      const callMs = getTimestampMillis(call.missedAt || call.updatedAt);
      if (callMs <= sessionStartMsRef.current) {
        return;
      }
      openRequestDialog({
        tone: "info",
        title: discoveryUi.dialogInfoTitle,
        message: call.calleeId === user.uid ? discoveryUi.callMissed : discoveryUi.callNoAnswer,
      });
    });
  }, [conversationCalls, discoveryUi.callMissed, discoveryUi.callNoAnswer, discoveryUi.dialogInfoTitle, user?.uid]);

  useEffect(() => {
    if (typeof window === "undefined" || !conversationActionsOpen) {
      return;
    }

    function handleClickOutside(event) {
      if (!conversationActionsRef.current?.contains(event.target)) {
        setConversationActionsOpen(false);
      }
    }

    window.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [conversationActionsOpen]);

  async function handleLoadMoreDirectoryMembers() {
    if (!user?.uid || loadingMoreDirectoryMembers || !hasMoreDirectoryMembers || !memberDirectoryCursor) {
      return;
    }

    setLoadingMoreDirectoryMembers(true);
    try {
      const nextDirectoryPage = await getDiscoverableUsersPage({
        excludeUserId: user.uid,
        limitCount: DIRECTORY_PAGE_SIZE,
        cursor: memberDirectoryCursor,
      });

      setMembers((currentMembers) => {
        const existingIds = new Set(currentMembers.map((member) => member.id));
        const nextUniqueMembers = (nextDirectoryPage?.users || []).filter((member) => !existingIds.has(member.id));
        return [...currentMembers, ...nextUniqueMembers];
      });
      setMemberDirectoryCursor(nextDirectoryPage?.nextCursor || null);
      setHasMoreDirectoryMembers(Boolean(nextDirectoryPage?.hasMore));
    } catch (error) {
      console.error("Error loading more directory members:", error);
      setLoadError((previous) => previous || discoveryUi.loadError);
    } finally {
      setLoadingMoreDirectoryMembers(false);
    }
  }

  useEffect(() => {
    if (!selectedConversation?.id || !user) {
      setMessages([]);
      setShowEmojiPicker(false);
      setConversationLoadError("");
      return;
    }

    setConversationLoadError("");
    const unsubscribeMessages = subscribeToConversationMessages(
      selectedConversation.id,
      (nextMessages) => {
        setMessages(nextMessages);

        const hasUndeliveredIncomingMessage = nextMessages.some(
          (message) => message.senderId !== user.uid && !message.deliveredAt
        );

        if (hasUndeliveredIncomingMessage) {
          markMessagesAsDelivered(selectedConversation.id, user.uid).catch((error) => {
            console.error("Error marking messages as delivered:", error);
          });
        }

        const hasUnreadIncomingMessage = nextMessages.some(
          (message) => message.senderId !== user.uid && !message.read
        );

        if (hasUnreadIncomingMessage) {
          markMessagesAsRead(selectedConversation.id, user.uid).catch((error) => {
            console.error("Error marking messages as read:", error);
          });
        }
      },
      (error) => {
        console.error("Error subscribing to messages:", error);
        setConversationLoadError(discoveryUi.conversationLoadError);
      }
    );

    return () => {
      unsubscribeMessages();
    };
  }, [discoveryUi.conversationLoadError, selectedConversation?.id, user]);

  useEffect(() => {
    if (selectedConversation?.id) {
      const nextConversationId = selectedConversation.id;
      const previousConversationId = activeTypingConversationIdRef.current;

      if (previousConversationId && previousConversationId !== nextConversationId && user?.uid) {
        setConversationTypingState(previousConversationId, user.uid, false).catch(() => {});
        publishedTypingStateRef.current = { conversationId: previousConversationId, isTyping: false };
      }

      activeTypingConversationIdRef.current = nextConversationId;
    }
  }, [selectedConversation?.id, user]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!user?.uid || !selectedConversation?.id) {
      return;
    }

    const hasText = Boolean(newMessage.trim());

    if (!hasText) {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      if (
        publishedTypingStateRef.current.conversationId === selectedConversation.id
        && publishedTypingStateRef.current.isTyping
      ) {
        publishedTypingStateRef.current = { conversationId: selectedConversation.id, isTyping: false };
        setConversationTypingState(selectedConversation.id, user.uid, false).catch(() => {});
      }

      return;
    }

    if (
      publishedTypingStateRef.current.conversationId !== selectedConversation.id
      || !publishedTypingStateRef.current.isTyping
    ) {
      publishedTypingStateRef.current = { conversationId: selectedConversation.id, isTyping: true };
      setConversationTypingState(selectedConversation.id, user.uid, true).catch(() => {});
    }

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      publishedTypingStateRef.current = { conversationId: selectedConversation.id, isTyping: false };
      setConversationTypingState(selectedConversation.id, user.uid, false).catch(() => {});
      typingTimeoutRef.current = null;
    }, 1800);

    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [newMessage, selectedConversation?.id, user]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }

      const activeConversationId = activeTypingConversationIdRef.current;
      if (activeConversationId && user?.uid) {
        setConversationTypingState(activeConversationId, user.uid, false).catch(() => {});
      }
    };
  }, [user]);

  async function handleSendMessage(e) {
    e.preventDefault();
    if ((!newMessage.trim() && !audioBlob) || !selectedConversation || !user) return;
    
    setSending(true);
    setComposerFeedback(null);
    try {
      const resolvedStorage = getFirebaseStorage();
      const trimmedMessage = newMessage.trim();

      publishedTypingStateRef.current = { conversationId: selectedConversation.id, isTyping: false };
      await setConversationTypingState(selectedConversation.id, user.uid, false).catch(() => {});

      // Send text message if there's text
      if (trimmedMessage) {
        await sendMessage(selectedConversation.id, user.uid, trimmedMessage);
        setNewMessage("");
        setShowEmojiPicker(false);
      }
      
      // Send audio if there's audio
      if (audioBlob) {
        if (!resolvedStorage) {
          throw new Error("audio_storage_unavailable");
        }

        const resolvedAudioDuration = audioDuration > 0
          ? audioDuration
          : await getAudioDurationFromBlob(audioBlob);

        // Upload audio to Firebase Storage
        const audioRef = ref(resolvedStorage, `messages/${user.uid}/${selectedConversation.id}/${Date.now()}.webm`);
        await uploadBytes(audioRef, audioBlob);
        const audioURL = await getDownloadURL(audioRef);
        
        // Send message with audio
        await sendMessage(selectedConversation.id, user.uid, "", {
          type: "audio",
          audioURL: audioURL,
          duration: resolvedAudioDuration,
        });
        
        setAudioBlob(null);
        setAudioDuration(0);
        // Trigger clear audio in VoiceRecorder
        setClearAudio(true);
        setTimeout(() => setClearAudio(false), 100);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const safetyErrorMessage = getSafetyErrorMessage(error);
      setComposerFeedback({
        tone: "error",
        message: safetyErrorMessage || (audioBlob ? discoveryUi.audioUploadError : discoveryUi.sendMessageError),
      });
    } finally {
      setSending(false);
    }
  }

  async function handleToggleMute(conversationId, nextMuted) {
    if (!user?.uid || !conversationId) {
      return;
    }

    setSafetyActionLoading(`mute:${conversationId}`);
    try {
      await muteConversationForUser(user.uid, conversationId, nextMuted);
      setComposerFeedback({
        tone: "info",
        message: nextMuted ? discoveryUi.conversationMuted : discoveryUi.conversationUnmuted,
      });
    } catch (error) {
      console.error("Error updating mute state:", error);
    } finally {
      setSafetyActionLoading("");
    }
  }

  async function handleToggleConversationVisibility(conversationId, hidden) {
    if (!user?.uid || !conversationId) {
      return;
    }

    setSafetyActionLoading(`hide:${conversationId}`);
    try {
      await hideConversationForUser(user.uid, conversationId, hidden);
      openRequestDialog({
        tone: "info",
        title: discoveryUi.dialogInfoTitle,
        message: hidden ? discoveryUi.conversationHidden : discoveryUi.conversationRestored,
      });
      if (hidden && selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
      }
    } catch (error) {
      console.error("Error updating conversation visibility:", error);
    } finally {
      setSafetyActionLoading("");
    }
  }

  function closeSafetyDialog() {
    setSafetyDialog({
      open: false,
      mode: "block",
      targetUserId: "",
      conversationId: "",
      currentlyBlocked: false,
      details: "",
    });
  }

  function handleToggleBlock(targetUserId, currentlyBlocked) {
    if (!user?.uid || !targetUserId) {
      return;
    }

    setSafetyDialog({
      open: true,
      mode: "block",
      targetUserId,
      conversationId: "",
      currentlyBlocked,
      details: "",
    });
  }

  async function confirmToggleBlock(targetUserId, currentlyBlocked) {
    setSafetyActionLoading(`block:${targetUserId}`);
    try {
      if (currentlyBlocked) {
        await unblockUser(user.uid, targetUserId);
        closeSafetyDialog();
        openRequestDialog({
          tone: "info",
          title: discoveryUi.dialogInfoTitle,
          message: discoveryUi.userUnblocked,
        });
      } else {
        await blockUser(user.uid, targetUserId);
        closeSafetyDialog();
        openRequestDialog({
          tone: "info",
          title: discoveryUi.dialogInfoTitle,
          message: discoveryUi.userBlocked,
        });
        if (selectedConversation && getOtherParticipant(selectedConversation) === targetUserId) {
          setSelectedConversation(null);
        }
      }
    } catch (error) {
      console.error("Error updating block state:", error);
    } finally {
      setSafetyActionLoading("");
    }
  }

  function handleReportUser(targetUserId, conversationId = "") {
    if (!user?.uid || !targetUserId) {
      return;
    }

    setSafetyDialog({
      open: true,
      mode: "report",
      targetUserId,
      conversationId,
      currentlyBlocked: false,
      details: "",
    });
  }

  async function confirmReportUser(targetUserId, conversationId = "", reportReason = "") {
    setSafetyActionLoading(`report:${targetUserId}`);
    try {
      await reportUser({
        reportedUserId: targetUserId,
        reporterUserId: user.uid,
        reason: "messaging_abuse",
        details: reportReason.trim(),
        conversationId,
      });
      closeSafetyDialog();
      openRequestDialog({
        tone: "success",
        title: discoveryUi.dialogSuccessTitle,
        message: discoveryUi.userReported,
      });
    } catch (error) {
      console.error("Error reporting user:", error);
      openRequestDialog({
        tone: "error",
        title: discoveryUi.dialogErrorTitle,
        message: discoveryUi.requestError,
      });
    } finally {
      setSafetyActionLoading("");
    }
  }

  function handleAudioReady(value) {
    if (!value) {
      setAudioBlob(null);
      setAudioDuration(0);
      return;
    }

    if (value && typeof value === "object" && "blob" in value) {
      setAudioBlob(value.blob || null);
      setAudioDuration(Number(value.duration) || 0);
      setComposerFeedback(null);
      return;
    }

    setAudioBlob(value);
    setAudioDuration(0);
    setComposerFeedback(null);
  }

  async function handleImageSend(images) {
    if (!selectedConversation || !user) return;
    const resolvedStorage = getFirebaseStorage();

    if (images.length > 5) {
      setComposerFeedback({ tone: "error", message: discoveryUi.imageLimitError });
      return false;
    }

    const hasInvalidType = images.some((image) => !image.type?.startsWith("image/"));
    if (hasInvalidType) {
      setComposerFeedback({ tone: "error", message: discoveryUi.imageTypeError });
      return false;
    }

    const hasInvalidSize = images.some((image) => image.size > 5 * 1024 * 1024);
    if (hasInvalidSize) {
      setComposerFeedback({ tone: "error", message: discoveryUi.imageSizeError });
      return false;
    }

    if (!resolvedStorage) {
      setComposerFeedback({ tone: "error", message: discoveryUi.imageUploadError });
      return false;
    }
    
    setSending(true);
    setComposerFeedback(null);
    try {
      const imagePromises = images.map(async (image, index) => {
        const imageRef = ref(resolvedStorage, `messages/${user.uid}/${selectedConversation.id}/${Date.now()}_${index}.jpg`);
        await uploadBytes(imageRef, image);
        return getDownloadURL(imageRef);
      });
      
      const imageUrls = await Promise.all(imagePromises);
      
      // Send message with images
      await sendMessage(selectedConversation.id, user.uid, "", {
        type: "images",
        images: imageUrls
      });
      setShowEmojiPicker(false);
      setShowImageShare(false);
      return true;
    } catch (error) {
      console.error("Error sending images:", error);
      setComposerFeedback({ tone: "error", message: discoveryUi.imageUploadError });
      return false;
    } finally {
      setSending(false);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function formatTime(timestamp) {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return date.toLocaleTimeString("fr-HT", { hour: "2-digit", minute: "2-digit" });
  }

  function formatDate(timestamp) {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return t("today");
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t("yesterday");
    } else {
      return date.toLocaleDateString("fr-HT", { day: "numeric", month: "short" });
    }
  }

  function getOtherParticipant(conversation) {
    const otherId = conversation.participants.find(id => id !== user.uid);
    return otherId;
  }

  function getOtherRequestParticipant(request) {
    return request.requesterId === user.uid ? request.recipientId : request.requesterId;
  }

  function getRequestDisplayName(request) {
    return request.requesterId === user.uid ? request.recipientName : request.requesterName;
  }

  function getRequestDisplayPhoto(request) {
    return request.requesterId === user.uid ? request.recipientPhoto : request.requesterPhoto;
  }

  function getConversationDisplayName(conversation, fallbackMember = null) {
    if (!conversation) {
      return t("user");
    }

    const otherId = getOtherParticipant(conversation);
    const conversationName = conversation.participantNames?.[otherId];

    if (typeof conversationName === "string" && conversationName.trim()) {
      return conversationName;
    }

    if (typeof fallbackMember?.name === "string" && fallbackMember.name.trim()) {
      return fallbackMember.name;
    }

    return t("user");
  }

  function getConversationDisplayPhoto(conversation, fallbackMember = null) {
    if (!conversation) {
      return "";
    }

    const otherId = getOtherParticipant(conversation);
    return conversation.participantPhotos?.[otherId] || fallbackMember?.photo || "";
  }

  function formatLastSeen(timestamp) {
    if (!timestamp || typeof timestamp.toDate !== "function") {
      return discoveryUi.offline;
    }

    const date = timestamp.toDate();
    return date.toLocaleString("fr-HT", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getTimestampMillis(timestamp) {
    return typeof timestamp?.toMillis === "function" ? timestamp.toMillis() : 0;
  }

  function isPresenceCurrentlyOnline(profile) {
    const lastActiveAt = getTimestampMillis(profile?.lastActiveAt || profile?.lastSeenAt);
    return Boolean(profile?.isOnline) && lastActiveAt > 0 && presenceNow - lastActiveAt <= ONLINE_PRESENCE_TTL_MS;
  }

  async function getAudioDurationFromBlob(blob) {
    if (!blob || typeof window === "undefined") {
      return 0;
    }

    const audioUrl = URL.createObjectURL(blob);

    try {
      const duration = await new Promise((resolve, reject) => {
        const audio = new Audio();

        audio.preload = "metadata";
        audio.onloadedmetadata = () => {
          resolve(Number.isFinite(audio.duration) ? Math.max(1, Math.round(audio.duration)) : 0);
        };
        audio.onerror = () => reject(new Error("audio_metadata_error"));
        audio.src = audioUrl;
      });

      return duration;
    } finally {
      URL.revokeObjectURL(audioUrl);
    }
  }

  function formatAudioDuration(durationInSeconds) {
    const totalSeconds = Math.max(0, Math.round(Number(durationInSeconds) || 0));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  function getMissedCallLabel(call) {
    if (!call || call.status !== "missed") {
      return "";
    }

    return call.calleeId === user?.uid ? discoveryUi.callMissed : discoveryUi.callNoAnswer;
  }

  function isParticipantTyping(conversation, participantId) {
    const typingState = conversation?.typingStatus?.[participantId];
    const typingUpdatedAt = getTimestampMillis(typingState?.updatedAt);

    return Boolean(typingState?.isTyping)
      && typingUpdatedAt > 0
      && presenceNow - typingUpdatedAt <= TYPING_STATUS_TTL_MS;
  }

  function getOutgoingMessageStatus(message) {
    if (message.readAt || message.read) {
      return {
        label: discoveryUi.seenStatus,
        icon: CheckCheck,
      };
    }

    if (message.deliveredAt) {
      return {
        label: discoveryUi.deliveredStatus,
        icon: CheckCheck,
      };
    }

    return {
      label: discoveryUi.sentStatus,
      icon: Check,
    };
  }

  function getSafetyErrorMessage(error) {
    const message = String(error?.message || "").trim();
    const code = String(error?.code || "").trim().toLowerCase();

    if (["blocked_user", "blocked_by_user"].includes(message)) {
      return discoveryUi.interactionBlocked;
    }

    if (["sender_messaging_restricted", "recipient_messaging_restricted"].includes(message)) {
      return discoveryUi.messagingRestricted;
    }

    if (message === "conversation_request_rate_limited") {
      return discoveryUi.requestRateLimited;
    }

    if (message === "message_rate_limited") {
      return discoveryUi.messageRateLimited;
    }

    if (message === "duplicate_message") {
      return discoveryUi.duplicateMessage;
    }

    if (code === "permission-denied" || code === "firestore/permission-denied") {
      return discoveryUi.requestError;
    }

    return "";
  }

  function openRequestDialog({ tone = "success", title, message }) {
    setRequestDialog({
      open: true,
      tone,
      title,
      message,
    });
  }

  async function handleStartCall() {
    if (!selectedConversation?.id || !selectedConversationOtherId || !user?.uid) {
      return;
    }

    const existingCall = conversationCalls.find(
      (call) => call.conversationId === selectedConversation.id && ["ringing", "active"].includes(call.status)
    );
    if (existingCall) {
      setCurrentCallSession(existingCall);
      setCallDialogOpen(true);
      return;
    }

    setCallActionLoading(`start:${selectedConversation.id}`);
    try {
      const nextCall = await startConversationCall({
        conversationId: selectedConversation.id,
        callerId: user.uid,
        calleeId: selectedConversationOtherId,
      });
      setCurrentCallSession(nextCall);
      setCallDialogOpen(true);
    } catch (error) {
      console.error("Error starting conversation call:", error);
      openRequestDialog({
        tone: "error",
        title: discoveryUi.dialogErrorTitle,
        message: discoveryUi.callConnectionError,
      });
    } finally {
      setCallActionLoading("");
    }
  }

  async function handleAcceptIncomingCall(callSession) {
    if (!callSession?.conversationId || !user?.uid) {
      return;
    }

    setCallActionLoading(`incoming:${callSession.conversationId}`);
    try {
      await acceptConversationCall(callSession.conversationId, user.uid);
      const matchingConversation = conversations.find((conversation) => conversation.id === callSession.conversationId);
      if (matchingConversation) {
        setSelectedConversation(matchingConversation);
      }
      setCurrentCallSession({
        ...callSession,
        status: "active",
        answeredBy: user.uid,
      });
      setCallDialogOpen(true);
    } catch (error) {
      console.error("Error accepting incoming call:", error);
      openRequestDialog({
        tone: "error",
        title: discoveryUi.dialogErrorTitle,
        message: discoveryUi.callConnectionError,
      });
    } finally {
      setCallActionLoading("");
    }
  }

  async function handleDeclineIncomingCall(callSession) {
    if (!callSession?.conversationId || !user?.uid) {
      return;
    }

    setCallActionLoading(`incoming:${callSession.conversationId}`);
    try {
      await declineConversationCall(callSession.conversationId, user.uid);
      openRequestDialog({
        tone: "info",
        title: discoveryUi.dialogInfoTitle,
        message: discoveryUi.callDeclined,
      });
    } catch (error) {
      console.error("Error declining incoming call:", error);
      openRequestDialog({
        tone: "error",
        title: discoveryUi.dialogErrorTitle,
        message: discoveryUi.callConnectionError,
      });
    } finally {
      setCallActionLoading("");
    }
  }

  async function handleEndCurrentCall() {
    const conversationId = String(currentCallSession?.conversationId || "").trim();
    if (!conversationId || !user?.uid) {
      setCallDialogOpen(false);
      setCurrentCallSession(null);
      return;
    }

    setCallActionLoading(`end:${conversationId}`);
    try {
      await endConversationCall(conversationId, user.uid);
    } catch (error) {
      console.error("Error ending current call:", error);
    } finally {
      setCallDialogOpen(false);
      setCurrentCallSession(null);
      setCallActionLoading("");
    }
  }

  function resolveCallSetupErrorMessage(errorCode) {
    if (errorCode === "agora_config_missing") {
      return discoveryUi.callConfigMissingError;
    }

    if (errorCode === "agora_sdk_missing" || errorCode === "agora_sdk_unavailable") {
      return discoveryUi.callSdkMissingError;
    }

    if (errorCode === "auth_required") {
      return discoveryUi.callAuthRequiredError;
    }

    return discoveryUi.callConnectionError;
  }

  async function handleCallConnectionError(errorCode) {
    const conversationId = String(currentCallSession?.conversationId || "").trim();

    if (conversationId && user?.uid) {
      try {
        await endConversationCall(conversationId, user.uid);
      } catch (error) {
        console.error("Error cleaning up failed conversation call:", error);
      }
    }

    setCallDialogOpen(false);
    setCurrentCallSession(null);
    openRequestDialog({
      tone: "error",
      title: discoveryUi.dialogErrorTitle,
      message: resolveCallSetupErrorMessage(errorCode),
    });
  }

  function handleInsertEmoji(emoji) {
    if (!emoji || selectedConversationSendDisabled) {
      return;
    }

    setNewMessage((current) => `${current || ""}${emoji}`);
    setComposerFeedback(null);
  }

  async function handleCreateRequest(targetUserId) {
    if (!user || !targetUserId || targetUserId === user.uid) {
      return;
    }

    setRequestingMemberId(targetUserId);

    try {
      const matchingConversation = conversations.find((conversation) => (
        Array.isArray(conversation?.participants)
        && conversation.participants.length === 2
        && getOtherParticipant(conversation) === targetUserId
      ));

      const conversationId = matchingConversation?.id || await createConversation([user.uid, targetUserId]);

      if (conversationId) {
        await hideConversationForUser(user.uid, conversationId, false).catch(() => {});
      }

      const nextConversation = conversations.find((conversation) => conversation.id === conversationId);
      if (nextConversation) {
        setSelectedConversation(nextConversation);
      }
      setRequestedConversationId(conversationId || "");
    } catch (error) {
      console.error("Error opening direct conversation:", {
        message: String(error?.message || "").trim(),
        code: String(error?.code || "").trim(),
        stage: String(error?.conversationRequestStage || "").trim(),
        cause: error?.cause || null,
      });
      const safetyErrorMessage = getSafetyErrorMessage(error);
      openRequestDialog({
        tone: "error",
        title: discoveryUi.dialogErrorTitle,
        message: safetyErrorMessage || discoveryUi.requestError,
      });
    } finally {
      setRequestingMemberId("");
    }
  }

  async function handleAcceptRequest(requestId) {
    setRequestActionId(requestId);

    try {
      const conversationId = await acceptConversationRequest(requestId);
      const acceptedConversation = conversations.find((conversation) => conversation.id === conversationId);

      if (acceptedConversation) {
        setSelectedConversation(acceptedConversation);
      }
      setRequestedConversationId(conversationId || "");
      openRequestDialog({
        tone: "success",
        title: discoveryUi.dialogSuccessTitle,
        message: discoveryUi.requestAccepted,
      });
    } catch (error) {
      console.error("Error accepting conversation request:", error);
      openRequestDialog({
        tone: "error",
        title: discoveryUi.dialogErrorTitle,
        message: t("conversationError"),
      });
    } finally {
      setRequestActionId("");
    }
  }

  async function handleDeclineRequest(requestId) {
    setRequestActionId(requestId);

    try {
      await declineConversationRequest(requestId);
      openRequestDialog({
        tone: "info",
        title: discoveryUi.dialogInfoTitle,
        message: discoveryUi.requestDeclined,
      });
    } catch (error) {
      console.error("Error declining conversation request:", error);
      openRequestDialog({
        tone: "error",
        title: discoveryUi.dialogErrorTitle,
        message: t("conversationError"),
      });
    } finally {
      setRequestActionId("");
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md rounded-3xl border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <MessageCircle className="mx-auto h-12 w-12 text-slate-300" />
            <h1 className="mt-4 text-xl font-bold">{t("loadingConversations")}</h1>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md rounded-3xl border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <MessageCircle className="mx-auto h-12 w-12 text-slate-300" />
            <h1 className="mt-4 text-xl font-bold">{t("loginToSeeMessages")}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {t("loginToSeeMessagesDesc")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allDirectConversationMap = new Map(
    conversations
      .filter((conversation) => (conversation.participants || []).length === 2)
      .map((conversation) => [getOtherParticipant(conversation), conversation])
  );
  const conversationSafetyById = new Map(
    conversationSafetySettings.map((setting) => [setting.conversationId, setting])
  );
  const visibleConversations = (() => {
    const filtered = conversations.filter((conversation) => {
      const safetyState = conversationSafetyById.get(conversation.id);
      const otherParticipantId = getOtherParticipant(conversation);
      return !safetyState?.hidden && !blockedUserIds.includes(otherParticipantId);
    });
    const deduped = new Map();
    for (const conversation of filtered) {
      const computedKey = conversation.participantsKey
        || (Array.isArray(conversation.participants) && conversation.participants.length > 0
          ? [...new Set(conversation.participants.filter(Boolean))].sort().join("__")
          : null);
      const key = computedKey || conversation.id;
      const existing = deduped.get(key);
      const currentHasMsg = Boolean(conversation.lastMessage);
      const existingHasMsg = Boolean(existing?.lastMessage);
      const currentTime = conversation.lastMessageTime?.toMillis?.() ?? conversation.lastMessageTime ?? 0;
      const existingTime = existing?.lastMessageTime?.toMillis?.() ?? existing?.lastMessageTime ?? 0;
      const shouldReplace = !existing
        || (currentHasMsg && !existingHasMsg)
        || (currentHasMsg && existingHasMsg && currentTime > existingTime);
      if (shouldReplace) {
        deduped.set(key, conversation);
      }
    }
    return Array.from(deduped.values());
  })();
  const visibleConversationRequests = conversationRequests.filter(
    (request) => !blockedUserIds.includes(getOtherRequestParticipant(request))
  );
  const allMembersWithPresence = [...members]
    .map((member) => ({
      ...member,
      isOnline: isPresenceCurrentlyOnline(member),
      isBlocked: blockedUserIds.includes(member.id),
    }))
    .sort((a, b) => {
      if (Boolean(b.isOnline) !== Boolean(a.isOnline)) {
        return Number(Boolean(b.isOnline)) - Number(Boolean(a.isOnline));
      }

      return (a.name || "").localeCompare(b.name || "", "fr");
    });
  const directoryMembers = allMembersWithPresence.filter((member) => !member.profileHidden);
  const normalizedSidebarSearchQuery = normalizeSearchTerm(sidebarSearchQuery);
  const filteredConversationRequests = visibleConversationRequests.filter((request) => matchesSearchTerm(
    normalizedSidebarSearchQuery,
    [
      getRequestDisplayName(request),
      request.message,
      request.itemInfo?.title,
      request.requesterName,
      request.recipientName,
    ]
  ));
  const filteredVisibleConversations = visibleConversations.filter((conversation) => {
    const otherParticipantId = getOtherParticipant(conversation);
    const otherMember = allMembersWithPresence.find((member) => member.id === otherParticipantId);

    return matchesSearchTerm(normalizedSidebarSearchQuery, [
      getConversationDisplayName(conversation, otherMember),
      conversation.lastMessage,
      conversation.itemInfo?.title,
      otherMember?.name,
      otherMember?.city,
      otherMember?.country,
    ]);
  });
  const filteredDirectoryMembers = directoryMembers.filter((member) => matchesSearchTerm(
    normalizedSidebarSearchQuery,
    [
      member.name,
      member.displayName,
      member.city,
      member.country,
      member.bio,
      member.childAges,
    ]
  ));
  const membersById = new Map(allMembersWithPresence.map((member) => [member.id, member]));
  const onlineMembersCount = allMembersWithPresence.filter((member) => member.isOnline).length;
  const selectedConversationOtherId = selectedConversation ? getOtherParticipant(selectedConversation) : "";
  const selectedConversationOtherMember = selectedConversationOtherId ? membersById.get(selectedConversationOtherId) : null;
  const selectedConversationSendDisabled = Boolean(
    selectedConversation
    && (
      blockedUserIds.includes(selectedConversationOtherId)
      || Boolean(selectedConversationOtherMember?.messagingRestricted)
      || ["restricted", "suspended"].includes(String(selectedConversationOtherMember?.moderationStatus || "").trim().toLowerCase())
    )
  );
  const selectedConversationCall = selectedConversation?.id
    ? conversationCalls.find((call) => call.conversationId === selectedConversation.id && ["ringing", "active"].includes(call.status)) || null
    : null;
  const selectedConversationMissedCall = selectedConversation?.id
    ? conversationCalls.find((call) => call.conversationId === selectedConversation.id && call.status === "missed") || null
    : null;
  const incomingConversationCall = conversationCalls.find(
    (call) => call.status === "ringing" && call.calleeId === user?.uid
  ) || null;
  const incomingCallConversation = incomingConversationCall?.conversationId
    ? conversations.find((conversation) => conversation.id === incomingConversationCall.conversationId) || null
    : null;
  const incomingCallOtherMember = incomingConversationCall?.callerId
    ? membersById.get(incomingConversationCall.callerId)
    : null;
  const incomingCallDisplayName = incomingCallConversation
    ? getConversationDisplayName(incomingCallConversation, incomingCallOtherMember)
    : incomingCallOtherMember?.name || discoveryUi.callUnknownParticipant;
  const currentCallConversation = currentCallSession?.conversationId
    ? conversations.find((conversation) => conversation.id === currentCallSession.conversationId) || null
    : null;
  const currentCallOtherId = currentCallSession
    ? (currentCallSession.participants || []).find((participantId) => participantId !== user?.uid) || ""
    : "";
  const currentCallOtherMember = currentCallOtherId ? membersById.get(currentCallOtherId) : null;
  const currentCallDisplayName = currentCallConversation
    ? getConversationDisplayName(currentCallConversation, currentCallOtherMember)
    : currentCallOtherMember?.name || discoveryUi.callUnknownParticipant;
  const selectedConversationSupportsCalling = Boolean(
    selectedConversation
    && (selectedConversation.participants || []).length === 2
    && selectedConversationOtherId
  );
  const sidebarSectionClass = "rounded-[1.75rem] border border-[#eadbe8] bg-[linear-gradient(180deg,_rgba(255,255,255,0.96)_0%,_rgba(248,243,247,0.98)_100%)] p-4 shadow-[0_18px_50px_-42px_rgba(83,41,86,0.28)] backdrop-blur-sm";
  const sidebarSummaryCardClass = "rounded-2xl border border-[#eadbe8] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(247,242,247,0.98)_100%)] px-3 py-3 text-left shadow-[0_16px_36px_-28px_rgba(83,41,86,0.22)] transition-all hover:-translate-y-0.5 hover:border-[#efd1df] hover:shadow-[0_20px_44px_-28px_rgba(83,41,86,0.2)]";
  const showRequestsSection = activeSidebarFilter === "all" || activeSidebarFilter === "requests";
  const showDiscussionsSection = activeSidebarFilter === "all" || activeSidebarFilter === "discussions";
  const showPeopleSection = activeSidebarFilter === "all" || activeSidebarFilter === "people";

  return (
    <>
      <div className="flex min-h-0 h-[calc(100dvh-7rem)] flex-col gap-0 overflow-hidden rounded-[1.5rem] border border-[#eadbe8] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(248,242,247,0.98)_100%)] shadow-[0_30px_90px_-50px_rgba(83,41,86,0.28)] sm:h-[calc(100dvh-8rem)] sm:rounded-[2rem] lg:flex-row lg:gap-4">
      {/* Conversations List */}
      <div className={`min-h-0 w-full min-w-0 flex-col bg-[linear-gradient(180deg,_rgba(252,248,251,0.98)_0%,_rgba(246,241,247,0.98)_100%)] lg:max-w-sm lg:border-r lg:border-[#eadbe8] ${selectedConversation ? "hidden lg:flex" : "flex"}`}>
        <div className="border-b border-[#eadbe8] bg-white/70 p-4 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-xl font-semibold">{t("messages")}</h1>
              <p className="text-sm text-slate-500">
                {onlineMembersCount} {discoveryUi.onlineNow}
              </p>
            </div>
            <Badge variant="secondary" className="rounded-full border border-[#efd7e3] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(249,240,246,0.98)_100%)] px-3 py-1 text-[#7a284d] shadow-sm">
              {filteredVisibleConversations.length + filteredConversationRequests.length}
            </Badge>
          </div>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={sidebarSearchQuery}
              onChange={(event) => setSidebarSearchQuery(event.target.value)}
              placeholder={discoveryUi.searchSidebarPlaceholder}
              className="rounded-2xl border-[#eadbe8] bg-white pl-9"
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              type="button"
              className={`${sidebarSummaryCardClass} ${activeSidebarFilter === "requests" ? "border-[#efc5d7] bg-[linear-gradient(180deg,_rgba(255,247,251,0.98)_0%,_rgba(247,238,245,0.98)_100%)] shadow-[0_20px_48px_-30px_rgba(155,35,53,0.22)]" : ""}`}
              onClick={() => setActiveSidebarFilter((current) => current === "requests" ? "all" : "requests")}
            >
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                <span>{discoveryUi.requestsTitle}</span>
              </div>
              <p className="mt-2 text-lg font-semibold text-slate-900">{filteredConversationRequests.length}</p>
            </button>
            <button
              type="button"
              className={`${sidebarSummaryCardClass} ${activeSidebarFilter === "discussions" ? "border-[#efc5d7] bg-[linear-gradient(180deg,_rgba(255,247,251,0.98)_0%,_rgba(247,238,245,0.98)_100%)] shadow-[0_20px_48px_-30px_rgba(155,35,53,0.22)]" : ""}`}
              onClick={() => setActiveSidebarFilter((current) => current === "discussions" ? "all" : "discussions")}
            >
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                <MessageCircle className="h-3.5 w-3.5" />
                <span>{discoveryUi.discussionsTitle}</span>
              </div>
              <p className="mt-2 text-lg font-semibold text-slate-900">{filteredVisibleConversations.length}</p>
            </button>
            <button
              type="button"
              className={`${sidebarSummaryCardClass} ${activeSidebarFilter === "people" ? "border-[#efc5d7] bg-[linear-gradient(180deg,_rgba(255,247,251,0.98)_0%,_rgba(247,238,245,0.98)_100%)] shadow-[0_20px_48px_-30px_rgba(155,35,53,0.22)]" : ""}`}
              onClick={() => setActiveSidebarFilter((current) => current === "people" ? "all" : "people")}
            >
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                <User className="h-3.5 w-3.5" />
                <span>{discoveryUi.membersTitle}</span>
              </div>
              <p className="mt-2 text-lg font-semibold text-slate-900">{filteredDirectoryMembers.length}</p>
            </button>
          </div>
        </div>
        
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {loadError ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {loadError}
            </div>
          ) : null}

          {showRequestsSection ? (
          <div className={sidebarSectionClass}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-800">{discoveryUi.requestsTitle}</h2>
              </div>
              <Badge variant="secondary" className="rounded-full bg-white">{filteredConversationRequests.length}</Badge>
            </div>

            {filteredConversationRequests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                {normalizedSidebarSearchQuery ? discoveryUi.searchNoResults : discoveryUi.noRequests}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredConversationRequests.map((request) => {
                  const isIncoming = request.recipientId === user.uid;
                  const otherParticipantId = getOtherRequestParticipant(request);
                  const matchingConversation = allDirectConversationMap.get(otherParticipantId);

                  return (
                    <div key={request.id} className="overflow-hidden rounded-2xl border border-[#eadbe8] bg-white/85 p-3 shadow-[0_16px_34px_-28px_rgba(83,41,86,0.18)] backdrop-blur-sm">
                      <div className="flex min-w-0 items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={getRequestDisplayPhoto(request) || ""} />
                          <AvatarFallback className="bg-gradient-to-br from-rose-100 to-pink-100 text-rose-600">
                            {getInitials(getRequestDisplayName(request) || "U")}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-start justify-between gap-2">
                            <p className="min-w-0 flex-1 truncate font-medium text-slate-900">{getRequestDisplayName(request)}</p>
                            <Badge variant="outline" className="shrink-0 rounded-full text-xs">
                              {isIncoming ? discoveryUi.incoming : discoveryUi.outgoing}
                            </Badge>
                          </div>

                          <p className="mt-1 break-words text-sm text-slate-500">
                            {request.message || request.itemInfo?.title || discoveryUi.optionalMessageEmpty}
                          </p>

                          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {matchingConversation ? (
                              <Button size="sm" variant="outline" className="h-auto w-full rounded-xl whitespace-normal px-3 py-2 text-left" onClick={() => setSelectedConversation(matchingConversation)}>
                                {discoveryUi.openConversation}
                              </Button>
                            ) : isIncoming ? (
                              <>
                                <Button
                                  size="sm"
                                  className="h-auto w-full rounded-xl bg-gradient-to-r from-[#9B2335] to-[#7B1A2C] whitespace-normal px-3 py-2 text-left"
                                  onClick={() => handleAcceptRequest(request.id)}
                                  disabled={requestActionId === request.id}
                                >
                                  {discoveryUi.accept}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-auto w-full rounded-xl whitespace-normal px-3 py-2 text-left"
                                  onClick={() => handleDeclineRequest(request.id)}
                                  disabled={requestActionId === request.id}
                                >
                                  {discoveryUi.decline}
                                </Button>
                              </>
                            ) : (
                              <Badge variant="secondary" className="w-fit max-w-full rounded-full">{discoveryUi.pending}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          ) : null}

          {showDiscussionsSection ? (
          <div className={sidebarSectionClass}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-800">{discoveryUi.discussionsTitle}</h2>
              </div>
              <Badge variant="secondary" className="rounded-full bg-white">{filteredVisibleConversations.length}</Badge>
            </div>

          {loading ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-center text-slate-400">{t("loadingConversations")}</div>
          ) : filteredVisibleConversations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center">
              <MessageCircle className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">{normalizedSidebarSearchQuery ? discoveryUi.searchNoResults : t("noMessages")}</p>
            </div>
          ) : (
            <div className="space-y-3">
            {filteredVisibleConversations.map((conv) => {
              const otherId = getOtherParticipant(conv);
              const unreadCount = conv.unreadCount?.[user.uid] || 0;
              const isItemRelated = conv.itemInfo;
              const otherMember = membersById.get(otherId);
              const isOtherTyping = isParticipantTyping(conv, otherId);
              const displayName = getConversationDisplayName(conv, otherMember);
              const displayPhoto = getConversationDisplayPhoto(conv, otherMember);
              const safetyState = conversationSafetyById.get(conv.id);
              const conversationMissedCall = conversationCalls.find((call) => call.conversationId === conv.id && call.status === "missed") || null;
              const showMissedCallPreview = Boolean(
                conversationMissedCall
                && getTimestampMillis(conversationMissedCall.missedAt || conversationMissedCall.updatedAt) >= getTimestampMillis(conv.lastMessageTime)
              );
              const conversationPreviewText = showMissedCallPreview
                ? getMissedCallLabel(conversationMissedCall)
                : (isOtherTyping ? discoveryUi.typingNow : (conv.lastMessage || t("startConversation")));
              const conversationPreviewClass = showMissedCallPreview
                ? "font-medium text-[#9B2335]"
                : isOtherTyping
                  ? "font-medium italic text-[#9B2335]"
                  : "text-slate-500";
              const conversationPreviewTime = showMissedCallPreview
                ? (conversationMissedCall?.missedAt || conversationMissedCall?.updatedAt)
                : conv.lastMessageTime;
              
              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`flex cursor-pointer gap-3 rounded-2xl border border-[#eadbe8] bg-white/88 p-4 shadow-[0_16px_34px_-28px_rgba(83,41,86,0.16)] transition-all hover:-translate-y-0.5 hover:border-[#efd1df] hover:bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(250,244,248,0.98)_100%)] hover:shadow-[0_20px_44px_-28px_rgba(83,41,86,0.2)] ${
                    selectedConversation?.id === conv.id ? "border-[#efc5d7] bg-[linear-gradient(180deg,_rgba(255,247,251,0.98)_0%,_rgba(247,238,245,0.98)_100%)] shadow-[0_20px_48px_-30px_rgba(155,35,53,0.22)]" : ""
                  }`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={displayPhoto} />
                    <AvatarFallback className="bg-gradient-to-br from-rose-100 to-pink-100 text-rose-600">
                      {getInitials(displayName || "U")}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-medium">
                          {displayName}
                        </h3>
                        {otherMember && (
                          <p className="mt-0.5 truncate text-xs text-slate-400">
                            {otherMember.isOnline
                              ? discoveryUi.online
                              : `${discoveryUi.lastSeen} ${formatLastSeen(otherMember.lastSeenAt)}`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {safetyState?.muted && (
                          <Badge variant="secondary" className="rounded-full">{discoveryUi.mutedBadge}</Badge>
                        )}
                        {otherMember && (
                          <span className={`inline-flex h-2.5 w-2.5 rounded-full ${otherMember.isOnline ? "bg-emerald-500" : "bg-slate-300"}`} />
                        )}
                        {unreadCount > 0 && (
                        <Badge className="h-5 w-5 rounded-full bg-[#9B2335] p-0 text-xs">
                          {unreadCount}
                        </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-1 flex items-center gap-2">
                      {isItemRelated && (
                        <ShoppingBag className="h-3 w-3 text-slate-400" />
                      )}
                      <p className={`truncate text-sm ${conversationPreviewClass}`}>
                        {conversationPreviewText}
                      </p>
                    </div>
                    
                    <p className="mt-1 text-xs text-slate-400">
                      {conversationPreviewTime ? formatDate(conversationPreviewTime) : ""}
                    </p>
                  </div>
                </div>
              );
            })}
            </div>
          )}
          </div>
          ) : null}

          {showPeopleSection ? (
          <div className={sidebarSectionClass}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-800">{discoveryUi.membersTitle}</h2>
              </div>
              <Badge variant="secondary" className="rounded-full bg-white">{filteredDirectoryMembers.length}</Badge>
            </div>

            {filteredDirectoryMembers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                {normalizedSidebarSearchQuery ? discoveryUi.memberSearchEmpty : discoveryUi.memberListEmpty}
              </div>
            ) : (
              <div className="max-h-[26rem] space-y-3 overflow-y-auto pr-1">
                {filteredDirectoryMembers.map((member) => {
                  const matchingConversation = allDirectConversationMap.get(member.id);
                  const matchingConversationSafety = matchingConversation
                    ? conversationSafetyById.get(matchingConversation.id)
                    : null;

                  return (
                    <div key={member.id} className="overflow-hidden rounded-2xl border border-[#eadbe8] bg-white/88 p-3 shadow-[0_16px_34px_-28px_rgba(83,41,86,0.16)] backdrop-blur-sm">
                      <div className="flex min-w-0 items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.photo || ""} />
                          <AvatarFallback className="bg-gradient-to-br from-rose-100 to-pink-100 text-rose-600">
                            {getInitials(member.name || "U")}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="min-w-0 truncate font-medium text-slate-900">{member.name || t("user")}</p>
                              <p className="mt-0.5 text-xs text-slate-400">
                                {member.isOnline ? discoveryUi.online : `${discoveryUi.lastSeen} ${formatLastSeen(member.lastSeenAt)}`}
                              </p>
                            </div>
                            {member.isBlocked && (
                              <Badge variant="secondary" className="rounded-full">{discoveryUi.blockedBadge}</Badge>
                            )}
                            <span className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${member.isOnline ? "bg-emerald-500" : "bg-slate-300"}`} />
                          </div>

                          <p className="break-words text-sm text-slate-500">
                            {member.city || "Diaspora"}{member.country ? `, ${member.country}` : ""}
                          </p>

                          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <Button size="sm" variant="outline" className="h-auto w-full rounded-xl whitespace-normal px-3 py-2 text-left" onClick={() => router.push(`/profile/${member.id}`)}>
                              {t("viewProfile")}
                            </Button>
                            {member.isBlocked ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-auto w-full rounded-xl whitespace-normal px-3 py-2 text-left"
                                onClick={() => handleToggleBlock(member.id, true)}
                                disabled={safetyActionLoading === `block:${member.id}`}
                              >
                                {discoveryUi.unblock}
                              </Button>
                            ) : matchingConversationSafety?.hidden ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-auto w-full rounded-xl whitespace-normal px-3 py-2 text-left"
                                onClick={() => handleToggleConversationVisibility(matchingConversation.id, false)}
                                disabled={safetyActionLoading === `hide:${matchingConversation.id}`}
                              >
                                {discoveryUi.restoreConversation}
                              </Button>
                            ) : matchingConversation ? (
                              <Button size="sm" className="h-auto w-full rounded-xl bg-gradient-to-r from-[#9B2335] to-[#7B1A2C] whitespace-normal px-3 py-2 text-left" onClick={() => setSelectedConversation(matchingConversation)}>
                                {discoveryUi.openConversation}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="h-auto w-full rounded-xl bg-gradient-to-r from-[#9B2335] to-[#7B1A2C] whitespace-normal px-3 py-2 text-left"
                                onClick={() => handleCreateRequest(member.id)}
                                disabled={requestingMemberId === member.id}
                              >
                                {discoveryUi.requestConversation}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {hasMoreDirectoryMembers ? (
              <div className="mt-3 flex justify-center">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={handleLoadMoreDirectoryMembers}
                  disabled={loadingMoreDirectoryMembers}
                >
                  {loadingMoreDirectoryMembers ? discoveryUi.loadingPeople : discoveryUi.loadMorePeople}
                </Button>
              </div>
            ) : null}
          </div>
          ) : null}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,_rgba(254,252,254,0.96)_0%,_rgba(246,241,247,0.98)_100%)] ${selectedConversation ? "flex" : "hidden lg:flex"}`}>
      {selectedConversation ? (() => {
          const selectedConversationOtherId = getOtherParticipant(selectedConversation);
          const selectedConversationOtherMember = membersById.get(selectedConversationOtherId);
          const selectedConversationIsTyping = isParticipantTyping(selectedConversation, selectedConversationOtherId);
          const selectedConversationDisplayName = getConversationDisplayName(selectedConversation, selectedConversationOtherMember);
          const selectedConversationDisplayPhoto = getConversationDisplayPhoto(selectedConversation, selectedConversationOtherMember);
          const selectedConversationSafety = conversationSafetyById.get(selectedConversation.id) || {};
          const selectedConversationBlocked = blockedUserIds.includes(selectedConversationOtherId);
          const selectedConversationRestricted = Boolean(selectedConversationOtherMember?.messagingRestricted)
            || ["restricted", "suspended"].includes(String(selectedConversationOtherMember?.moderationStatus || "").trim().toLowerCase());
          const selectedConversationSendDisabled = selectedConversationBlocked || selectedConversationRestricted;

          return (
          <>
            {/* Chat Header */}
            <div className="border-b border-[#eadbe8] bg-white/78 p-3 backdrop-blur-sm sm:p-4">
              <div className="flex items-start gap-3 sm:items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl lg:hidden"
                  onClick={() => setSelectedConversation(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedConversationDisplayPhoto} />
                  <AvatarFallback className="bg-gradient-to-br from-rose-100 to-pink-100 text-rose-600">
                    {getInitials(selectedConversationDisplayName || "U")}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <h2 className="font-medium">
                    {selectedConversationDisplayName}
                  </h2>
                  {selectedConversationIsTyping ? (
                    <p className="text-xs font-medium italic text-[#9B2335]">
                      {discoveryUi.typingNow}
                    </p>
                  ) : selectedConversationOtherMember && (
                    <p className="text-xs text-slate-400">
                      {selectedConversationOtherMember.isOnline
                        ? discoveryUi.online
                        : `${discoveryUi.lastSeen} ${formatLastSeen(selectedConversationOtherMember.lastSeenAt)}`}
                    </p>
                  )}
                  {selectedConversation.itemInfo && (
                    <p className="text-sm text-slate-500">
                      {selectedConversation.itemInfo.title}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-start gap-2 sm:items-center">
                  <div className="flex flex-wrap justify-end gap-2">
                  {selectedConversationSafety.muted && (
                    <Badge variant="secondary" className="rounded-full">{discoveryUi.mutedBadge}</Badge>
                  )}
                  {selectedConversationBlocked && (
                    <Badge variant="secondary" className="rounded-full">{discoveryUi.blockedBadge}</Badge>
                  )}
                  {selectedConversationMissedCall && (
                    <Badge variant="secondary" className="rounded-full border border-rose-200 bg-rose-50 text-rose-700">
                      {getMissedCallLabel(selectedConversationMissedCall)}
                    </Badge>
                  )}
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant={selectedConversationCall ? "default" : "outline"}
                    className={`h-10 w-10 rounded-xl ${selectedConversationCall ? "bg-gradient-to-r from-[#9B2335] to-[#7B1A2C] text-white" : "border-[#eadbe8] bg-white/90"}`}
                    aria-label={discoveryUi.callAction}
                    onClick={handleStartCall}
                    disabled={callActionLoading === `start:${selectedConversation.id}` || (!selectedConversationCall && (!selectedConversationSupportsCalling || selectedConversationSendDisabled))}
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                  <div ref={conversationActionsRef} className="relative">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-10 w-10 rounded-xl border-[#eadbe8] bg-white/90"
                      aria-label={discoveryUi.manageConversation}
                      aria-expanded={conversationActionsOpen}
                      onClick={() => setConversationActionsOpen((current) => !current)}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    {conversationActionsOpen ? (
                      <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-[#eadbe8] bg-[linear-gradient(180deg,_rgba(255,255,255,0.99)_0%,_rgba(248,243,247,0.99)_100%)] p-2 shadow-[0_24px_50px_-28px_rgba(83,41,86,0.28)]">
                        <button
                          type="button"
                          className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-rose-50"
                          onClick={() => {
                            setConversationActionsOpen(false);
                            handleToggleMute(selectedConversation.id, !selectedConversationSafety.muted);
                          }}
                          disabled={safetyActionLoading === `mute:${selectedConversation.id}`}
                        >
                          {selectedConversationSafety.muted ? discoveryUi.unmuteConversation : discoveryUi.muteConversation}
                        </button>
                        <button
                          type="button"
                          className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-rose-50"
                          onClick={() => {
                            setConversationActionsOpen(false);
                            handleToggleConversationVisibility(selectedConversation.id, true);
                          }}
                          disabled={safetyActionLoading === `hide:${selectedConversation.id}`}
                        >
                          {discoveryUi.hideConversation}
                        </button>
                        <button
                          type="button"
                          className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-rose-50"
                          onClick={() => {
                            setConversationActionsOpen(false);
                            handleReportUser(selectedConversationOtherId, selectedConversation.id);
                          }}
                          disabled={safetyActionLoading === `report:${selectedConversationOtherId}`}
                        >
                          {discoveryUi.reportUser}
                        </button>
                        <button
                          type="button"
                          className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-rose-50"
                          onClick={() => {
                            setConversationActionsOpen(false);
                            handleToggleBlock(selectedConversationOtherId, selectedConversationBlocked);
                          }}
                          disabled={safetyActionLoading === `block:${selectedConversationOtherId}`}
                        >
                          {selectedConversationBlocked ? discoveryUi.unblock : discoveryUi.blockAction}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] bg-[radial-gradient(circle_at_top,_rgba(244,114,182,0.08),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(96,165,250,0.08),_transparent_24%)] p-3 sm:p-4">
              {(selectedConversationBlocked || selectedConversationRestricted) && (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {selectedConversationBlocked ? discoveryUi.blockedConversationNotice : discoveryUi.messagingRestricted}
                </div>
              )}
              {conversationLoadError ? (
                <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {conversationLoadError}
                </div>
              ) : null}
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-center">
                  <div>
                    <MessageCircle className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-2 text-sm text-slate-500">
                      {t("noMessagesInChat")}. {t("sendFirstMessage")}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isMe = message.senderId === user.uid;
                    const outgoingStatus = isMe ? getOutgoingMessageStatus(message) : null;
                    const OutgoingStatusIcon = outgoingStatus?.icon || Check;
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2 sm:max-w-xs lg:max-w-md ${
                            isMe
                              ? "bg-[linear-gradient(135deg,_#9B2335_0%,_#7B1A2C_52%,_#5f1730_100%)] text-white shadow-[0_18px_38px_-24px_rgba(155,35,53,0.48)]"
                              : "border border-[#eadbe8] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(246,241,247,0.98)_100%)] text-slate-800 shadow-[0_16px_34px_-28px_rgba(83,41,86,0.18)]"
                          }`}
                        >
                          {/* Message content based on type */}
                          {message.type === "audio" && message.audioURL ? (
                            <div className="space-y-2">
                              <audio 
                                src={message.audioURL} 
                                controls 
                                className="w-full h-8"
                                style={{ filter: isMe ? 'invert(1)' : 'none' }}
                              />
                              <p className="text-xs opacity-70">🎤 Message vocal{message.duration ? ` • ${formatAudioDuration(message.duration)}` : ""}</p>
                            </div>
                          ) : message.type === "images" && message.images ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-1">
                                {message.images.map((img, index) => (
                                  <img 
                                    key={index}
                                    src={img} 
                                    alt={`Image ${index + 1}`}
                                    className="rounded-lg max-w-full h-32 object-cover"
                                  />
                                ))}
                              </div>
                              {message.content && <p className="text-sm">{message.content}</p>}
                            </div>
                          ) : (
                            <p className="text-sm">{message.content || "Message vide"}</p>
                          )}
                          
                          <div className={`mt-1 flex items-center gap-1 text-xs ${
                            isMe ? "text-rose-100" : "text-slate-400"
                          }`}>
                            <span>{formatTime(message.timestamp)}</span>
                            {isMe && outgoingStatus && (
                              <>
                                <span>·</span>
                                <span>{outgoingStatus.label}</span>
                                <OutgoingStatusIcon className="h-3 w-3" />
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="space-y-3 border-t border-[#eadbe8] bg-white/82 p-3 backdrop-blur-sm sm:p-4">
              {/* Image Share */}
              {showImageShare && (
                <ImageShare 
                  onImageSend={handleImageSend}
                  onValidationError={(messageKey) => setComposerFeedback({
                    tone: "error",
                    message: discoveryUi[messageKey] || messageKey,
                  })}
                  disabled={sending || selectedConversationSendDisabled}
                />
              )}

              {composerFeedback?.message && (
                <div className={`flex items-start gap-2 rounded-2xl border px-3 py-2 text-sm ${composerFeedback.tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{composerFeedback.message}</p>
                </div>
              )}

              {showEmojiPicker && (
                <div className="rounded-2xl border border-[#eadbe8] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(247,242,247,0.98)_100%)] p-3 shadow-[0_16px_36px_-30px_rgba(83,41,86,0.18)]">
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    {discoveryUi.emojiPickerTitle}
                  </div>
                  <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="flex h-10 items-center justify-center rounded-xl border border-[#f0dfe8] bg-white text-xl shadow-sm transition hover:scale-105 hover:border-rose-200 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => handleInsertEmoji(emoji)}
                        disabled={sending || selectedConversationSendDisabled}
                        aria-label={`${discoveryUi.emojiPicker} ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#eadbe8] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(248,243,247,0.98)_100%)] p-2 shadow-[0_18px_40px_-30px_rgba(83,41,86,0.18)] sm:flex-nowrap">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowImageShare(!showImageShare)}
                  className="rounded-xl border-[#e7d6e3] bg-white/90 hover:bg-rose-50"
                  disabled={sending || selectedConversationSendDisabled}
                >
                  📷
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEmojiPicker((current) => !current)}
                  className="rounded-xl border-[#e7d6e3] bg-white/90 hover:bg-rose-50"
                  disabled={sending || selectedConversationSendDisabled}
                >
                  <Smile className="h-4 w-4" />
                </Button>
                
                <Input
                  placeholder={t("typeMessage")}
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    if (composerFeedback) {
                      setComposerFeedback(null);
                    }
                  }}
                  className="min-w-0 flex-1 rounded-xl border-[#e7d6e3] bg-white/96"
                  disabled={sending || selectedConversationSendDisabled}
                />
                
                <VoiceRecorder 
                  onAudioReady={handleAudioReady}
                  onError={(message) => setComposerFeedback({ tone: "error", message: message || discoveryUi.audioPermissionError })}
                  disabled={sending || selectedConversationSendDisabled}
                  clearAudio={clearAudio}
                />
                
                <Button
                  type="submit"
                  disabled={(!newMessage.trim() && !audioBlob) || sending || selectedConversationSendDisabled}
                  className="rounded-xl bg-gradient-to-r from-[#9B2335] to-[#7B1A2C]"
                >
                  {sending ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </>
          );
        })() : (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <MessageCircle className="mx-auto h-12 w-12 text-rose-200" />
              <h3 className="mt-2 font-medium">{t("selectConversation")}</h3>
              <p className="text-sm text-slate-500">
                {t("selectConversationDesc")}
              </p>
            </div>
          </div>
        )}
      </div>
      </div>

      <ActionDialog
        open={Boolean(incomingConversationCall && !callDialogOpen)}
        tone="info"
        title={discoveryUi.incomingCallTitle}
        message={`${incomingCallDisplayName} ${discoveryUi.incomingCallMessage}`}
        confirmLabel={discoveryUi.callAccept}
        cancelLabel={discoveryUi.callDecline}
        closeLabel={t("close")}
        loadingLabel={t("loading")}
        loading={callActionLoading === `incoming:${incomingConversationCall?.conversationId || ""}`}
        onClose={() => handleDeclineIncomingCall(incomingConversationCall)}
        onConfirm={() => handleAcceptIncomingCall(incomingConversationCall)}
      />

      <AgoraAudioCallDialog
        open={callDialogOpen && Boolean(currentCallSession?.conversationId)}
        callSession={currentCallSession}
        currentUserId={user?.uid || ""}
        remoteParticipantName={currentCallDisplayName}
        labels={discoveryUi}
        onClose={handleEndCurrentCall}
        onEndCall={handleEndCurrentCall}
        onConnectionError={handleCallConnectionError}
      />

      <ActionDialog
        open={safetyDialog.open}
        tone={safetyDialog.mode === "report" ? "danger" : "danger"}
        title={safetyDialog.mode === "report"
          ? discoveryUi.reportDialogTitle
          : safetyDialog.currentlyBlocked
            ? discoveryUi.unblockDialogTitle
            : discoveryUi.blockDialogTitle}
        message={safetyDialog.mode === "report"
          ? discoveryUi.reportDialogMessage
          : safetyDialog.currentlyBlocked
            ? discoveryUi.unblockConfirm
            : discoveryUi.blockConfirm}
        detailsLabel={safetyDialog.mode === "report" ? t("reason") : ""}
        detailsPlaceholder={safetyDialog.mode === "report" ? discoveryUi.reportPrompt : ""}
        detailsValue={safetyDialog.details}
        onDetailsChange={safetyDialog.mode === "report"
          ? (value) => setSafetyDialog((prev) => ({ ...prev, details: value }))
          : undefined}
        confirmLabel={safetyDialog.mode === "report"
          ? discoveryUi.reportUser
          : safetyDialog.currentlyBlocked
            ? discoveryUi.unblock
            : discoveryUi.blockAction}
        cancelLabel={t("cancel")}
        closeLabel={t("close")}
        loadingLabel={t("loading")}
        confirmDisabled={safetyDialog.mode === "report" && !safetyDialog.details.trim()}
        loading={safetyActionLoading === `${safetyDialog.mode}:${safetyDialog.targetUserId}`}
        onClose={closeSafetyDialog}
        onConfirm={() => {
          if (safetyDialog.mode === "report") {
            confirmReportUser(safetyDialog.targetUserId, safetyDialog.conversationId, safetyDialog.details);
            return;
          }

          confirmToggleBlock(safetyDialog.targetUserId, safetyDialog.currentlyBlocked);
        }}
      />

      <ActionDialog
        open={requestDialog.open}
        tone={requestDialog.tone}
        title={requestDialog.title}
        message={requestDialog.message}
        closeLabel={t("close")}
        onClose={() => setRequestDialog((prev) => ({ ...prev, open: false }))}
      />
    </>
  );
}
