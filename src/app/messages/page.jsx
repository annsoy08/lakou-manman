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
  getDiscoverableUsers,
  subscribeToUserConversationRequests,
  subscribeToUserConversations,
  subscribeToConversationMessages,
  createConversationRequest,
  acceptConversationRequest,
  declineConversationRequest,
  blockUser,
  unblockUser,
  reportUser,
  hideConversationForUser,
  muteConversationForUser,
  subscribeToBlockedUsers,
  subscribeToUserConversationSafetySettings,
} from "@/lib/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ActionDialog from "@/components/ui/action-dialog";
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
} from "lucide-react";
import { getInitials } from "@/lib/utils";

const ONLINE_PRESENCE_TTL_MS = 75 * 1000;
const TYPING_STATUS_TTL_MS = 4000;
const MESSAGES_BOOTSTRAP_TIMEOUT_MS = 12000;
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
  "👌",
  "📌",
];

export default function MessagesPage() {
  const { user } = useAuth();
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
        requestCreated: "Demann mesaj la voye.",
        requestPending: "Gen deja yon demann mesaj an atant pou moun sa a.",
        requestError: "Nou pa t ka voye demann nan.",
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
        requestCreated: "La demande de message a été envoyée.",
        requestPending: "Une demande de message est déjà en attente pour cette personne.",
        requestError: "Impossible d'envoyer la demande.",
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
  const messagesEndRef = useRef(null);
  const [showImageShare, setShowImageShare] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [clearAudio, setClearAudio] = useState(false);
  const [requestedConversationId, setRequestedConversationId] = useState("");
  const [presenceNow, setPresenceNow] = useState(() => Date.now());
  const [composerFeedback, setComposerFeedback] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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
    if (!user) {
      router.replace("/login");
    }
  }, [user, router]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setRequestedConversationId(params.get("conversationId") || "");
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
    if (!user) {
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

    const settleBootstrap = () => {
      if (bootstrapResolved) {
        return;
      }

      bootstrapResolved = true;
      if (bootstrapTimeoutId && typeof window !== "undefined") {
        window.clearTimeout(bootstrapTimeoutId);
      }
      setLoading(false);
    };

    const unsubscribeConversations = subscribeToUserConversations(
      user.uid,
      (nextConversations) => {
        setConversations(nextConversations);
        settleBootstrap();
      },
      (error) => {
        console.error("Error subscribing to conversations:", error);
        setLoadError(discoveryUi.loadError);
        settleBootstrap();
      }
    );

    let isActive = true;

    getDiscoverableUsers({
      excludeUserId: user.uid,
      limitCount: 120,
    })
      .then((discoverableUsers) => {
        if (!isActive) {
          return;
        }

        setMembers(Array.isArray(discoverableUsers) ? discoverableUsers : []);
      })
      .catch((error) => {
        console.error("Error loading member directory:", error);
        if (!isActive) {
          return;
        }

        setLoadError((previous) => previous || discoveryUi.loadError);
      });

    const unsubscribeRequests = subscribeToUserConversationRequests(
      user.uid,
      (nextRequests) => {
        setConversationRequests(nextRequests);
      },
      (error) => {
        console.error("Error subscribing to conversation requests:", error);
        setLoadError((previous) => previous || discoveryUi.loadError);
      }
    );

    const unsubscribeBlockedUsers = subscribeToBlockedUsers(
      user.uid,
      (nextBlockedUserIds) => {
        setBlockedUserIds(nextBlockedUserIds);
      },
      (error) => {
        console.error("Error subscribing to blocked users:", error);
        setLoadError((previous) => previous || discoveryUi.loadError);
      }
    );

    const unsubscribeConversationSafety = subscribeToUserConversationSafetySettings(
      user.uid,
      (nextSettings) => {
        setConversationSafetySettings(nextSettings);
      },
      (error) => {
        console.error("Error subscribing to conversation safety settings:", error);
        setLoadError((previous) => previous || discoveryUi.loadError);
      }
    );

    return () => {
      isActive = false;
      if (bootstrapTimeoutId && typeof window !== "undefined") {
        window.clearTimeout(bootstrapTimeoutId);
      }
      unsubscribeConversations();
      unsubscribeRequests();
      unsubscribeBlockedUsers();
      unsubscribeConversationSafety();
    };
  }, [discoveryUi.loadError, discoveryUi.loadTimeout, user]);

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
      const result = await createConversationRequest({
        fromUserId: user.uid,
        toUserId: targetUserId,
      });

      if (result.status === "existing_conversation") {
        if (result.conversationId) {
          await hideConversationForUser(user.uid, result.conversationId, false);
        }
        const existingConversation = conversations.find((conversation) => conversation.id === result.conversationId);
        if (existingConversation) {
          setSelectedConversation(existingConversation);
        }
        setRequestedConversationId(result.conversationId || "");
      } else {
        openRequestDialog({
          tone: result.status === "pending" ? "info" : "success",
          title: result.status === "pending" ? discoveryUi.dialogInfoTitle : discoveryUi.dialogSuccessTitle,
          message: result.status === "pending" ? discoveryUi.requestPending : discoveryUi.requestCreated,
        });
      }
    } catch (error) {
      console.error("Error creating conversation request:", error);
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
  const visibleConversations = conversations.filter((conversation) => {
    const safetyState = conversationSafetyById.get(conversation.id);
    const otherParticipantId = getOtherParticipant(conversation);
    return !safetyState?.hidden && !blockedUserIds.includes(otherParticipantId);
  });
  const visibleConversationRequests = conversationRequests.filter(
    (request) => !blockedUserIds.includes(getOtherRequestParticipant(request))
  );
  const requestMap = new Map(visibleConversationRequests.map((request) => [getOtherRequestParticipant(request), request]));
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
  const sidebarSectionClass = "rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-4 shadow-sm";
  const sidebarSummaryCardClass = "rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm";

  return (
    <>
      <div className="flex h-[calc(100vh-8rem)] gap-4 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      {/* Conversations List */}
      <div className={`w-full max-w-sm min-w-0 flex-col border-r border-slate-200 bg-white ${selectedConversation ? "hidden lg:flex" : "flex"}`}>
        <div className="border-b border-slate-200 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-xl font-semibold">{t("messages")}</h1>
              <p className="text-sm text-slate-500">
                {onlineMembersCount} {discoveryUi.onlineNow}
              </p>
            </div>
            <Badge variant="secondary" className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
              {visibleConversations.length + visibleConversationRequests.length}
            </Badge>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className={sidebarSummaryCardClass}>
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                <span>{discoveryUi.requestsTitle}</span>
              </div>
              <p className="mt-2 text-lg font-semibold text-slate-900">{visibleConversationRequests.length}</p>
            </div>
            <div className={sidebarSummaryCardClass}>
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                <MessageCircle className="h-3.5 w-3.5" />
                <span>{discoveryUi.discussionsTitle}</span>
              </div>
              <p className="mt-2 text-lg font-semibold text-slate-900">{visibleConversations.length}</p>
            </div>
            <div className={sidebarSummaryCardClass}>
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                <User className="h-3.5 w-3.5" />
                <span>{discoveryUi.membersTitle}</span>
              </div>
              <p className="mt-2 text-lg font-semibold text-slate-900">{directoryMembers.length}</p>
            </div>
          </div>
        </div>
        
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {loadError ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {loadError}
            </div>
          ) : null}

          <div className={sidebarSectionClass}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-800">{discoveryUi.requestsTitle}</h2>
              </div>
              <Badge variant="secondary" className="rounded-full bg-white">{visibleConversationRequests.length}</Badge>
            </div>

            {visibleConversationRequests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                {discoveryUi.noRequests}
              </div>
            ) : (
              <div className="space-y-3">
                {visibleConversationRequests.map((request) => {
                  const isIncoming = request.recipientId === user.uid;
                  const otherParticipantId = getOtherRequestParticipant(request);
                  const matchingConversation = allDirectConversationMap.get(otherParticipantId);

                  return (
                    <div key={request.id} className="overflow-hidden rounded-2xl border border-slate-200 p-3">
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

          <div className={sidebarSectionClass}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-800">{discoveryUi.discussionsTitle}</h2>
              </div>
              <Badge variant="secondary" className="rounded-full bg-white">{visibleConversations.length}</Badge>
            </div>

          {loading ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-center text-slate-400">{t("loadingConversations")}</div>
          ) : visibleConversations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center">
              <MessageCircle className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">{t("noMessages")}</p>
            </div>
          ) : (
            <div className="space-y-3">
            {visibleConversations.map((conv) => {
              const otherId = getOtherParticipant(conv);
              const unreadCount = conv.unreadCount?.[user.uid] || 0;
              const isItemRelated = conv.itemInfo;
              const otherMember = membersById.get(otherId);
              const isOtherTyping = isParticipantTyping(conv, otherId);
              const displayName = getConversationDisplayName(conv, otherMember);
              const displayPhoto = getConversationDisplayPhoto(conv, otherMember);
              const safetyState = conversationSafetyById.get(conv.id);
              
              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`flex cursor-pointer gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50 ${
                    selectedConversation?.id === conv.id ? "border-rose-200 bg-rose-50" : ""
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
                      <p className={`truncate text-sm ${isOtherTyping ? "font-medium italic text-[#9B2335]" : "text-slate-500"}`}>
                        {isOtherTyping ? discoveryUi.typingNow : (conv.lastMessage || t("startConversation"))}
                      </p>
                    </div>
                    
                    <p className="mt-1 text-xs text-slate-400">
                      {conv.lastMessageTime ? formatDate(conv.lastMessageTime) : ""}
                    </p>
                  </div>
                </div>
              );
            })}
            </div>
          )}
          </div>

          <div className={sidebarSectionClass}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-800">{discoveryUi.membersTitle}</h2>
              </div>
              <Badge variant="secondary" className="rounded-full bg-white">{directoryMembers.length}</Badge>
            </div>

            {directoryMembers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                {discoveryUi.memberListEmpty}
              </div>
            ) : (
              <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                {directoryMembers.map((member) => {
                  const matchingConversation = allDirectConversationMap.get(member.id);
                  const pendingRequest = requestMap.get(member.id);
                  const matchingConversationSafety = matchingConversation
                    ? conversationSafetyById.get(matchingConversation.id)
                    : null;

                  return (
                    <div key={member.id} className="overflow-hidden rounded-2xl border border-slate-200 p-3">
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
                            ) : pendingRequest ? (
                              <Badge variant="secondary" className="w-fit max-w-full rounded-full">{discoveryUi.pending}</Badge>
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
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex-col bg-white ${selectedConversation ? "flex" : "hidden lg:flex"}`}>
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
            <div className="border-b p-4">
              <div className="flex items-center gap-3">
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

                <div className="flex flex-wrap justify-end gap-2">
                  {selectedConversationSafety.muted && (
                    <Badge variant="secondary" className="rounded-full">{discoveryUi.mutedBadge}</Badge>
                  )}
                  {selectedConversationBlocked && (
                    <Badge variant="secondary" className="rounded-full">{discoveryUi.blockedBadge}</Badge>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => handleToggleMute(selectedConversation.id, !selectedConversationSafety.muted)}
                    disabled={safetyActionLoading === `mute:${selectedConversation.id}`}
                  >
                    {selectedConversationSafety.muted ? discoveryUi.unmuteConversation : discoveryUi.muteConversation}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => handleToggleConversationVisibility(selectedConversation.id, true)}
                    disabled={safetyActionLoading === `hide:${selectedConversation.id}`}
                  >
                    {discoveryUi.hideConversation}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => handleReportUser(selectedConversationOtherId, selectedConversation.id)}
                    disabled={safetyActionLoading === `report:${selectedConversationOtherId}`}
                  >
                    {discoveryUi.reportUser}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => handleToggleBlock(selectedConversationOtherId, selectedConversationBlocked)}
                    disabled={safetyActionLoading === `block:${selectedConversationOtherId}`}
                  >
                    {selectedConversationBlocked ? discoveryUi.unblock : discoveryUi.blocked}
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
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
                          className={`max-w-xs rounded-2xl px-4 py-2 lg:max-w-md ${
                            isMe
                              ? "bg-gradient-to-r from-[#9B2335] to-[#7B1A2C] text-white"
                              : "bg-slate-100 text-slate-800"
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
            <div className="border-t p-4 space-y-3">
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
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    {discoveryUi.emojiPickerTitle}
                  </div>
                  <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="flex h-10 items-center justify-center rounded-xl bg-white text-xl shadow-sm transition hover:scale-105 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
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
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowImageShare(!showImageShare)}
                  className="rounded-xl"
                  disabled={sending || selectedConversationSendDisabled}
                >
                  📷
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEmojiPicker((current) => !current)}
                  className="rounded-xl"
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
                  className="flex-1 rounded-xl"
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
              <MessageCircle className="mx-auto h-12 w-12 text-slate-300" />
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
