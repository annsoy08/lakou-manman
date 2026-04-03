import {
  collection,
  doc,
  addDoc,
  getCountFromServer,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  limitToLast,
  startAfter,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  writeBatch,
  onSnapshot,
  runTransaction,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "./firebase";
import { DOCTOR_SPECIALTY_STARTER_PROFILES, findStarterDoctorUserMatch } from "./doctor-specialty-content";

const defaultVaccinationProfile = {
  childName: "",
  birthDate: "",
  notes: "",
  records: {},
};
const ONLINE_PRESENCE_TTL_MS = 75 * 1000;
const CONVERSATION_REQUEST_COOLDOWN_MS = 60 * 1000;
const MESSAGE_MIN_INTERVAL_MS = 1500;
const DUPLICATE_MESSAGE_WINDOW_MS = 30 * 1000;
const USER_PRESENCE_PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;
const userPresenceProfileExistenceCache = new Map();

function sanitizeVaccinationProfile(data = {}) {
  return {
    ...defaultVaccinationProfile,
    ...(data && typeof data === "object" ? data : {}),
    records: data?.records && typeof data.records === "object" && !Array.isArray(data.records)
      ? data.records
      : {},
  };
}

function buildParticipantsKey(participants = []) {
  return [...new Set(participants.filter(Boolean))].sort().join("__");
}

function getTimestampValue(timestamp) {
  return typeof timestamp?.toMillis === "function" ? timestamp.toMillis() : 0;
}

function sortByCreatedAtDesc(items = []) {
  return [...items].sort(
    (a, b) => getTimestampValue(b?.createdAt) - getTimestampValue(a?.createdAt)
  );
}

function normalizeRequestedLimit(value, fallback = 24, max = 100) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
}

function getGroupActivityTimestamp(group = {}) {
  return getTimestampValue(group?.updatedAt) || getTimestampValue(group?.createdAt);
}

function sortGroupsByActivity(groups = []) {
  return [...groups].sort((a, b) => {
    const timestampDifference = getGroupActivityTimestamp(b) - getGroupActivityTimestamp(a);
    if (timestampDifference !== 0) {
      return timestampDifference;
    }

    return String(a?.name || a?.id || "").localeCompare(String(b?.name || b?.id || ""), "fr", {
      sensitivity: "base",
    });
  });
}

function isFirestoreQueryIndexError(error) {
  const code = String(error?.code || "").trim().toLowerCase();
  const message = String(error?.message || "").trim().toLowerCase();

  return code === "failed-precondition"
    || code === "firestore/failed-precondition"
    || message.includes("index");
}

function isTransientFirestoreNetworkError(error) {
  const code = String(error?.code || "").trim().toLowerCase();
  const message = String(error?.message || "").trim().toLowerCase();

  return code === "unavailable"
    || code === "firestore/unavailable"
    || code === "failed-precondition"
    || message.includes("offline")
    || message.includes("network")
    || message.includes("name_not_resolved")
    || message.includes("err_name_not_resolved")
    || message.includes("could not reach cloud firestore backend")
    || message.includes("client is offline");
}

function chunkValues(values = [], chunkSize = 10) {
  const normalizedValues = Array.isArray(values) ? values : [];
  const normalizedChunkSize = Math.max(1, Number.parseInt(String(chunkSize ?? "10"), 10) || 10);
  const chunks = [];

  for (let index = 0; index < normalizedValues.length; index += normalizedChunkSize) {
    chunks.push(normalizedValues.slice(index, index + normalizedChunkSize));
  }

  return chunks;
}

function normalizeUserModerationStatus(value = "") {
  const normalized = String(value || "").trim().toLowerCase();

  if (["review", "under_review", "pending_review"].includes(normalized)) {
    return "under_review";
  }

  if (["restricted", "limited", "warning"].includes(normalized)) {
    return "restricted";
  }

  if (["suspended", "banned", "disabled"].includes(normalized)) {
    return "suspended";
  }

  return normalized || "active";
}

function normalizeShopCartNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function normalizeUserShopCartItem(item = {}) {
  return {
    id: String(item?.id || "").trim(),
    title: String(item?.title || item?.name || "").trim(),
    price: normalizeShopCartNumber(item?.price),
    imageUrl: String(item?.imageUrl || item?.images?.[0]?.url || "").trim(),
    condition: String(item?.condition || "").trim(),
    sellerName: String(item?.sellerName || item?.authorName || "").trim(),
    shopName: String(item?.shopName || "").trim(),
    status: String(item?.status || "available").trim().toLowerCase() || "available",
    addedAt: String(item?.addedAt || "").trim() || new Date(0).toISOString(),
  };
}

function normalizeUserShopCart(cartItems = []) {
  return (Array.isArray(cartItems) ? cartItems : [])
    .map((item) => normalizeUserShopCartItem(item))
    .filter((item) => item.id)
    .sort((a, b) => String(b?.addedAt || "").localeCompare(String(a?.addedAt || "")));
}

function normalizeDoctorLanguages(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function readPresenceProfileExistence(uid = "") {
  const cached = userPresenceProfileExistenceCache.get(uid);

  if (!cached) {
    return null;
  }

  if (Date.now() - cached.checkedAt > USER_PRESENCE_PROFILE_CACHE_TTL_MS) {
    userPresenceProfileExistenceCache.delete(uid);
    return null;
  }

  return cached.exists;
}

function writePresenceProfileExistence(uid = "", exists = false) {
  if (!uid) {
    return;
  }

  userPresenceProfileExistenceCache.set(uid, {
    exists: Boolean(exists),
    checkedAt: Date.now(),
  });
}

function buildDoctorProfilePayload(data = {}, editorUserId = "") {
  const displayName = String(
    data.displayName
    || data.name
    || data.fullName
    || data.doctorName
    || ""
  ).trim();
  const specialty = String(data.specialty || "").trim();
  const normalizedEditorUserId = String(data.editorUserId || editorUserId || "").trim();
  const slugSource = String(data.slug || displayName || normalizedEditorUserId || "doctor").trim().toLowerCase();

  return {
    displayName,
    specialty,
    headline: String(data.headline || "").trim(),
    bio: String(data.bio || "").trim(),
    city: String(data.city || "").trim(),
    country: String(data.country || "").trim(),
    location: String(data.location || "").trim(),
    languages: normalizeDoctorLanguages(data.languages),
    phone: String(data.phone || "").trim(),
    whatsapp: String(data.whatsapp || "").trim(),
    email: String(data.email || "").trim().toLowerCase(),
    bookingUrl: String(data.bookingUrl || "").trim(),
    videoUrl: String(data.videoUrl || "").trim(),
    videoTitle: String(data.videoTitle || "").trim(),
    photo: String(data.photo || "").trim(),
    yearsOfExperience: String(data.yearsOfExperience || "").trim(),
    education: String(data.education || "").trim(),
    licenseNumber: String(data.licenseNumber || "").trim(),
    consultationModes: normalizeDoctorLanguages(data.consultationModes),
    editorUserId: normalizedEditorUserId,
    published: data.published !== false,
    featured: Boolean(data.featured),
    slug: slugSource
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      || "doctor",
  };
}

function buildDoctorArticlePayload(data = {}, editorUserId = "") {
  return {
    title: String(data.title || "").trim(),
    text: String(data.text || data.body || "").trim(),
    body: String(data.body || data.text || "").trim(),
    excerpt: String(data.excerpt || "").trim(),
    category: String(data.category || "").trim(),
    authorId: String(data.authorId || editorUserId || "").trim(),
    authorName: String(data.authorName || "").trim(),
    authorSpecialty: String(data.authorSpecialty || data.specialty || "").trim(),
    validated: data.validated !== false,
    published: data.published !== false,
  };
}

function buildDoctorVideoPayload(data = {}, editorUserId = "") {
  return {
    title: String(data.title || "").trim(),
    url: String(data.url || data.videoUrl || "").trim(),
    description: String(data.description || data.text || data.body || "").trim(),
    category: String(data.category || "").trim(),
    authorId: String(data.authorId || editorUserId || "").trim(),
    authorName: String(data.authorName || "").trim(),
    authorSpecialty: String(data.authorSpecialty || data.specialty || "").trim(),
    validated: data.validated !== false,
    published: data.published !== false,
  };
}

function buildUserBlockId(userId, targetUserId) {
  return `${userId || ""}_${targetUserId || ""}`;
}

function buildConversationSafetySettingId(userId, conversationId) {
  return `${userId || ""}_${conversationId || ""}`;
}

function isMessagingRestrictedProfile(profile = {}) {
  const moderationStatus = normalizeUserModerationStatus(profile?.moderationStatus);
  return Boolean(profile?.messagingRestricted) || ["restricted", "suspended"].includes(moderationStatus);
}

async function createModerationLogEntry({ actorUserId = "", action = "", targetType = "", targetId = "", details = {} } = {}) {
  const firestore = resolveDb();
  if (!firestore || !action || !targetType || !targetId) {
    return;
  }

  try {
    await addDoc(collection(firestore, "moderationLogs"), {
      actorUserId: actorUserId || "",
      action,
      targetType,
      targetId,
      details: details && typeof details === "object" ? details : {},
      createdAt: serverTimestamp(),
    });
  } catch {
  }
}

async function getInteractionBlockStatus(userId, targetUserId) {
  const firestore = resolveDb();
  if (!firestore || !userId || !targetUserId) {
    return { blocked: false, direction: "none" };
  }

  const [directBlockSnap, reverseBlockSnap] = await Promise.all([
    getDocs(query(collection(firestore, "userBlocks"), where("userId", "==", userId), limit(25))),
    getDocs(query(collection(firestore, "userBlocks"), where("targetUserId", "==", userId), limit(25))),
  ]);

  const hasDirectBlock = directBlockSnap.docs.some((blockDoc) => String(blockDoc.data()?.targetUserId || "").trim() === targetUserId);
  const hasReverseBlock = reverseBlockSnap.docs.some((blockDoc) => String(blockDoc.data()?.userId || "").trim() === targetUserId);

  if (hasDirectBlock) {
    return { blocked: true, direction: "outgoing" };
  }

  if (hasReverseBlock) {
    return { blocked: true, direction: "incoming" };
  }

  return { blocked: false, direction: "none" };
}

async function assertUsersCanInteract(userId, targetUserId) {
  if (!userId || !targetUserId) {
    return;
  }

  const [blockStatus, userProfile, targetProfile] = await Promise.all([
    getInteractionBlockStatus(userId, targetUserId),
    getUserProfile(userId),
    getUserProfile(targetUserId),
  ]);

  if (blockStatus.blocked) {
    throw new Error(blockStatus.direction === "incoming" ? "blocked_by_user" : "blocked_user");
  }

  if (isMessagingRestrictedProfile(userProfile)) {
    throw new Error("sender_messaging_restricted");
  }

  if (isMessagingRestrictedProfile(targetProfile)) {
    throw new Error("recipient_messaging_restricted");
  }
}

async function assertConversationRequestNotRateLimited(existingRequestSnap, fromUserId) {
  if (!existingRequestSnap?.exists() || !fromUserId) {
    return;
  }

  const existingRequest = existingRequestSnap.data() || {};
  const existingRequestTime = getTimestampValue(existingRequest.updatedAt || existingRequest.createdAt);

  if (
    existingRequest.requesterId === fromUserId
    && existingRequest.status !== "pending"
    && existingRequestTime > 0
    && Date.now() - existingRequestTime < CONVERSATION_REQUEST_COOLDOWN_MS
  ) {
    throw new Error("conversation_request_rate_limited");
  }
}

async function assertMessageNotSpam(firestore, conversationId, senderId, content, data = {}) {
  if (!firestore || !conversationId || !senderId) {
    return;
  }

  const latestMessageQuery = query(
    collection(firestore, "conversations", conversationId, "messages"),
    orderBy("timestamp", "desc"),
    limit(1)
  );
  const latestMessageSnap = await getDocs(latestMessageQuery);
  const latestMessage = latestMessageSnap.docs[0]?.data();

  if (!latestMessage || latestMessage.senderId !== senderId) {
    return;
  }

  const latestMessageTimestamp = getTimestampValue(latestMessage.timestamp);
  if (latestMessageTimestamp <= 0) {
    return;
  }

  const now = Date.now();
  if (now - latestMessageTimestamp < MESSAGE_MIN_INTERVAL_MS) {
    throw new Error("message_rate_limited");
  }

  const normalizedContent = typeof content === "string" ? content.trim() : "";
  const latestContent = typeof latestMessage.content === "string" ? latestMessage.content.trim() : "";
  const nextType = String(data?.type || "text").trim().toLowerCase();
  const latestType = String(latestMessage.type || "text").trim().toLowerCase();

  if (
    normalizedContent
    && normalizedContent === latestContent
    && nextType === latestType
    && now - latestMessageTimestamp < DUPLICATE_MESSAGE_WINDOW_MS
  ) {
    throw new Error("duplicate_message");
  }
}

function normalizeUserPresence(profile = {}) {
  const lastActiveAt = getTimestampValue(profile?.lastActiveAt || profile?.lastSeenAt);
  const isPresenceFresh = lastActiveAt > 0 && Date.now() - lastActiveAt <= ONLINE_PRESENCE_TTL_MS;

  return {
    ...profile,
    isOnline: Boolean(profile?.isOnline) && isPresenceFresh,
  };
}

function resolveDb() {
  return getFirebaseDb();
}

function requireDb() {
  const firestore = resolveDb();
  if (!firestore) {
    throw new Error("Firestore not available");
  }
  return firestore;
}

function normalizeShopOrderPaymentStatus(value = "") {
  const normalized = String(value || "").trim().toLowerCase();

  if (["paid", "completed", "success", "succeeded"].includes(normalized)) {
    return "completed";
  }

  if (["failed", "failure", "error", "declined"].includes(normalized)) {
    return "failed";
  }

  if (["refunded", "refund"].includes(normalized)) {
    return "refunded";
  }

  if (["cancelled", "canceled"].includes(normalized)) {
    return "cancelled";
  }

  if (["pending", "processing", "initiated"].includes(normalized)) {
    return "pending";
  }

  return normalized || "pending";
}

function normalizeShopOrderSupportStatus(value = "") {
  const normalized = String(value || "").trim().toLowerCase();

  if (["resolved", "done", "closed", "complete"].includes(normalized)) {
    return "resolved";
  }

  if (["monitoring", "pending", "followup", "follow_up"].includes(normalized)) {
    return "monitoring";
  }

  if (["action_required", "issue", "attention", "needs_attention"].includes(normalized)) {
    return "action_required";
  }

  if (["refunded", "refund"].includes(normalized)) {
    return "refunded";
  }

  return normalized || "none";
}

function getDefaultSupportStatusFromPaymentStatus(status = "", isRealMonCash = false) {
  const normalizedStatus = normalizeShopOrderPaymentStatus(status);

  if (normalizedStatus === "completed") {
    return "resolved";
  }

  if (normalizedStatus === "refunded") {
    return "refunded";
  }

  if (["failed", "cancelled"].includes(normalizedStatus)) {
    return "action_required";
  }

  if (normalizedStatus === "pending" && isRealMonCash) {
    return "monitoring";
  }

  return "none";
}

function normalizeShopOrderFulfillmentStatus(value = "") {
  const normalized = String(value || "").trim().toLowerCase();

  if (["awaiting_payment", "payment_pending", "pending_payment"].includes(normalized)) {
    return "awaiting_payment";
  }

  if (["confirmed", "payment_confirmed", "paid"].includes(normalized)) {
    return "confirmed";
  }

  if (["preparing", "processing", "packing"].includes(normalized)) {
    return "preparing";
  }

  if (["ready_for_pickup", "ready", "pickup_ready"].includes(normalized)) {
    return "ready_for_pickup";
  }

  if (["in_delivery", "shipping", "shipped", "in_transit"].includes(normalized)) {
    return "in_delivery";
  }

  if (["delivered", "completed_delivery"].includes(normalized)) {
    return "delivered";
  }

  if (["cancelled", "canceled"].includes(normalized)) {
    return "cancelled";
  }

  if (["refund_requested", "refund_pending"].includes(normalized)) {
    return "refund_requested";
  }

  if (["refunded", "refund_complete"].includes(normalized)) {
    return "refunded";
  }

  return normalized || "awaiting_payment";
}

function getDefaultFulfillmentStatusFromPaymentStatus(status = "") {
  const normalizedStatus = normalizeShopOrderPaymentStatus(status);

  if (normalizedStatus === "completed") {
    return "confirmed";
  }

  if (normalizedStatus === "refunded") {
    return "refunded";
  }

  if (normalizedStatus === "cancelled") {
    return "cancelled";
  }

  return "awaiting_payment";
}

function shouldPreserveExistingShopOrderStatus(currentStatus = "", nextStatus = "") {
  const normalizedCurrentStatus = normalizeShopOrderPaymentStatus(currentStatus);
  const normalizedNextStatus = normalizeShopOrderPaymentStatus(nextStatus);

  if (!normalizedNextStatus || normalizedCurrentStatus === normalizedNextStatus) {
    return false;
  }

  if (["completed", "refunded", "cancelled"].includes(normalizedCurrentStatus)) {
    return ["pending", "failed"].includes(normalizedNextStatus);
  }

  if (normalizedCurrentStatus === "failed") {
    return normalizedNextStatus === "pending";
  }

  return false;
}

function normalizeShopOrderProofStatus(value = "") {
  const normalized = String(value || "").trim().toLowerCase();

  if (["missing", "absent"].includes(normalized)) {
    return "missing";
  }

  if (["pending", "awaiting", "to_review", "review_pending"].includes(normalized)) {
    return "pending";
  }

  if (["provided", "submitted", "received"].includes(normalized)) {
    return "provided";
  }

  if (["verified", "confirmed", "validated"].includes(normalized)) {
    return "verified";
  }

  if (["rejected", "invalid"].includes(normalized)) {
    return "rejected";
  }

  return normalized || "pending";
}

export async function updateShopOrderByTransactionId(transactionId, data = {}) {
  const existingOrder = await getShopOrderByTransactionId(transactionId);
  if (!existingOrder?.id) {
    return null;
  }

  const normalizedExistingStatus = normalizeShopOrderPaymentStatus(
    existingOrder.paymentStatus || existingOrder.status || ""
  );
  const normalizedIncomingStatus = normalizeShopOrderPaymentStatus(
    data.paymentStatus ?? data.status ?? ""
  );
  const nextData = {
    ...data,
    realMonCash: data.realMonCash ?? existingOrder.realMonCash,
  };

  if (shouldPreserveExistingShopOrderStatus(normalizedExistingStatus, normalizedIncomingStatus)) {
    delete nextData.paymentStatus;
    delete nextData.status;
    delete nextData.supportStatus;
    delete nextData.fulfillmentStatus;
  }

  await updateShopOrder(existingOrder.id, nextData);

  return { id: existingOrder.id, ...existingOrder, ...nextData };
}

// ─── Messagerie ─────────────────────────────────────────────
export async function createConversation(data) {
  const firestore = requireDb();
  if (Array.isArray(data)) {
    const participants = data;
    const itemInfo = normalizeConversationItemInfo(arguments[1] || null);
    const existingConversation = await findExistingDirectConversation(participants);
    const { participantNames, participantPhotos } = await getParticipantMetadata(participants);

    if (existingConversation) {
      return existingConversation.id;
    }

    const ref = await addDoc(collection(firestore, "conversations"), {
      participants,
      participantsKey: buildParticipantsKey(participants),
      participantNames,
      participantPhotos,
      itemInfo,
      type: itemInfo?.type === "boutique" ? "boutique" : "direct",
      lastMessage: null,
      lastMessageSenderId: "",
      lastMessageSenderName: "",
      lastMessageType: "",
      lastMessageTime: serverTimestamp(),
      unreadCount: Object.fromEntries(participants.map((participantId) => [participantId, 0])),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  const participants = data.participants || [];
  const participantMetadata = participants.length > 0
    ? await getParticipantMetadata(participants)
    : { participantNames: {}, participantPhotos: {} };
  const ref = await addDoc(collection(firestore, "conversations"), {
    ...data,
    type: data.type || "direct",
    participantsKey: participants.length > 0 ? buildParticipantsKey(participants) : null,
    participantNames: data.participantNames || participantMetadata.participantNames,
    participantPhotos: data.participantPhotos || participantMetadata.participantPhotos,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessage: null,
    lastMessageSenderId: "",
    lastMessageSenderName: "",
    lastMessageType: "",
    lastMessageTime: null,
    unreadCount: data.unreadCount || Object.fromEntries(participants.map((participantId) => [participantId, 0])),
    groupName: data.groupName || null,
    groupDescription: data.groupDescription || null,
    groupIcon: data.groupIcon || null,
    admins: data.admins || [],
    members: data.members || [],
  });
  return ref.id;
}

export async function sendMessage(conversationId, senderId, content, data = {}) {
  const firestore = requireDb();

  let conversation = null;
  try {
    const conversationDoc = await getDoc(doc(firestore, "conversations", conversationId));
    if (conversationDoc.exists()) {
      conversation = conversationDoc.data();
    } else {
      throw new Error("Conversation not found");
    }
  } catch (err) {
    if (String(err?.message || "").includes("Conversation not found")) {
      throw err;
    }
    console.warn("sendMessage: conversation pre-read failed (non-blocking):", err?.code || err?.message);
  }

  const recipientId = conversation?.participants?.find((id) => id !== senderId);

  if (recipientId) {
    try {
      await assertUsersCanInteract(senderId, recipientId);
    } catch (interactErr) {
      const HARD_INTERACT_ERRORS = ["blocked_user", "blocked_by_user", "sender_messaging_restricted", "recipient_messaging_restricted"];
      if (HARD_INTERACT_ERRORS.includes(String(interactErr?.message || "").trim())) {
        throw interactErr;
      }
      console.warn("sendMessage: interaction check failed (non-blocking):", interactErr?.message);
    }
  }

  try {
    await assertMessageNotSpam(firestore, conversationId, senderId, content, data);
  } catch (spamErr) {
    const HARD_SPAM_ERRORS = ["message_rate_limited", "duplicate_message"];
    if (HARD_SPAM_ERRORS.includes(String(spamErr?.message || "").trim())) {
      throw spamErr;
    }
    console.warn("sendMessage: spam check failed (non-blocking):", spamErr?.code || spamErr?.message);
  }

  const senderProfile = senderId ? await getUserProfile(senderId) : null;
  const senderName = [
    data.senderName,
    senderProfile?.name,
    senderProfile?.displayName,
    senderProfile?.fullName,
  ].find((value) => typeof value === "string" && value.trim()) || "Utilisateur";
  const messageData = {
    senderId,
    senderName,
    content,
    type: data.type || "text",
    timestamp: serverTimestamp(),
    read: false,
    deliveredAt: null,
    readAt: null,
    ...data // Include audioURL, images, etc.
  };

  const messageRef = await addDoc(collection(firestore, "conversations", conversationId, "messages"), messageData);

  const lastMessagePreview = (() => {
    if (typeof content === "string" && content.trim()) {
      return content.trim();
    }

    if (messageData.type === "audio") {
      return "🎤 Message vocal";
    }

    if (messageData.type === "images") {
      return "📷 Photos";
    }

    return "Nouveau message";
  })();

  updateDoc(doc(firestore, "conversations", conversationId), {
    lastMessage: lastMessagePreview,
    lastMessageSenderId: senderId,
    lastMessageSenderName: senderName,
    lastMessageType: messageData.type || "text",
    lastMessageTime: serverTimestamp(),
    [`participantNames.${senderId}`]: senderName,
    [`typingStatus.${senderId}`]: {
      isTyping: false,
      updatedAt: serverTimestamp(),
    },
    [`unreadCount.${senderId}`]: increment(0),
    ...(recipientId && { [`unreadCount.${recipientId}`]: increment(1) }),
  }).catch((error) => {
    console.warn("sendMessage: conversation metadata update failed (non-blocking):", error?.code || error?.message);
  });

  return messageRef.id;
}

export async function setConversationTypingState(conversationId, userId, isTyping) {
  const firestore = resolveDb();
  if (!firestore || !conversationId || !userId) {
    return;
  }

  await updateDoc(doc(firestore, "conversations", conversationId), {
    [`typingStatus.${userId}`]: {
      isTyping: Boolean(isTyping),
      updatedAt: serverTimestamp(),
    },
  });
}

export async function getUserConversations(userId) {
  const firestore = resolveDb();
  if (!firestore || !userId) {
    return [];
  }

  const q = query(
    collection(firestore, "conversations"),
    where("participants", "array-contains", userId),
    orderBy("lastMessageTime", "desc")
  );
  const snap = await getDocs(q);
  return await Promise.all(snap.docs.map((conversationDoc) => hydrateConversationRecord(conversationDoc)));
}

export function subscribeToUserConversations(userId, onData, onError) {
  const firestore = resolveDb();
  if (!firestore || !userId) {
    onData?.([]);
    return () => {};
  }

  const q = query(
    collection(firestore, "conversations"),
    where("participants", "array-contains", userId),
    orderBy("lastMessageTime", "desc"),
    limit(50)
  );

  return onSnapshot(
    q,
    async (snap) => {
      try {
        const conversations = await Promise.all(
          snap.docs.map((conversationDoc) => hydrateConversationRecord(conversationDoc))
        );
        onData?.(conversations);
      } catch (error) {
        onError?.(error);
      }
    },
    onError
  );
}

export async function getConversationMessages(conversationId) {
  const firestore = resolveDb();
  if (!firestore || !conversationId) {
    return [];
  }

  const q = query(
    collection(firestore, "conversations", conversationId, "messages"),
    orderBy("timestamp", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function markMessagesAsRead(conversationId, userId) {
  const firestore = resolveDb();
  if (!firestore || !conversationId || !userId) {
    return;
  }

  const messagesRef = collection(firestore, "conversations", conversationId, "messages");
  const q = query(messagesRef, where("senderId", "!=", userId), where("read", "==", false));
  const snap = await getDocs(q);
  
  const batch = writeBatch(firestore);
  snap.docs.forEach((doc) => {
    batch.update(doc.ref, {
      read: true,
      deliveredAt: doc.data()?.deliveredAt || serverTimestamp(),
      readAt: serverTimestamp(),
    });
  });
  
  await batch.commit();
  
  // Reset unread count for this user
  await updateDoc(doc(firestore, "conversations", conversationId), {
    [`unreadCount.${userId}`]: 0,
  });
}

export async function markMessagesAsDelivered(conversationId, userId) {
  const firestore = resolveDb();
  if (!firestore || !conversationId || !userId) {
    return;
  }

  const messagesRef = collection(firestore, "conversations", conversationId, "messages");
  const q = query(messagesRef, where("senderId", "!=", userId));
  const snap = await getDocs(q);

  const undeliveredDocs = snap.docs.filter((messageDoc) => !messageDoc.data()?.deliveredAt);
  if (undeliveredDocs.length === 0) {
    return;
  }

  const batch = writeBatch(firestore);
  undeliveredDocs.forEach((messageDoc) => {
    batch.update(messageDoc.ref, {
      deliveredAt: serverTimestamp(),
    });
  });

  await batch.commit();
}

// ─── Favoris ─────────────────────────────────────────────
export async function toggleFavorite(userId, itemId) {
  const firestore = requireDb();
  const favoriteRef = doc(firestore, "favorites", `${userId}_${itemId}`);
  const snap = await getDoc(favoriteRef);
  
  if (snap.exists()) {
    await deleteDoc(favoriteRef);
    return false; // Removed from favorites
  } else {
    await setDoc(favoriteRef, {
      userId,
      itemId,
      createdAt: serverTimestamp(),
    });
    return true; // Added to favorites
  }
}

export async function getUserFavorites(userId) {
  const firestore = resolveDb();
  if (!firestore || !userId) {
    return [];
  }

  const q = query(
    collection(firestore, "favorites"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data().itemId);
}

export async function isItemFavorite(userId, itemId) {
  const firestore = resolveDb();
  if (!firestore || !userId || !itemId) {
    return false;
  }

  const snap = await getDoc(doc(firestore, "favorites", `${userId}_${itemId}`));
  return snap.exists();
}

// ─── Évaluations ─────────────────────────────────────────────
export async function createReview(data) {
  const firestore = requireDb();
  const ref = await addDoc(collection(firestore, "reviews"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getUserReviews(userId) {
  const firestore = resolveDb();
  if (!firestore || !userId) {
    return [];
  }

  const q = query(
    collection(firestore, "reviews"),
    where("revieweeId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getUserRating(userId) {
  const firestore = resolveDb();
  if (!firestore || !userId) {
    return { average: 0, count: 0 };
  }

  const q = query(collection(firestore, "reviews"), where("revieweeId", "==", userId));
  const snap = await getDocs(q);
  const reviews = snap.docs.map((d) => d.data());
  
  if (reviews.length === 0) {
    return { average: 0, count: 0 };
  }
  
  const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
  return {
    average: sum / reviews.length,
    count: reviews.length,
  };
}

export async function hasUserReviewed(revieweeId, reviewerId) {
  const firestore = resolveDb();
  if (!firestore || !revieweeId || !reviewerId) {
    return false;
  }

  const q = query(
    collection(firestore, "reviews"),
    where("revieweeId", "==", revieweeId),
    where("reviewerId", "==", reviewerId)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

// ─── Recherche avancée ────────────────────────────────────
export async function searchShopItems(filters = {}) {
  const firestore = resolveDb();
  if (!firestore) {
    return [];
  }

  const normalizedCategory = String(filters.category || "").trim();
  const normalizedCondition = String(filters.condition || "").trim();
  const normalizedSellerSource = String(filters.sellerSource || "").trim();
  const normalizedShopName = String(filters.shopName || "").trim().toLowerCase();
  const normalizedLocation = String(filters.location || "").trim().toLowerCase();
  const normalizedSearchQuery = String(filters.searchQuery || "").trim().toLowerCase();
  const requestedLimit = normalizeRequestedLimit(
    filters.limitCount,
    normalizedSearchQuery || normalizedLocation ? 60 : 36,
    600
  );
  const candidatePageSize = normalizeRequestedLimit(
    filters.pageSize,
    normalizedSearchQuery || normalizedLocation
      ? Math.min(Math.max(requestedLimit, 48), 120)
      : Math.min(Math.max(requestedLimit, 36), 96),
    120
  );
  const maxServerDocuments = normalizeRequestedLimit(
    filters.maxServerDocuments,
    requestedLimit * (normalizedSearchQuery || normalizedLocation ? 8 : 5),
    2400
  );
  const shopItemsCollection = collection(firestore, "shopItems");
  const indexedConstraints = [where("status", "==", "available")];

  if (normalizedCategory && normalizedCategory !== "all") {
    indexedConstraints.push(where("category", "==", normalizedCategory));
  }

  if (normalizedCondition && normalizedCondition !== "all") {
    indexedConstraints.push(where("condition", "==", normalizedCondition));
  }

  if (["individual", "affiliate_shop"].includes(normalizedSellerSource)) {
    indexedConstraints.push(where("sellerType", "==", normalizedSellerSource));
  }

  const applyClientSideFilters = (candidateItems = []) => {
    let items = candidateItems.filter((item) => String(item.status || "available").trim().toLowerCase() === "available");

    if (normalizedCategory && normalizedCategory !== "all") {
      items = items.filter((item) => item.category === normalizedCategory);
    }

    if (normalizedCondition && normalizedCondition !== "all") {
      items = items.filter((item) => item.condition === normalizedCondition);
    }

    if (filters.minPrice) {
      items = items.filter((item) => item.price >= parseFloat(filters.minPrice));
    }

    if (filters.maxPrice) {
      items = items.filter((item) => item.price <= parseFloat(filters.maxPrice));
    }

    if (normalizedLocation) {
      items = items.filter((item) =>
        String(item.location || "").toLowerCase().includes(normalizedLocation)
      );
    }

    if (normalizedSellerSource && normalizedSellerSource !== "all") {
      items = items.filter((item) => {
        const effectiveSellerType = item.sellerType === "affiliate_shop" || String(item.shopName || "").trim()
          ? "affiliate_shop"
          : "individual";
        return effectiveSellerType === normalizedSellerSource;
      });
    }

    if (normalizedShopName) {
      items = items.filter(
        (item) => String(item.shopName || "").trim().toLowerCase() === normalizedShopName
      );
    }

    if (normalizedSearchQuery) {
      items = items.filter((item) =>
        String(item.title || "").toLowerCase().includes(normalizedSearchQuery)
        || String(item.description || "").toLowerCase().includes(normalizedSearchQuery)
        || String(item.authorName || "").toLowerCase().includes(normalizedSearchQuery)
        || String(item.shopName || "").toLowerCase().includes(normalizedSearchQuery)
      );
    }

    return items;
  };

  const queryAttempts = [
    (lastVisibleDoc) => query(
      shopItemsCollection,
      ...indexedConstraints,
      orderBy("createdAt", "desc"),
      ...(lastVisibleDoc ? [startAfter(lastVisibleDoc)] : []),
      limit(candidatePageSize)
    ),
    (lastVisibleDoc) => query(
      shopItemsCollection,
      where("status", "==", "available"),
      orderBy("createdAt", "desc"),
      ...(lastVisibleDoc ? [startAfter(lastVisibleDoc)] : []),
      limit(candidatePageSize)
    ),
    (lastVisibleDoc) => query(
      shopItemsCollection,
      ...(lastVisibleDoc ? [startAfter(lastVisibleDoc)] : []),
      limit(candidatePageSize)
    ),
  ];
  let lastError = null;

  for (let index = 0; index < queryAttempts.length; index += 1) {
    try {
      const itemsById = new Map();
      let lastVisibleDoc = null;
      let fetchedDocumentCount = 0;

      while (fetchedDocumentCount < maxServerDocuments) {
        const snap = await getDocs(queryAttempts[index](lastVisibleDoc));
        if (snap.empty) {
          break;
        }

        fetchedDocumentCount += snap.docs.length;
        lastVisibleDoc = snap.docs[snap.docs.length - 1] || null;

        snap.docs.forEach((docItem) => {
          itemsById.set(docItem.id, { id: docItem.id, ...docItem.data() });
        });

        if (applyClientSideFilters(Array.from(itemsById.values())).length >= requestedLimit) {
          break;
        }

        if (snap.docs.length < candidatePageSize) {
          break;
        }
      }

      return applyClientSideFilters(Array.from(itemsById.values())).slice(0, requestedLimit);
    } catch (error) {
      lastError = error;
      if (!isFirestoreQueryIndexError(error) && index === queryAttempts.length - 1) {
        throw error;
      }
    }
  }

  if (lastError) {
    throw lastError;
  }

  return [];
}

function toPlainRecord(docOrData) {
  if (!docOrData) {
    return null;
  }

  if (typeof docOrData.data === "function") {
    return { id: docOrData.id, ...docOrData.data() };
  }

  return docOrData;
}

 function stripUndefinedFields(record = {}) {
   return Object.fromEntries(
     Object.entries(record).filter(([, value]) => value !== undefined)
   );
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
    console.error("Error resolving Firebase ID token:", error);
    return "";
  }
}

async function triggerGroupPostEmailNotifications(postId, groupId) {
  const normalizedPostId = String(postId || "").trim();
  const normalizedGroupId = String(groupId || "").trim();
  if (!normalizedPostId || !normalizedGroupId || typeof fetch !== "function") {
    return;
  }

  const idToken = await getCurrentFirebaseIdToken();
  if (!idToken) {
    return;
  }

  try {
    const response = await fetch("/api/group-post-email", {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ postId: normalizedPostId }),
    });

    if (!response.ok) {
      const errorPayload = await response.text();
      console.error("Group post email notification request failed:", {
        status: response.status,
        body: errorPayload,
      });
    }
  } catch (error) {
    console.error("Error requesting group post email notifications:", error);
  }
}

export async function triggerChessInviteEmailNotification(gameId, recipientId) {
  const normalizedGameId = String(gameId || "").trim();
  const normalizedRecipientId = String(recipientId || "").trim();
  if (!normalizedGameId || !normalizedRecipientId || typeof fetch !== "function") {
    return false;
  }

  const idToken = await getCurrentFirebaseIdToken();
  if (!idToken) {
    return false;
  }

  try {
    const response = await fetch("/api/chess-invite-email", {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ gameId: normalizedGameId, recipientId: normalizedRecipientId }),
    });

    if (!response.ok) {
      const errorPayload = await response.text();
      console.error("Chess invite email request failed:", {
        status: response.status,
        body: errorPayload,
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error requesting chess invite email notification:", error);
    return false;
  }
}

function normalizeUserProfileRecord(profile = {}) {
  return normalizeUserPresence({
    ...profile,
    id: String(profile?.id || "").trim(),
    email: String(profile?.email || "").trim().toLowerCase(),
    name: String(profile?.name || profile?.displayName || profile?.fullName || "").trim(),
    displayName: String(profile?.displayName || profile?.name || profile?.fullName || "").trim(),
    role: String(profile?.role || "user").trim().toLowerCase() || "user",
    moderationStatus: normalizeUserModerationStatus(profile?.moderationStatus),
    messagingRestricted: Boolean(profile?.messagingRestricted),
    profileHidden: Boolean(profile?.profileHidden),
    groupPostEmailNotifications: profile?.groupPostEmailNotifications !== false,
    shopCartItems: normalizeUserShopCart(profile?.shopCartItems),
  });
}

function normalizeGroupRecord(group = {}) {
  const uniqueMembers = Array.from(
    new Set(
      [
        ...(Array.isArray(group?.members) ? group.members : []),
        ...(Array.isArray(group?.memberUserIds) ? group.memberUserIds : []),
        ...(Array.isArray(group?.adminIds) ? group.adminIds : []),
        ...(Array.isArray(group?.moderatorIds) ? group.moderatorIds : []),
        typeof group?.ownerId === "string" ? group.ownerId : "",
        typeof group?.createdBy === "string" ? group.createdBy : "",
      ].filter((value) => typeof value === "string" && value.trim())
    )
  );

  return {
    ...group,
    id: String(group?.id || "").trim(),
    name: String(group?.name || group?.title || "").trim(),
    description: String(group?.description || "").trim(),
    members: uniqueMembers,
    memberUserIds: uniqueMembers,
    membersCount: uniqueMembers.length,
    adminIds: Array.isArray(group?.adminIds) ? group.adminIds : [],
    moderatorIds: Array.isArray(group?.moderatorIds) ? group.moderatorIds : [],
  };
}

function createGroupMemberRequiredError() {
  const error = new Error("Group membership required to publish");
  error.code = "group/member-required";
  return error;
}

function createGroupPostModerationError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function createChessStageError(stage, error) {
  const wrappedError = new Error(String(error?.message || stage || "chess_stage_error").trim() || "chess_stage_error");
  wrappedError.code = String(error?.code || "").trim();
  wrappedError.chessStage = String(stage || "unknown").trim() || "unknown";
  wrappedError.cause = error;
  return wrappedError;
}

function createConversationRequestStageError(stage, error) {
  const wrappedError = new Error(String(error?.message || stage || "conversation_request_error").trim() || "conversation_request_error");
  wrappedError.code = String(error?.code || "").trim();
  wrappedError.conversationRequestStage = String(stage || "unknown").trim() || "unknown";
  wrappedError.cause = error;
  return wrappedError;
}

function normalizePostRecord(post = {}) {
  return {
    ...post,
    id: String(post?.id || "").trim(),
    title: String(post?.title || "").trim(),
    body: String(post?.body || post?.text || "").trim(),
    authorId: String(post?.authorId || "").trim(),
    authorName: String(post?.authorName || post?.author || "").trim(),
    hidden: Boolean(post?.hidden),
    reported: Boolean(post?.reported),
    pinned: Boolean(post?.pinned || post?.isPinned),
    isPinned: Boolean(post?.isPinned || post?.pinned),
    likesCount: Number(post?.likesCount || 0),
    commentsCount: Number(post?.commentsCount || 0),
    images: Array.isArray(post?.images) ? post.images : [],
    videos: Array.isArray(post?.videos) ? post.videos : [],
  };
}

function normalizeUserNotificationRecord(notification = {}) {
  return {
    ...notification,
    id: String(notification?.id || "").trim(),
    type: String(notification?.type || "system").trim(),
    title: String(notification?.title || "").trim(),
    message: String(notification?.message || "").trim(),
    link: String(notification?.link || "").trim(),
    read: Boolean(notification?.read),
    dedupeKey: String(notification?.dedupeKey || "").trim(),
    data: notification?.data && typeof notification.data === "object" ? notification.data : {},
  };
}

function normalizeConversationItemInfo(itemInfo = null) {
  if (!itemInfo || typeof itemInfo !== "object" || Array.isArray(itemInfo)) {
    return null;
  }

  return {
    ...itemInfo,
    id: String(itemInfo?.id || "").trim(),
    title: String(itemInfo?.title || itemInfo?.name || "").trim(),
    type: String(itemInfo?.type || "").trim(),
  };
}

function normalizeShopItemRecord(item = {}) {
  const sellerType = String(item?.sellerType || (item?.shopName ? "affiliate_shop" : "individual")).trim() || "individual";
  const status = String(item?.status || "available").trim().toLowerCase() || "available";

  return {
    ...item,
    id: String(item?.id || "").trim(),
    title: String(item?.title || item?.name || "").trim(),
    description: String(item?.description || "").trim(),
    price: Number(item?.price || 0),
    sellerId: String(item?.sellerId || item?.authorId || "").trim(),
    authorId: String(item?.authorId || item?.sellerId || "").trim(),
    authorName: String(item?.authorName || item?.sellerName || "").trim(),
    shopName: String(item?.shopName || "").trim(),
    location: String(item?.location || item?.city || "").trim(),
    sellerType,
    status,
    images: Array.isArray(item?.images) ? item.images : [],
  };
}

function normalizeShopOrderRecord(order = {}) {
  const paymentStatus = normalizeShopOrderPaymentStatus(order?.paymentStatus || order?.status || "pending");
  return {
    ...order,
    id: String(order?.id || "").trim(),
    transactionId: String(order?.transactionId || "").trim(),
    referenceNumber: String(order?.referenceNumber || "").trim(),
    paymentStatus,
    status: paymentStatus,
    supportStatus: normalizeShopOrderSupportStatus(
      order?.supportStatus || getDefaultSupportStatusFromPaymentStatus(paymentStatus, Boolean(order?.realMonCash))
    ),
    fulfillmentStatus: normalizeShopOrderFulfillmentStatus(
      order?.fulfillmentStatus || getDefaultFulfillmentStatusFromPaymentStatus(paymentStatus)
    ),
    paymentProofStatus: normalizeShopOrderProofStatus(order?.paymentProofStatus || order?.proofStatus || "pending"),
  };
}

async function getParticipantMetadata(participants = []) {
  const participantIds = Array.from(new Set((Array.isArray(participants) ? participants : []).filter(Boolean)));
  const profiles = await Promise.all(participantIds.map((participantId) => getUserProfile(participantId)));

  return {
    participantNames: Object.fromEntries(
      participantIds.map((participantId, index) => [
        participantId,
        profiles[index]?.name || profiles[index]?.displayName || profiles[index]?.fullName || "Utilisateur",
      ])
    ),
    participantPhotos: Object.fromEntries(
      participantIds.map((participantId, index) => [
        participantId,
        String(profiles[index]?.photo || profiles[index]?.photoURL || "").trim(),
      ])
    ),
  };
}

async function findExistingDirectConversation(participants = []) {
  const firestore = resolveDb();
  const normalizedParticipants = Array.from(new Set((Array.isArray(participants) ? participants : []).filter(Boolean)));
  if (!firestore || normalizedParticipants.length === 0) {
    return null;
  }

  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser || null;
  const currentUserId = String(currentUser?.uid || "").trim();
  const queryParticipantId = normalizedParticipants.includes(currentUserId)
    ? currentUserId
    : normalizedParticipants[0];
  const participantsKey = buildParticipantsKey(normalizedParticipants);
  if (!queryParticipantId) {
    return null;
  }

  try {
    if (typeof currentUser?.getIdToken === "function") {
      await currentUser.getIdToken();
    }

    const snap = await getDocs(
      query(collection(firestore, "conversations"), where("participants", "array-contains", queryParticipantId))
    );

    const matchingConversation = snap.docs
      .map((conversationDoc) => ({ id: conversationDoc.id, ...conversationDoc.data() }))
      .find((conversation) => {
        const conversationParticipants = Array.isArray(conversation?.participants) ? conversation.participants : [];
        return buildParticipantsKey(conversationParticipants) === participantsKey
          && String(conversation?.type || "direct").trim().toLowerCase() !== "group";
      });

    return matchingConversation || null;
  } catch (error) {
    const errorCode = String(error?.code || "").trim().toLowerCase();
    if ((errorCode === "permission-denied" || errorCode === "firestore/permission-denied") && normalizedParticipants.includes(currentUserId)) {
      return null;
    }
    throw error;
  }
}

async function hydrateConversationRecord(conversationDocOrData) {
  const conversation = toPlainRecord(conversationDocOrData);
  if (!conversation) {
    return null;
  }

  const participants = Array.isArray(conversation?.participants) ? conversation.participants.filter(Boolean) : [];
  const hasStoredNames = conversation?.participantNames && typeof conversation.participantNames === "object"
    && Object.keys(conversation.participantNames).length > 0;
  const participantMetadata = hasStoredNames
    ? { participantNames: conversation.participantNames, participantPhotos: conversation.participantPhotos || {} }
    : await getParticipantMetadata(participants);

  return {
    ...conversation,
    participantNames: {
      ...participantMetadata.participantNames,
      ...(conversation?.participantNames && typeof conversation.participantNames === "object" ? conversation.participantNames : {}),
    },
    participantPhotos: {
      ...participantMetadata.participantPhotos,
      ...(conversation?.participantPhotos && typeof conversation.participantPhotos === "object" ? conversation.participantPhotos : {}),
    },
    itemInfo: normalizeConversationItemInfo(conversation?.itemInfo),
    unreadCount: conversation?.unreadCount && typeof conversation.unreadCount === "object" ? conversation.unreadCount : {},
    typingStatus: conversation?.typingStatus && typeof conversation.typingStatus === "object" ? conversation.typingStatus : {},
  };
}

async function getCollectionRecords(collectionName, options = {}) {
  const firestore = resolveDb();
  if (!firestore) {
    return [];
  }

  const constraints = [];
  if (options.orderField) {
    constraints.push(orderBy(options.orderField, options.orderDirection || "desc"));
  }
  if (options.limitCount) {
    constraints.push(limit(normalizeRequestedLimit(options.limitCount, options.limitCount, options.limitCount)));
  }

  const snap = constraints.length > 0
    ? await getDocs(query(collection(firestore, collectionName), ...constraints))
    : await getDocs(collection(firestore, collectionName));

  return snap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
}

async function getCollectionCount(collectionName) {
  const firestore = resolveDb();
  if (!firestore) {
    return 0;
  }

  const snapshot = await getCountFromServer(collection(firestore, collectionName));
  return Number(snapshot?.data()?.count || 0);
}

function getNormalizedUserCity(user = {}) {
  return String(user?.city || user?.location || "").trim().toLowerCase();
}

export async function getMarketingHomepageStats() {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return null;
  }

  const [rawUsersResult, groupsCountResult, postsCountResult] = await Promise.allSettled([
    getCollectionRecords("users"),
    getCollectionCount("groups"),
    getCollectionCount("posts"),
  ]);

  const rejectedResults = [rawUsersResult, groupsCountResult, postsCountResult]
    .filter((result) => result.status === "rejected")
    .map((result) => result.reason);

  const fatalError = rejectedResults.find((error) => !isTransientFirestoreNetworkError(error));
  if (fatalError) {
    throw fatalError;
  }

  const rawUsers = rawUsersResult.status === "fulfilled" ? rawUsersResult.value : [];
  const groupsCount = groupsCountResult.status === "fulfilled" ? groupsCountResult.value : 0;
  const postsCount = postsCountResult.status === "fulfilled" ? postsCountResult.value : 0;

  const visibleUsers = rawUsers
    .map((user) => normalizeUserProfileRecord(user))
    .filter((user) => user.id)
    .filter((user) => !user.profileHidden)
    .filter((user) => normalizeUserModerationStatus(user.moderationStatus) !== "suspended");

  const citiesCount = new Set(
    visibleUsers
      .map((user) => getNormalizedUserCity(user))
      .filter(Boolean)
  ).size;

  return {
    membersCount: visibleUsers.length,
    exchangesCount: postsCount,
    citiesCount,
    groupsCount,
  };
}

export async function createUserProfile(uid, data = {}) {
  const firestore = requireDb();
  const normalizedUid = String(uid || "").trim();
  if (!normalizedUid) {
    throw new Error("Missing user id");
  }

  const payload = stripUndefinedFields(normalizeUserProfileRecord({
    id: normalizedUid,
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastActiveAt: serverTimestamp(),
    isOnline: Boolean(data?.isOnline),
  }));

  await setDoc(doc(firestore, "users", normalizedUid), payload, { merge: true });
  writePresenceProfileExistence(normalizedUid, true);
  return normalizedUid;
}

export async function getUserProfile(uid) {
  const firestore = resolveDb();
  const normalizedUid = String(uid || "").trim();
  if (!firestore || !normalizedUid) {
    return null;
  }

  const snap = await getDoc(doc(firestore, "users", normalizedUid));
  if (!snap.exists()) {
    writePresenceProfileExistence(normalizedUid, false);
    return null;
  }

  writePresenceProfileExistence(normalizedUid, true);
  return normalizeUserProfileRecord({ id: snap.id, ...snap.data() });
}

export async function getUserShopCart(uid) {
  const profile = await getUserProfile(uid);
  return normalizeUserShopCart(profile?.shopCartItems);
}

export async function updateUserProfile(uid, data = {}) {
  const firestore = requireDb();
  const normalizedUid = String(uid || "").trim();
  if (!normalizedUid) {
    throw new Error("Missing user id");
  }

  await setDoc(doc(firestore, "users", normalizedUid), stripUndefinedFields({
    ...(data && typeof data === "object" ? data : {}),
    updatedAt: serverTimestamp(),
  }), { merge: true });
}

export async function updateUserShopCart(uid, cartItems = []) {
  const firestore = requireDb();
  const normalizedUid = String(uid || "").trim();
  if (!normalizedUid) {
    throw new Error("Missing user id");
  }

  const normalizedCartItems = normalizeUserShopCart(cartItems);
  await setDoc(doc(firestore, "users", normalizedUid), {
    shopCartItems: normalizedCartItems,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  writePresenceProfileExistence(normalizedUid, true);
  return normalizedCartItems;
}

export async function updateUserPresence(uid, data = {}) {
  const firestore = requireDb();
  const normalizedUid = String(uid || "").trim();
  if (!normalizedUid) {
    throw new Error("Missing user id");
  }

  writePresenceProfileExistence(normalizedUid, true);
  await setDoc(doc(firestore, "users", normalizedUid), {
    isOnline: Boolean(data?.isOnline),
    lastActiveAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function getAllUsers() {
  const users = await getCollectionRecords("users");
  return sortByCreatedAtDesc(users.map((user) => normalizeUserProfileRecord(user)));
}

export async function getDiscoverableUsers(options = {}) {
  const result = await getDiscoverableUsersPage(options);
  return result.users;
}

export async function getAllDiscoverableUsers(options = {}) {
  const normalizedExcludedUserId = String(options?.excludeUserId || "").trim();
  const parsedBatchLimit = Number.parseInt(String(options?.batchLimit ?? "200"), 10);
  const batchLimit = Number.isFinite(parsedBatchLimit) && parsedBatchLimit > 0
    ? Math.min(parsedBatchLimit, 200)
    : 200;
  const collectedUsers = [];
  const collectedIds = new Set();
  let cursor = null;
  let hasMore = true;
  let pageCount = 0;

  while (hasMore && pageCount < 40) {
    const page = await getDiscoverableUsersPage({
      excludeUserId: normalizedExcludedUserId,
      limitCount: batchLimit,
      cursor,
    });

    page.users.forEach((user) => {
      if (!collectedIds.has(user.id)) {
        collectedIds.add(user.id);
        collectedUsers.push(user);
      }
    });

    cursor = page.nextCursor || null;
    hasMore = Boolean(page.hasMore && cursor);
    pageCount += 1;
  }

  return collectedUsers;
}

export async function getDiscoverableUsersPage(options = {}) {
  const normalizedExcludedUserId = String(options?.excludeUserId || "").trim();
  const requestedLimit = normalizeRequestedLimit(options?.limitCount, 60, 200);
  const requestedCursor = options?.cursor || null;
  const firestore = resolveDb();

  if (!firestore) {
    return {
      users: [],
      nextCursor: null,
      hasMore: false,
    };
  }

  const mapVisibleUsers = (docs = []) => docs
    .map((userDoc) => normalizeUserProfileRecord({ id: userDoc.id, ...userDoc.data() }))
    .filter((user) => user.id && user.id !== normalizedExcludedUserId)
    .filter((user) => !user.profileHidden)
    .filter((user) => normalizeUserModerationStatus(user.moderationStatus) !== "suspended");

  const mergeVisibleFallbackUsers = async (users = []) => {
    if (users.length >= requestedLimit) {
      return users.slice(0, requestedLimit);
    }

    const existingIds = new Set(users.map((user) => user.id));
    const fallbackUsers = (await getAllUsers())
      .filter((user) => user.id && user.id !== normalizedExcludedUserId)
      .filter((user) => !user.profileHidden)
      .filter((user) => normalizeUserModerationStatus(user.moderationStatus) !== "suspended")
      .filter((user) => !existingIds.has(user.id));

    return [...users, ...fallbackUsers].slice(0, requestedLimit);
  };

  try {
    let paginationCursor = requestedCursor;
    let lastVisibleCursor = requestedCursor;
    let collectedUsers = [];
    let hasMore = false;
    let attemptCount = 0;

    while (collectedUsers.length < requestedLimit && attemptCount < 5) {
      const remainingCount = Math.max(requestedLimit - collectedUsers.length, 1);
      const batchSize = Math.min(Math.max(remainingCount * 2, remainingCount + 10), 200);
      const constraints = [orderBy("createdAt", "desc")];

      if (paginationCursor) {
        constraints.push(startAfter(paginationCursor));
      }

      constraints.push(limit(batchSize));

      const snap = await getDocs(query(collection(firestore, "users"), ...constraints));

      if (snap.empty) {
        hasMore = false;
        break;
      }

      const nextBatchUsers = mapVisibleUsers(snap.docs);
      const existingIds = new Set(collectedUsers.map((user) => user.id));
      collectedUsers = [
        ...collectedUsers,
        ...nextBatchUsers.filter((user) => !existingIds.has(user.id)),
      ];

      paginationCursor = snap.docs[snap.docs.length - 1] || null;
      lastVisibleCursor = paginationCursor;
      hasMore = snap.docs.length === batchSize;

      if (!hasMore) {
        break;
      }

      attemptCount += 1;
    }

    collectedUsers = await mergeVisibleFallbackUsers(collectedUsers);

    return {
      users: collectedUsers.slice(0, requestedLimit),
      nextCursor: hasMore ? lastVisibleCursor : null,
      hasMore,
    };
  } catch (error) {
    if (requestedCursor) {
      throw error;
    }

    const users = await getAllUsers();

    return {
      users: users
        .filter((user) => user.id && user.id !== normalizedExcludedUserId)
        .filter((user) => !user.profileHidden)
        .filter((user) => normalizeUserModerationStatus(user.moderationStatus) !== "suspended")
        .slice(0, requestedLimit),
      nextCursor: null,
      hasMore: false,
    };
  }
}

export async function createPost(data = {}) {
  const firestore = requireDb();
  const payload = {
    title: String(data?.title || "").trim(),
    body: String(data?.body || data?.text || "").trim(),
    tag: String(data?.tag || "").trim(),
    groupId: String(data?.groupId || "").trim(),
    groupName: String(data?.groupName || "").trim(),
    authorId: String(data?.authorId || "").trim(),
    authorName: String(data?.authorName || "").trim(),
    authorPhoto: String(data?.authorPhoto || "").trim(),
    hidden: false,
    reported: false,
    likesCount: 0,
    commentsCount: 0,
    images: Array.isArray(data?.images) ? data.images : [],
    videos: Array.isArray(data?.videos) ? data.videos : [],
    isAnonymous: Boolean(data?.isAnonymous),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  let group = null;

  if (payload.groupId) {
    group = await getGroup(payload.groupId).catch(() => null);
    const groupMembers = Array.isArray(group?.members) ? group.members : [];

    if (!group?.id || !payload.authorId || !groupMembers.includes(payload.authorId)) {
      throw createGroupMemberRequiredError();
    }

    payload.groupName = payload.groupName || group.name || group.title || "";
  }

  const ref = await addDoc(collection(firestore, "posts"), payload);

  if (payload.groupId) {
    try {
      const recipientIds = Array.from(new Set(Array.isArray(group?.members) ? group.members : []))
        .filter((memberId) => memberId && memberId !== payload.authorId);

      if (recipientIds.length > 0) {
        const notificationId = `group_${ref.id}`;
        const title = payload.groupName || group?.name || group?.title || "";
        const dedupeKey = `group:${payload.groupId}:${ref.id}`;
        const dataPayload = {
          authorName: payload.authorName || "Utilisateur",
          groupId: payload.groupId,
          groupName: title,
          postId: ref.id,
          postTitle: payload.title || payload.body || "",
        };

        for (const recipientChunk of chunkValues(recipientIds, 300)) {
          const batch = writeBatch(firestore);

          recipientChunk.forEach((recipientId) => {
            batch.set(doc(firestore, "users", recipientId, "notifications", notificationId), {
              type: "group",
              title,
              message: payload.title || payload.body || "",
              link: `/groups/${payload.groupId}`,
              read: false,
              dedupeKey,
              data: dataPayload,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }, { merge: true });
          });

          await batch.commit();
        }
      }
    } catch (error) {
      console.error("Error creating group post notifications:", error);
    }

    triggerGroupPostEmailNotifications(ref.id, payload.groupId).catch((error) => {
      console.error("Error triggering group post email notifications:", error);
    });
  }

  return ref.id;
}

export async function getPost(postId) {
  const firestore = resolveDb();
  const normalizedPostId = String(postId || "").trim();
  if (!firestore || !normalizedPostId) {
    return null;
  }

  const snap = await getDoc(doc(firestore, "posts", normalizedPostId));
  if (!snap.exists()) {
    return null;
  }

  return normalizePostRecord({ id: snap.id, ...snap.data() });
}

export async function getPosts(options = {}) {
  const result = await getPostsPage(options);
  return result.posts;
}

export async function getPostsPage(options = {}) {
  const firestore = resolveDb();
  if (!firestore) {
    return {
      posts: [],
      nextCursor: null,
      hasMore: false,
    };
  }

  const normalizedGroupId = String(options?.groupId || "").trim();
  const requestedLimit = normalizeRequestedLimit(options?.limitCount, normalizedGroupId ? 40 : 60, 200);
  const requestedCursor = options?.cursor || null;
  const mapVisiblePosts = (docs = []) => docs
    .map((postDoc) => normalizePostRecord({ id: postDoc.id, ...postDoc.data() }))
    .filter((post) => options?.includeHidden ? true : !post.hidden);

  if (normalizedGroupId) {
    try {
      const groupQueryConstraints = [
        where("groupId", "==", normalizedGroupId),
        orderBy("createdAt", "desc"),
      ];

      if (requestedCursor) {
        groupQueryConstraints.push(startAfter(requestedCursor));
      }

      groupQueryConstraints.push(limit(requestedLimit));

      const snap = await getDocs(
        query(
          collection(firestore, "posts"),
          ...groupQueryConstraints
        )
      );

      return {
        posts: mapVisiblePosts(snap.docs),
        nextCursor: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null,
        hasMore: snap.docs.length === requestedLimit,
      };
    } catch (error) {
      if (!isFirestoreQueryIndexError(error)) {
        throw error;
      }

      if (requestedCursor) {
        throw error;
      }

      const fallbackSnap = await getDocs(
        query(
          collection(firestore, "posts"),
          where("groupId", "==", normalizedGroupId),
          limit(requestedLimit)
        )
      );

      const fallbackPosts = sortByCreatedAtDesc(mapVisiblePosts(fallbackSnap.docs)).slice(0, requestedLimit);
      return {
        posts: fallbackPosts,
        nextCursor: null,
        hasMore: false,
      };
    }
  }

  const feedQueryConstraints = [orderBy("createdAt", "desc")];

  if (requestedCursor) {
    feedQueryConstraints.push(startAfter(requestedCursor));
  }

  feedQueryConstraints.push(limit(requestedLimit));

  const snap = await getDocs(query(collection(firestore, "posts"), ...feedQueryConstraints));
  return {
    posts: mapVisiblePosts(snap.docs),
    nextCursor: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null,
    hasMore: snap.docs.length === requestedLimit,
  };
}

export async function toggleLike(postId, userId) {
  const firestore = requireDb();
  const normalizedPostId = String(postId || "").trim();
  const normalizedUserId = String(userId || "").trim();
  const likeRef = doc(firestore, "postLikes", `${normalizedPostId}_${normalizedUserId}`);
  const likeSnap = await getDoc(likeRef);

  if (likeSnap.exists()) {
    await deleteDoc(likeRef);
    await updateDoc(doc(firestore, "posts", normalizedPostId), { likesCount: increment(-1), updatedAt: serverTimestamp() });
    return false;
  }

  await setDoc(likeRef, {
    postId: normalizedPostId,
    userId: normalizedUserId,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(firestore, "posts", normalizedPostId), { likesCount: increment(1), updatedAt: serverTimestamp() });
  return true;
}

export async function savePost(userId, postId) {
  const firestore = requireDb();
  const saveRef = doc(firestore, "savedPosts", `${userId}_${postId}`);
  const saveSnap = await getDoc(saveRef);

  if (saveSnap.exists()) {
    await deleteDoc(saveRef);
    return false;
  }

  await setDoc(saveRef, {
    userId,
    postId,
    createdAt: serverTimestamp(),
  });
  return true;
}

export async function addComment(postId, data = {}) {
  const firestore = requireDb();
  const ref = await addDoc(collection(firestore, "posts", postId, "comments"), {
    ...data,
    content: String(data?.content || "").trim(),
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(firestore, "posts", postId), {
    commentsCount: increment(1),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getComments(postId) {
  const firestore = resolveDb();
  if (!firestore || !postId) {
    return [];
  }

  const snap = await getDocs(
    query(collection(firestore, "posts", postId, "comments"), orderBy("createdAt", "asc"))
  );
  return snap.docs.map((commentDoc) => ({ id: commentDoc.id, ...commentDoc.data() }));
}

export async function setGroupPostPinned(postId, actorUserId, pinned = true) {
  const firestore = requireDb();
  const normalizedPostId = String(postId || "").trim();
  const normalizedActorUserId = String(actorUserId || "").trim();

  if (!normalizedPostId || !normalizedActorUserId) {
    throw new Error("Missing post or actor user id");
  }

  const postRef = doc(firestore, "posts", normalizedPostId);
  const postSnap = await getDoc(postRef);

  if (!postSnap.exists()) {
    throw createGroupPostModerationError("Post not found", "post/not-found");
  }

  const post = normalizePostRecord({ id: postSnap.id, ...postSnap.data() });

  if (!post.groupId) {
    throw createGroupPostModerationError("Only group posts can be pinned", "group-post/required");
  }

  const group = await getGroup(post.groupId);
  const managerIds = Array.from(
    new Set(
      [
        ...(Array.isArray(group?.adminIds) ? group.adminIds : []),
        ...(Array.isArray(group?.moderatorIds) ? group.moderatorIds : []),
        typeof group?.ownerId === "string" ? group.ownerId : "",
        typeof group?.createdBy === "string" ? group.createdBy : "",
      ].filter((value) => typeof value === "string" && value.trim())
    )
  );

  if (!group?.id || !managerIds.includes(normalizedActorUserId)) {
    throw createGroupPostModerationError("Group moderation permission required", "group-post/forbidden");
  }

  const nextPinned = Boolean(pinned);

  await updateDoc(postRef, {
    pinned: nextPinned,
    isPinned: nextPinned,
    pinnedBy: nextPinned ? normalizedActorUserId : null,
    pinnedAt: nextPinned ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  });

  await createModerationLogEntry({
    actorUserId: normalizedActorUserId,
    action: nextPinned ? "pin_group_post" : "unpin_group_post",
    targetType: "post",
    targetId: normalizedPostId,
    details: {
      groupId: post.groupId,
      pinned: nextPinned,
    },
  });
}

export async function reportPost(postId, reporterUserId, reason = "") {
  const firestore = requireDb();
  await addDoc(collection(firestore, "reports"), {
    postId: String(postId || "").trim(),
    reporterUserId: String(reporterUserId || "").trim(),
    reason: String(reason || "").trim(),
    targetType: "post",
    status: "open",
    resolved: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await setDoc(doc(firestore, "posts", String(postId || "").trim()), {
    reported: true,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function updatePostsWithAuthorPhotos() {
  const firestore = requireDb();
  const posts = await getCollectionRecords("posts", { orderField: "createdAt", orderDirection: "desc" });

  await Promise.all(posts.map(async (post) => {
    const authorProfile = post.authorId ? await getUserProfile(post.authorId) : null;
    const nextPhoto = String(authorProfile?.photo || authorProfile?.photoURL || "").trim();
    if (!nextPhoto || nextPhoto === String(post?.authorPhoto || "").trim()) {
      return;
    }

    await updateDoc(doc(firestore, "posts", post.id), {
      authorPhoto: nextPhoto,
      updatedAt: serverTimestamp(),
    });
  }));
}

export async function getReportedPosts() {
  const firestore = resolveDb();
  if (!firestore) {
    return [];
  }

  const posts = await getCollectionRecords("posts", { orderField: "createdAt", orderDirection: "desc" });
  return posts
    .map((post) => normalizePostRecord(post))
    .filter((post) => post.reported || Boolean(post.reportCount));
}

export async function getReports() {
  const firestore = resolveDb();
  if (!firestore) {
    return [];
  }

  const reports = await getCollectionRecords("reports", { orderField: "createdAt", orderDirection: "desc" });
  return reports.filter((report) => String(report?.targetType || "post").trim() === "post" && !report.resolved && String(report?.status || "open").trim() !== "resolved");
}

export async function hidePost(postId) {
  const firestore = requireDb();
  await updateDoc(doc(firestore, "posts", String(postId || "").trim()), {
    hidden: true,
    updatedAt: serverTimestamp(),
  });
}

export async function unhidePost(postId) {
  const firestore = requireDb();
  await updateDoc(doc(firestore, "posts", String(postId || "").trim()), {
    hidden: false,
    reported: false,
    updatedAt: serverTimestamp(),
  });
}

export async function resolveReport(reportId, data = {}) {
  const firestore = requireDb();
  await updateDoc(doc(firestore, "reports", String(reportId || "").trim()), {
    resolved: true,
    status: "resolved",
    resolvedAt: serverTimestamp(),
    resolverId: String(data?.resolverId || "").trim(),
    resolution: String(data?.resolution || "reviewed").trim(),
    resolutionNote: String(data?.note || "").trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function reportUser(data = {}) {
  const firestore = requireDb();
  const reporterProfile = data?.reporterUserId ? await getUserProfile(data.reporterUserId) : null;
  const reportedProfile = data?.reportedUserId ? await getUserProfile(data.reportedUserId) : null;
  const ref = await addDoc(collection(firestore, "userReports"), {
    reporterUserId: String(data?.reporterUserId || "").trim(),
    reporterUserName: String(data?.reporterUserName || reporterProfile?.name || reporterProfile?.displayName || "").trim(),
    reportedUserId: String(data?.reportedUserId || "").trim(),
    reportedUserName: String(data?.reportedUserName || reportedProfile?.name || reportedProfile?.displayName || "").trim(),
    reason: String(data?.reason || "").trim(),
    details: String(data?.details || "").trim(),
    conversationId: String(data?.conversationId || "").trim(),
    status: "open",
    resolved: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getOpenUserReports() {
  const firestore = resolveDb();
  if (!firestore) {
    return [];
  }

  const reports = await getCollectionRecords("userReports", { orderField: "createdAt", orderDirection: "desc" });
  return reports.filter((report) => !report.resolved && String(report?.status || "open").trim() !== "resolved");
}

export async function resolveUserReport(reportId, data = {}) {
  const firestore = requireDb();
  await updateDoc(doc(firestore, "userReports", String(reportId || "").trim()), {
    resolved: true,
    status: "resolved",
    resolvedAt: serverTimestamp(),
    resolverId: String(data?.resolverId || "").trim(),
    resolution: String(data?.resolution || "reviewed").trim(),
    resolutionNote: String(data?.note || "").trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function moderateUserProfile(userId, data = {}, actorUserId = "") {
  const nextPayload = {
    ...(data && typeof data === "object" ? data : {}),
  };

  if (data?.moderationStatus) {
    nextPayload.moderationStatus = normalizeUserModerationStatus(data.moderationStatus);
  }

  await updateUserProfile(userId, nextPayload);

  await createModerationLogEntry({
    actorUserId,
    action: "moderate_user_profile",
    targetType: "user",
    targetId: String(userId || "").trim(),
    details: data,
  });
}

export async function getModerationLogs() {
  return await getCollectionRecords("moderationLogs", { orderField: "createdAt", orderDirection: "desc", limitCount: 100 });
}

export async function getGroups() {
  const groups = await getCollectionRecords("groups");
  return sortGroupsByActivity(groups.map((group) => normalizeGroupRecord(group)));
}

export async function getGroup(groupId) {
  const firestore = resolveDb();
  const normalizedGroupId = String(groupId || "").trim();
  if (!firestore || !normalizedGroupId) {
    return null;
  }

  const snap = await getDoc(doc(firestore, "groups", normalizedGroupId));
  return snap.exists() ? normalizeGroupRecord({ id: snap.id, ...snap.data() }) : null;
}

export async function joinGroup(groupId, userId) {
  const firestore = requireDb();
  const normalizedGroupId = String(groupId || "").trim();
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedGroupId || !normalizedUserId) {
    throw new Error("Missing group or user id");
  }

  const groupRef = doc(firestore, "groups", normalizedGroupId);
  const groupSnap = await getDoc(groupRef);
  const nextPayload = {
    members: arrayUnion(normalizedUserId),
    memberUserIds: arrayUnion(normalizedUserId),
    updatedAt: serverTimestamp(),
  };

  if (!groupSnap.exists() || !groupSnap.data()?.createdAt) {
    nextPayload.createdAt = serverTimestamp();
  }

  await setDoc(groupRef, nextPayload, { merge: true });
}

export async function leaveGroup(groupId, userId) {
  const firestore = requireDb();
  const normalizedGroupId = String(groupId || "").trim();
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedGroupId || !normalizedUserId) {
    throw new Error("Missing group or user id");
  }

  await updateDoc(doc(firestore, "groups", normalizedGroupId), {
    members: arrayRemove(normalizedUserId),
    memberUserIds: arrayRemove(normalizedUserId),
    updatedAt: serverTimestamp(),
  });
}

export async function getGroupMembers(groupOrId) {
  const group = typeof groupOrId === "string" ? await getGroup(groupOrId) : normalizeGroupRecord(groupOrId || {});
  const memberIds = Array.from(new Set(Array.isArray(group?.members) ? group.members : []));
  const members = await Promise.all(memberIds.map((memberId) => getUserProfile(memberId)));
  return members.filter(Boolean);
}

export function subscribeToUserGroups(userId, onData, onError) {
  const firestore = resolveDb();
  const normalizedUserId = String(userId || "").trim();
  if (!firestore || !normalizedUserId) {
    onData?.([]);
    return () => {};
  }

  return onSnapshot(
    collection(firestore, "groups"),
    (snap) => {
      const groups = snap.docs
        .map((groupDoc) => normalizeGroupRecord({ id: groupDoc.id, ...groupDoc.data() }))
        .filter((group) => Array.isArray(group.members) && group.members.includes(normalizedUserId));
      onData?.(sortGroupsByActivity(groups));
    },
    onError
  );
}

export function subscribeToGroupPosts(groupId, onData, onError) {
  const firestore = resolveDb();
  const normalizedGroupId = String(groupId || "").trim();
  if (!firestore || !normalizedGroupId) {
    onData?.([]);
    return () => {};
  }

  return onSnapshot(
    query(collection(firestore, "posts"), where("groupId", "==", normalizedGroupId), orderBy("createdAt", "desc"), limit(50)),
    (snap) => {
      onData?.(
        snap.docs
          .map((postDoc) => normalizePostRecord({ id: postDoc.id, ...postDoc.data() }))
          .filter((post) => !post.hidden)
      );
    },
    onError
  );
}

export function subscribeToGroupPostsForGroupIds(groupIds, onData, onError) {
  const firestore = resolveDb();
  const normalizedGroupIds = Array.from(new Set((Array.isArray(groupIds) ? groupIds : []).map((groupId) => String(groupId || "").trim()).filter(Boolean)));
  if (!firestore || normalizedGroupIds.length === 0) {
    onData?.({});
    return () => {};
  }

  return onSnapshot(
    query(collection(firestore, "posts"), orderBy("createdAt", "desc"), limit(200)),
    (snap) => {
      const postsByGroupId = {};
      normalizedGroupIds.forEach((groupId) => {
        postsByGroupId[groupId] = [];
      });

      snap.docs.forEach((postDoc) => {
        const post = normalizePostRecord({ id: postDoc.id, ...postDoc.data() });
        if (post.groupId && normalizedGroupIds.includes(post.groupId) && !post.hidden) {
          postsByGroupId[post.groupId].push(post);
        }
      });

      onData?.(postsByGroupId);
    },
    onError
  );
}

export function subscribeToUserNotifications(userId, onData, onError) {
  const firestore = resolveDb();
  const normalizedUserId = String(userId || "").trim();
  if (!firestore || !normalizedUserId) {
    onData?.([]);
    return () => {};
  }

  return onSnapshot(
    query(collection(firestore, "users", normalizedUserId, "notifications"), orderBy("createdAt", "desc"), limit(100)),
    (snap) => {
      onData?.(
        snap.docs.map((notificationDoc) => normalizeUserNotificationRecord({
          id: notificationDoc.id,
          ...notificationDoc.data(),
        }))
      );
    },
    onError
  );
}

export async function markUserNotificationAsRead(userId, notificationId) {
  const firestore = requireDb();
  const normalizedUserId = String(userId || "").trim();
  const normalizedNotificationId = String(notificationId || "").trim();
  if (!normalizedUserId || !normalizedNotificationId) {
    throw new Error("Missing notification id");
  }

  await setDoc(doc(firestore, "users", normalizedUserId, "notifications", normalizedNotificationId), {
    read: true,
    readAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function markAllUserNotificationsAsRead(userId) {
  const firestore = requireDb();
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) {
    throw new Error("Missing user id");
  }

  const notificationsSnap = await getDocs(collection(firestore, "users", normalizedUserId, "notifications"));
  const unreadDocs = notificationsSnap.docs.filter((notificationDoc) => !notificationDoc.data()?.read);

  for (const notificationChunk of chunkValues(unreadDocs, 300)) {
    const batch = writeBatch(firestore);
    notificationChunk.forEach((notificationDoc) => {
      batch.set(notificationDoc.ref, {
        read: true,
        readAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    });
    await batch.commit();
  }
}

export async function deleteUserNotification(userId, notificationId) {
  const firestore = requireDb();
  const normalizedUserId = String(userId || "").trim();
  const normalizedNotificationId = String(notificationId || "").trim();
  if (!normalizedUserId || !normalizedNotificationId) {
    throw new Error("Missing notification id");
  }

  await deleteDoc(doc(firestore, "users", normalizedUserId, "notifications", normalizedNotificationId));
}

export async function clearUserNotifications(userId) {
  const firestore = requireDb();
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) {
    throw new Error("Missing user id");
  }

  const notificationsSnap = await getDocs(collection(firestore, "users", normalizedUserId, "notifications"));

  for (const notificationChunk of chunkValues(notificationsSnap.docs, 300)) {
    const batch = writeBatch(firestore);
    notificationChunk.forEach((notificationDoc) => {
      batch.delete(notificationDoc.ref);
    });
    await batch.commit();
  }
}

export function subscribeToConversationMessages(conversationId, onData, onError) {
  const firestore = resolveDb();
  const normalizedConversationId = String(conversationId || "").trim();
  if (!firestore || !normalizedConversationId) {
    onData?.([]);
    return () => {};
  }

  return onSnapshot(
    query(collection(firestore, "conversations", normalizedConversationId, "messages"), orderBy("timestamp", "asc"), limitToLast(100)),
    (snap) => {
      onData?.(snap.docs.map((messageDoc) => ({ id: messageDoc.id, ...messageDoc.data() })));
    },
    onError
  );
}

export function subscribeToUserConversationRequests(userId, onData, onError) {
  const firestore = resolveDb();
  const normalizedUserId = String(userId || "").trim();
  if (!firestore || !normalizedUserId) {
    onData?.([]);
    return () => {};
  }

  let sentRequests = [];
  let receivedRequests = [];
  let hasSent = false;
  let hasReceived = false;

  const emit = () => {
    if (!hasSent || !hasReceived) return;
    const seen = new Set();
    const merged = [];
    for (const r of [...sentRequests, ...receivedRequests]) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      if (String(r?.status || "pending").trim() === "pending") {
        merged.push(r);
      }
    }
    merged.sort((a, b) => {
      const ta = typeof a.createdAt?.toMillis === "function" ? a.createdAt.toMillis() : 0;
      const tb = typeof b.createdAt?.toMillis === "function" ? b.createdAt.toMillis() : 0;
      return tb - ta;
    });
    onData?.(merged);
  };

  const unsubSent = onSnapshot(
    query(collection(firestore, "conversation_requests"), where("requesterId", "==", normalizedUserId)),
    (snap) => {
      sentRequests = snap.docs.map((requestDoc) => ({ id: requestDoc.id, ...requestDoc.data() }));
      hasSent = true;
      emit();
    },
    onError
  );

  const unsubReceived = onSnapshot(
    query(collection(firestore, "conversation_requests"), where("recipientId", "==", normalizedUserId)),
    (snap) => {
      receivedRequests = snap.docs.map((requestDoc) => ({ id: requestDoc.id, ...requestDoc.data() }));
      hasReceived = true;
      emit();
    },
    onError
  );

  return () => {
    unsubSent();
    unsubReceived();
  };
}

export async function createConversationRequest(data = {}) {
  const firestore = requireDb();
  const fromUserId = String(data?.fromUserId || "").trim();
  const toUserId = String(data?.toUserId || "").trim();
  if (!fromUserId || !toUserId) {
    throw new Error("Missing conversation request participants");
  }

  try {
    await assertUsersCanInteract(fromUserId, toUserId);
  } catch (error) {
    if (["blocked_user", "blocked_by_user", "sender_messaging_restricted", "recipient_messaging_restricted"].includes(String(error?.message || "").trim())) {
      throw error;
    }
    throw createConversationRequestStageError("interaction_check", error);
  }

  let existingConversation = null;
  try {
    existingConversation = await findExistingDirectConversation([fromUserId, toUserId]);
  } catch (error) {
    throw createConversationRequestStageError("existing_conversation_lookup", error);
  }
  if (existingConversation?.id) {
    return {
      status: "existing_conversation",
      conversationId: existingConversation.id,
    };
  }

  let outgoingRequestsSnap;
  let incomingRequestsSnap;
  try {
    [outgoingRequestsSnap, incomingRequestsSnap] = await Promise.all([
      getDocs(
        query(collection(firestore, "conversation_requests"), where("requesterId", "==", fromUserId))
      ),
      getDocs(
        query(collection(firestore, "conversation_requests"), where("recipientId", "==", fromUserId))
      ),
    ]);
  } catch (error) {
    throw createConversationRequestStageError("request_history_lookup", error);
  }
  const matchingRequests = [...outgoingRequestsSnap.docs, ...incomingRequestsSnap.docs].filter((requestDoc) => {
    const request = requestDoc.data() || {};
    return (
      ((request.requesterId === fromUserId && request.recipientId === toUserId)
        || (request.requesterId === toUserId && request.recipientId === fromUserId))
    );
  });
  const latestRequestDoc = matchingRequests
    .sort((a, b) => getTimestampValue(b.data()?.updatedAt || b.data()?.createdAt) - getTimestampValue(a.data()?.updatedAt || a.data()?.createdAt))[0];

  try {
    await assertConversationRequestNotRateLimited(latestRequestDoc, fromUserId);
  } catch (error) {
    if (String(error?.message || "").trim() === "conversation_request_rate_limited") {
      throw error;
    }
    throw createConversationRequestStageError("rate_limit_check", error);
  }

  if (latestRequestDoc?.data()?.status === "pending") {
    return {
      status: "already_pending",
      requestId: latestRequestDoc.id,
    };
  }

  let fromProfile;
  let toProfile;
  try {
    [fromProfile, toProfile] = await Promise.all([getUserProfile(fromUserId), getUserProfile(toUserId)]);
  } catch (error) {
    throw createConversationRequestStageError("profile_lookup", error);
  }

  let ref;
  try {
    ref = await addDoc(collection(firestore, "conversation_requests"), {
    requesterId: fromUserId,
    requesterName: String(data?.requesterName || fromProfile?.name || fromProfile?.displayName || "Utilisateur").trim(),
    requesterPhoto: String(fromProfile?.photo || fromProfile?.photoURL || "").trim(),
    recipientId: toUserId,
    recipientName: String(data?.recipientName || toProfile?.name || toProfile?.displayName || "Utilisateur").trim(),
    recipientPhoto: String(toProfile?.photo || toProfile?.photoURL || "").trim(),
    message: String(data?.message || "").trim(),
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  } catch (error) {
    throw createConversationRequestStageError("create_request", error);
  }

  return {
    status: "created",
    requestId: ref.id,
  };
}

export async function acceptConversationRequest(requestId) {
  const firestore = requireDb();
  const requestRef = doc(firestore, "conversation_requests", String(requestId || "").trim());
  const requestSnap = await getDoc(requestRef);
  if (!requestSnap.exists()) {
    throw new Error("conversation_request_not_found");
  }

  const request = requestSnap.data() || {};
  const conversationId = await createConversation([request.requesterId, request.recipientId]);
  await updateDoc(requestRef, {
    status: "accepted",
    conversationId,
    updatedAt: serverTimestamp(),
  });
  return conversationId;
}

export async function declineConversationRequest(requestId) {
  const firestore = requireDb();
  await updateDoc(doc(firestore, "conversation_requests", String(requestId || "").trim()), {
    status: "declined",
    updatedAt: serverTimestamp(),
  });
}

function normalizeConversationCallRecord(record = {}) {
  return {
    ...record,
    id: String(record?.id || record?.conversationId || "").trim(),
    conversationId: String(record?.conversationId || record?.id || "").trim(),
    callerId: String(record?.callerId || "").trim(),
    calleeId: String(record?.calleeId || "").trim(),
    channelName: String(record?.channelName || "").trim(),
    callType: String(record?.callType || "audio").trim().toLowerCase() || "audio",
    status: String(record?.status || "idle").trim().toLowerCase(),
    missedAt: record?.missedAt || null,
    participants: Array.isArray(record?.participants)
      ? [...new Set(record.participants.map((participantId) => String(participantId || "").trim()).filter(Boolean))]
      : [],
  };
}

function serializeChessBoard(board = []) {
  return Array.isArray(board)
    ? board.map((row) => ({
      cells: Array.isArray(row)
        ? row.map((piece) => (piece && typeof piece === "object"
          ? stripUndefinedFields({
            color: String(piece.color || "").trim(),
            type: String(piece.type || "").trim(),
          })
          : null))
        : [],
    }))
    : [];
}

function deserializeChessBoard(board = []) {
  if (!Array.isArray(board)) {
    return [];
  }

  if (board.every((row) => Array.isArray(row))) {
    return board.map((row) => row.map((piece) => (piece && typeof piece === "object" ? {
      color: String(piece.color || "").trim(),
      type: String(piece.type || "").trim(),
    } : null)));
  }

  return board.map((row) => {
    const cells = Array.isArray(row?.cells) ? row.cells : [];
    return cells.map((piece) => (piece && typeof piece === "object" ? {
      color: String(piece.color || "").trim(),
      type: String(piece.type || "").trim(),
    } : null));
  });
}

function normalizeChessGameRecord(record = {}) {
  const participants = Array.isArray(record?.participants)
    ? [...new Set(record.participants.map((participantId) => String(participantId || "").trim()).filter(Boolean))]
    : [];

  return {
    ...record,
    id: String(record?.id || "").trim(),
    hostId: String(record?.hostId || "").trim(),
    guestId: String(record?.guestId || "").trim(),
    participants,
    status: String(record?.status || "pending").trim().toLowerCase(),
    turn: String(record?.turn || "white").trim().toLowerCase() || "white",
    board: deserializeChessBoard(record?.board),
    boardMessage: String(record?.boardMessage || "").trim(),
    participantNames: record?.participantNames && typeof record.participantNames === "object" ? record.participantNames : {},
    playerColorByUserId: record?.playerColorByUserId && typeof record.playerColorByUserId === "object" ? record.playerColorByUserId : {},
    lastMove: record?.lastMove && typeof record.lastMove === "object" ? record.lastMove : null,
  };
}

function areChessBoardsEqual(leftBoard, rightBoard) {
  return JSON.stringify(serializeChessBoard(leftBoard)) === JSON.stringify(serializeChessBoard(rightBoard));
}

async function findExistingChessGameSessionForParticipants(firestore, participantAId, participantBId) {
  const normalizedParticipantAId = String(participantAId || "").trim();
  const normalizedParticipantBId = String(participantBId || "").trim();

  if (!firestore || !normalizedParticipantAId || !normalizedParticipantBId) {
    return null;
  }

  const snap = await getDocs(
    query(collection(firestore, "chessGames"), where("participants", "array-contains", normalizedParticipantAId))
  );

  const matchingGames = snap.docs
    .map((gameDoc) => normalizeChessGameRecord({ id: gameDoc.id, ...gameDoc.data() }))
    .filter((game) => game.participants.includes(normalizedParticipantBId))
    .sort((a, b) => getTimestampValue(b?.updatedAt || b?.createdAt) - getTimestampValue(a?.updatedAt || a?.createdAt));

  return matchingGames[0] || null;
}

export async function createChessGameSession(data = {}) {
  const firestore = requireDb();
  const hostId = String(data?.hostId || "").trim();
  const guestId = String(data?.guestId || "").trim();

  if (!hostId || !guestId || hostId === guestId) {
    throw new Error("invalid_chess_game_participants");
  }

  try {
    await assertUsersCanInteract(hostId, guestId);
  } catch (error) {
    throw createChessStageError("interaction_check", error);
  }

  let hostProfile = null;
  let guestProfile = null;

  try {
    [hostProfile, guestProfile] = await Promise.all([
      getUserProfile(hostId),
      getUserProfile(guestId),
    ]);
  } catch (error) {
    throw createChessStageError("profile_lookup", error);
  }

  const participantNames = {
    [hostId]: String(data?.hostName || hostProfile?.name || hostProfile?.displayName || "Joueur 1").trim(),
    [guestId]: String(data?.guestName || guestProfile?.name || guestProfile?.displayName || "Joueur 2").trim(),
  };

  const participants = [hostId, guestId];
  try {
    const existingGame = await findExistingChessGameSessionForParticipants(firestore, hostId, guestId);
    if (existingGame?.id) {
      return existingGame.id;
    }

    const chessGameId = buildParticipantsKey(participants);
    const gameRef = doc(firestore, "chessGames", chessGameId);
    await setDoc(gameRef, {
      hostId,
      guestId,
      participants,
      participantNames,
      playerColorByUserId: {
        [hostId]: "white",
        [guestId]: "black",
      },
      board: serializeChessBoard(data?.board),
      turn: String(data?.turn || "white").trim().toLowerCase() || "white",
      boardMessage: String(data?.boardMessage || "").trim(),
      lastMove: data?.lastMove && typeof data.lastMove === "object" ? data.lastMove : null,
      status: String(data?.status || "pending").trim().toLowerCase() || "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return gameRef.id;
  } catch (error) {
    throw createChessStageError("create_game_document", error);
  }
}

export async function createChessInviteNotification(data = {}) {
  const firestore = requireDb();
  const senderId = String(data?.senderId || "").trim();
  const recipientId = String(data?.recipientId || "").trim();
  const gameId = String(data?.gameId || "").trim();
  const senderName = String(data?.senderName || "Utilisateur").trim() || "Utilisateur";

  if (!senderId || !recipientId || !gameId || senderId === recipientId) {
    throw new Error("invalid_chess_invitation_notification");
  }

  await addDoc(collection(firestore, "users", recipientId, "notifications"), {
    type: "chess",
    title: "",
    message: "",
    link: "/games#chess-game",
    read: false,
    data: {
      gameId,
      senderId,
      senderName,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function commitChessGameMove(gameId, data = {}) {
  const firestore = requireDb();
  const normalizedGameId = String(gameId || "").trim();
  const currentUserId = String(getFirebaseAuth()?.currentUser?.uid || "").trim();
  const normalizedNextTurn = String(data?.turn || "").trim().toLowerCase();
  const normalizedStatus = String(data?.status || "active").trim().toLowerCase() || "active";
  const nextBoard = Array.isArray(data?.board) ? data.board : null;
  const expectedBoard = Array.isArray(data?.expectedBoard) ? data.expectedBoard : null;
  const nextLastMove = data?.lastMove === null || (data?.lastMove && typeof data.lastMove === "object")
    ? data.lastMove
    : null;

  if (!normalizedGameId) {
    throw new Error("missing_chess_game_id");
  }

  if (!currentUserId) {
    throw new Error("login_required");
  }

  if (!nextBoard) {
    throw new Error("missing_chess_board");
  }

  if (!normalizedNextTurn) {
    throw new Error("missing_chess_turn");
  }

  const gameRef = doc(firestore, "chessGames", normalizedGameId);
  return runTransaction(firestore, async (transaction) => {
    const gameSnap = await transaction.get(gameRef);

    if (!gameSnap.exists()) {
      throw new Error("chess_game_not_found");
    }

    const game = normalizeChessGameRecord({ id: gameSnap.id, ...gameSnap.data() });
    if (!game.participants.includes(currentUserId)) {
      throw new Error("chess_game_access_denied");
    }

    const currentUserColor = String(game.playerColorByUserId?.[currentUserId] || "").trim().toLowerCase();
    if (!currentUserColor) {
      throw new Error("chess_game_access_denied");
    }

    if (game.turn !== currentUserColor || normalizedNextTurn === game.turn) {
      throw new Error("chess_game_turn_conflict");
    }

    if (expectedBoard && !areChessBoardsEqual(game.board, expectedBoard)) {
      throw new Error("chess_game_state_conflict");
    }

    transaction.update(gameRef, {
      board: serializeChessBoard(nextBoard),
      turn: normalizedNextTurn,
      boardMessage: typeof data?.boardMessage === "string" ? data.boardMessage.trim() : "",
      lastMove: nextLastMove,
      status: normalizedStatus,
      updatedAt: serverTimestamp(),
    });

    return {
      ...game,
      board: nextBoard,
      turn: normalizedNextTurn,
      boardMessage: typeof data?.boardMessage === "string" ? data.boardMessage.trim() : "",
      lastMove: nextLastMove,
      status: normalizedStatus,
    };
  });
}

export async function updateChessGameSession(gameId, data = {}) {
  const firestore = requireDb();
  const normalizedGameId = String(gameId || "").trim();

  if (!normalizedGameId) {
    throw new Error("missing_chess_game_id");
  }

  const gameRef = doc(firestore, "chessGames", normalizedGameId);
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists()) {
    throw new Error("chess_game_not_found");
  }

  const game = normalizeChessGameRecord({ id: gameSnap.id, ...gameSnap.data() });
  const currentUserId = String(getFirebaseAuth()?.currentUser?.uid || "").trim();

  if (currentUserId && !game.participants.includes(currentUserId)) {
    throw new Error("chess_game_access_denied");
  }

  const nextPayload = {
    updatedAt: serverTimestamp(),
  };

  if (Array.isArray(data?.board)) {
    nextPayload.board = serializeChessBoard(data.board);
  }

  if (typeof data?.turn === "string" && data.turn.trim()) {
    nextPayload.turn = data.turn.trim().toLowerCase();
  }

  if (typeof data?.boardMessage === "string") {
    nextPayload.boardMessage = data.boardMessage.trim();
  }

  if (data?.lastMove === null || (data?.lastMove && typeof data.lastMove === "object")) {
    nextPayload.lastMove = data.lastMove;
  }

  if (typeof data?.status === "string" && data.status.trim()) {
    nextPayload.status = data.status.trim().toLowerCase();
  }

  await updateDoc(gameRef, nextPayload);
}

export function subscribeToChessGameSession(gameId, userId, onData, onError) {
  const firestore = resolveDb();
  const normalizedGameId = String(gameId || "").trim();
  const normalizedUserId = String(userId || "").trim();

  if (!firestore || !normalizedGameId || !normalizedUserId) {
    onData?.(null);
    return () => {};
  }

  return onSnapshot(
    doc(firestore, "chessGames", normalizedGameId),
    (snap) => {
      if (!snap.exists()) {
        onData?.(null);
        return;
      }

      const game = normalizeChessGameRecord({ id: snap.id, ...snap.data() });
      if (!game.participants.includes(normalizedUserId)) {
        onData?.(null);
        return;
      }

      onData?.(game);
    },
    onError
  );
}

export function subscribeToUserChessGames(userId, onData, onError) {
  const firestore = resolveDb();
  const normalizedUserId = String(userId || "").trim();

  if (!firestore || !normalizedUserId) {
    onData?.([]);
    return () => {};
  }

  return onSnapshot(
    query(collection(firestore, "chessGames"), where("participants", "array-contains", normalizedUserId)),
    (snap) => {
      const games = snap.docs
        .map((gameDoc) => normalizeChessGameRecord({ id: gameDoc.id, ...gameDoc.data() }))
        .sort((a, b) => getTimestampValue(b?.updatedAt || b?.createdAt) - getTimestampValue(a?.updatedAt || a?.createdAt));

      onData?.(games);
    },
    onError
  );
}

export async function startConversationCall(data = {}) {
  const firestore = requireDb();
  const conversationId = String(data?.conversationId || "").trim();
  const callerId = String(data?.callerId || "").trim();
  const calleeId = String(data?.calleeId || "").trim();

  if (!conversationId || !callerId || !calleeId) {
    throw new Error("missing_conversation_call_participants");
  }

  await assertUsersCanInteract(callerId, calleeId);

  const conversationRef = doc(firestore, "conversations", conversationId);
  const conversationSnap = await getDoc(conversationRef);
  if (!conversationSnap.exists()) {
    throw new Error("conversation_not_found");
  }

  const conversation = conversationSnap.data() || {};
  const participants = Array.isArray(conversation?.participants)
    ? conversation.participants.map((participantId) => String(participantId || "").trim()).filter(Boolean)
    : [];

  if (!participants.includes(callerId) || !participants.includes(calleeId)) {
    throw new Error("call_participant_not_in_conversation");
  }

  const callRef = doc(firestore, "conversationCalls", conversationId);
  let existingCallSnap = null;
  try {
    existingCallSnap = await getDoc(callRef);
  } catch (err) {
    if (!String(err?.code || "").includes("permission-denied")) {
      throw err;
    }
  }

  if (existingCallSnap?.exists()) {
    const existingCall = normalizeConversationCallRecord({ id: existingCallSnap.id, ...existingCallSnap.data() });
    if (["ringing", "active"].includes(existingCall.status) && existingCall.channelName) {
      return existingCall;
    }
  }

  const channelName = String(data?.channelName || `call_${conversationId}_${Date.now()}`).trim();
  const payload = {
    conversationId,
    participants: [callerId, calleeId],
    callerId,
    calleeId,
    channelName,
    callType: "audio",
    status: "ringing",
    initiatedAt: serverTimestamp(),
    answeredAt: null,
    declinedAt: null,
    missedAt: null,
    endedAt: null,
    answeredBy: "",
    declinedBy: "",
    endedBy: "",
    updatedAt: serverTimestamp(),
  };

  await setDoc(callRef, payload, { merge: true });

  return normalizeConversationCallRecord({
    id: conversationId,
    ...payload,
  });
}

export async function acceptConversationCall(conversationId, userId) {
  const firestore = requireDb();
  const normalizedConversationId = String(conversationId || "").trim();
  const normalizedUserId = String(userId || "").trim();
  const callRef = doc(firestore, "conversationCalls", normalizedConversationId);
  const callSnap = await getDoc(callRef);

  if (!callSnap.exists()) {
    throw new Error("conversation_call_not_found");
  }

  const call = normalizeConversationCallRecord({ id: callSnap.id, ...callSnap.data() });
  if (!call.participants.includes(normalizedUserId)) {
    throw new Error("unauthorized_conversation_call_participant");
  }

  await updateDoc(callRef, {
    status: "active",
    answeredBy: normalizedUserId,
    declinedBy: "",
    endedBy: "",
    answeredAt: serverTimestamp(),
    declinedAt: null,
    missedAt: null,
    endedAt: null,
    updatedAt: serverTimestamp(),
  });
}

export async function declineConversationCall(conversationId, userId) {
  const firestore = requireDb();
  const normalizedConversationId = String(conversationId || "").trim();
  const normalizedUserId = String(userId || "").trim();
  const callRef = doc(firestore, "conversationCalls", normalizedConversationId);
  const callSnap = await getDoc(callRef);

  if (!callSnap.exists()) {
    throw new Error("conversation_call_not_found");
  }

  const call = normalizeConversationCallRecord({ id: callSnap.id, ...callSnap.data() });
  if (!call.participants.includes(normalizedUserId)) {
    throw new Error("unauthorized_conversation_call_participant");
  }

  await updateDoc(callRef, {
    status: "declined",
    declinedBy: normalizedUserId,
    endedBy: "",
    declinedAt: serverTimestamp(),
    missedAt: null,
    endedAt: null,
    updatedAt: serverTimestamp(),
  });
}

export async function endConversationCall(conversationId, userId) {
  const firestore = requireDb();
  const normalizedConversationId = String(conversationId || "").trim();
  const normalizedUserId = String(userId || "").trim();
  const callRef = doc(firestore, "conversationCalls", normalizedConversationId);
  const callSnap = await getDoc(callRef);

  if (!callSnap.exists()) {
    return;
  }

  const call = normalizeConversationCallRecord({ id: callSnap.id, ...callSnap.data() });
  if (!call.participants.includes(normalizedUserId)) {
    throw new Error("unauthorized_conversation_call_participant");
  }

  const shouldMarkAsMissed = call.status === "ringing"
    && !call.answeredAt
    && normalizedUserId === call.callerId;

  await updateDoc(callRef, {
    status: shouldMarkAsMissed ? "missed" : "ended",
    endedBy: normalizedUserId,
    missedAt: shouldMarkAsMissed ? serverTimestamp() : null,
    endedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function subscribeToUserConversationCalls(userId, onData, onError) {
  const firestore = resolveDb();
  const normalizedUserId = String(userId || "").trim();
  if (!firestore || !normalizedUserId) {
    onData?.([]);
    return () => {};
  }

  return onSnapshot(
    query(collection(firestore, "conversationCalls"), where("participants", "array-contains", normalizedUserId)),
    (snap) => {
      const calls = snap.docs
        .map((callDoc) => normalizeConversationCallRecord({ id: callDoc.id, ...callDoc.data() }))
        .filter((call) => ["ringing", "active", "missed"].includes(call.status))
        .sort((a, b) => getTimestampValue(b.updatedAt) - getTimestampValue(a.updatedAt));
      onData?.(calls);
    },
    onError
  );
}

export async function getUserConversationCalls(userId) {
  const firestore = resolveDb();
  const normalizedUserId = String(userId || "").trim();
  if (!firestore || !normalizedUserId) {
    return [];
  }

  const snap = await getDocs(
    query(collection(firestore, "conversationCalls"), where("participants", "array-contains", normalizedUserId))
  );

  return snap.docs
    .map((callDoc) => normalizeConversationCallRecord({ id: callDoc.id, ...callDoc.data() }))
    .filter((call) => ["ringing", "active", "missed"].includes(call.status))
    .sort((a, b) => getTimestampValue(b.updatedAt) - getTimestampValue(a.updatedAt));
}

export function subscribeToConversationCall(conversationId, onData, onError) {
  const firestore = resolveDb();
  const normalizedConversationId = String(conversationId || "").trim();
  if (!firestore || !normalizedConversationId) {
    onData?.(null);
    return () => {};
  }

  return onSnapshot(
    doc(firestore, "conversationCalls", normalizedConversationId),
    (callSnap) => {
      onData?.(callSnap.exists() ? normalizeConversationCallRecord({ id: callSnap.id, ...callSnap.data() }) : null);
    },
    onError
  );
}

export async function blockUser(userId, targetUserId) {
  const firestore = requireDb();
  await setDoc(doc(firestore, "userBlocks", buildUserBlockId(userId, targetUserId)), {
    userId: String(userId || "").trim(),
    targetUserId: String(targetUserId || "").trim(),
    createdAt: serverTimestamp(),
  });
}

export async function unblockUser(userId, targetUserId) {
  const firestore = requireDb();
  await deleteDoc(doc(firestore, "userBlocks", buildUserBlockId(userId, targetUserId)));
}

export function subscribeToBlockedUsers(userId, onData, onError) {
  const firestore = resolveDb();
  const normalizedUserId = String(userId || "").trim();
  if (!firestore || !normalizedUserId) {
    onData?.([]);
    return () => {};
  }

  return onSnapshot(
    query(collection(firestore, "userBlocks"), where("userId", "==", normalizedUserId)),
    (snap) => {
      onData?.(snap.docs.map((blockDoc) => String(blockDoc.data()?.targetUserId || "").trim()).filter(Boolean));
    },
    onError
  );
}

export async function muteConversationForUser(userId, conversationId, muted = true) {
  const firestore = requireDb();
  await setDoc(doc(firestore, "conversationSafetySettings", buildConversationSafetySettingId(userId, conversationId)), {
    userId: String(userId || "").trim(),
    conversationId: String(conversationId || "").trim(),
    muted: Boolean(muted),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function hideConversationForUser(userId, conversationId, hidden = true) {
  const firestore = requireDb();
  await setDoc(doc(firestore, "conversationSafetySettings", buildConversationSafetySettingId(userId, conversationId)), {
    userId: String(userId || "").trim(),
    conversationId: String(conversationId || "").trim(),
    hidden: Boolean(hidden),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export function subscribeToUserConversationSafetySettings(userId, onData, onError) {
  const firestore = resolveDb();
  const normalizedUserId = String(userId || "").trim();
  if (!firestore || !normalizedUserId) {
    onData?.([]);
    return () => {};
  }

  return onSnapshot(
    query(collection(firestore, "conversationSafetySettings"), where("userId", "==", normalizedUserId)),
    (snap) => {
      onData?.(snap.docs.map((settingDoc) => ({ id: settingDoc.id, ...settingDoc.data() })));
    },
    onError
  );
}

export async function createShopItem(data = {}) {
  const firestore = requireDb();
  const payload = normalizeShopItemRecord({
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const ref = await addDoc(collection(firestore, "shopItems"), payload);
  return ref.id;
}

export async function deleteShopItem(itemId) {
  const firestore = requireDb();
  await deleteDoc(doc(firestore, "shopItems", String(itemId || "").trim()));
}

export async function getUserShopItems(userId) {
  const items = await getCollectionRecords("shopItems", { orderField: "createdAt", orderDirection: "desc" });
  const normalizedUserId = String(userId || "").trim();
  return items
    .map((item) => normalizeShopItemRecord(item))
    .filter((item) => item.sellerId === normalizedUserId || item.authorId === normalizedUserId);
}

export async function getAllShopItems() {
  const items = await getCollectionRecords("shopItems", { orderField: "createdAt", orderDirection: "desc" });
  return items.map((item) => normalizeShopItemRecord(item));
}

export async function getShopItemById(itemId) {
  const firestore = resolveDb();
  const normalizedItemId = String(itemId || "").trim();
  if (!firestore || !normalizedItemId) {
    return null;
  }

  const snap = await getDoc(doc(firestore, "shopItems", normalizedItemId));
  if (!snap.exists()) {
    return null;
  }

  return normalizeShopItemRecord({ id: snap.id, ...snap.data() });
}

 export async function getShopItems() {
   return (await getAllShopItems()).filter(
     (item) => String(item?.status || "available").trim().toLowerCase() === "available"
   );
 }

export async function markItemSold(itemId) {
  const firestore = requireDb();
  const normalizedItemId = String(itemId || "").trim();
  if (!normalizedItemId) {
    throw new Error("Missing shop item id");
  }

  await updateDoc(doc(firestore, "shopItems", normalizedItemId), {
    status: "sold",
    soldAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function createShopOrder(data = {}) {
  const firestore = requireDb();
  const normalizedPaymentStatus = normalizeShopOrderPaymentStatus(data?.paymentStatus || data?.status || "pending");
  const payload = normalizeShopOrderRecord({
    ...data,
    paymentStatus: normalizedPaymentStatus,
    supportStatus: data?.supportStatus || getDefaultSupportStatusFromPaymentStatus(normalizedPaymentStatus, Boolean(data?.realMonCash)),
    fulfillmentStatus: data?.fulfillmentStatus || getDefaultFulfillmentStatusFromPaymentStatus(normalizedPaymentStatus),
    paymentProofStatus: data?.paymentProofStatus || "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const ref = await addDoc(collection(firestore, "shopOrders"), payload);
  return ref.id;
}

export async function getShopOrderByTransactionId(transactionId) {
  const firestore = resolveDb();
  const normalizedTransactionId = String(transactionId || "").trim();
  if (!firestore || !normalizedTransactionId) {
    return null;
  }

  const snap = await getDocs(
    query(collection(firestore, "shopOrders"), where("transactionId", "==", normalizedTransactionId), limit(1))
  );
  const firstDoc = snap.docs[0];
  return firstDoc ? normalizeShopOrderRecord({ id: firstDoc.id, ...firstDoc.data() }) : null;
}

export async function updateShopOrder(orderId, data = {}) {
  const firestore = requireDb();
  const normalizedOrderId = String(orderId || "").trim();
  if (!normalizedOrderId) {
    throw new Error("Missing shop order id");
  }

  const nextPaymentStatus = data?.paymentStatus || data?.status;
  const normalizedPaymentStatus = nextPaymentStatus ? normalizeShopOrderPaymentStatus(nextPaymentStatus) : null;
  const nextPayload = {
    ...(data && typeof data === "object" ? data : {}),
    ...(normalizedPaymentStatus ? {
      paymentStatus: normalizedPaymentStatus,
      status: normalizedPaymentStatus,
      supportStatus: data?.supportStatus || getDefaultSupportStatusFromPaymentStatus(normalizedPaymentStatus, Boolean(data?.realMonCash)),
      fulfillmentStatus: data?.fulfillmentStatus || getDefaultFulfillmentStatusFromPaymentStatus(normalizedPaymentStatus),
    } : {}),
    ...(data?.paymentProofStatus ? { paymentProofStatus: normalizeShopOrderProofStatus(data.paymentProofStatus) } : {}),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(firestore, "shopOrders", normalizedOrderId), nextPayload, { merge: true });
}

export async function getShopOrders() {
  const firestore = resolveDb();
  if (!firestore) {
    return [];
  }

  const snap = await getDocs(query(collection(firestore, "shopOrders"), orderBy("createdAt", "desc")));
  return snap.docs.map((orderDoc) => normalizeShopOrderRecord({ id: orderDoc.id, ...orderDoc.data() }));
}

export async function getBuyerShopOrders(userId) {
  const firestore = resolveDb();
  const normalizedUserId = String(userId || "").trim();
  if (!firestore || !normalizedUserId) {
    return [];
  }

  const snap = await getDocs(
    query(
      collection(firestore, "shopOrders"),
      where("buyerId", "==", normalizedUserId),
      orderBy("createdAt", "desc")
    )
  );

  return snap.docs.map((orderDoc) => normalizeShopOrderRecord({ id: orderDoc.id, ...orderDoc.data() }));
}

export async function getSellerShopOrders(userId) {
  const firestore = resolveDb();
  const normalizedUserId = String(userId || "").trim();
  if (!firestore || !normalizedUserId) {
    return [];
  }

  const [sellerSnap, authorSnap] = await Promise.all([
    getDocs(
      query(
        collection(firestore, "shopOrders"),
        where("sellerId", "==", normalizedUserId),
        orderBy("createdAt", "desc")
      )
    ),
    getDocs(
      query(
        collection(firestore, "shopOrders"),
        where("authorId", "==", normalizedUserId),
        orderBy("createdAt", "desc")
      )
    ),
  ]);

  const mergedOrders = new Map();

  for (const orderDoc of [...sellerSnap.docs, ...authorSnap.docs]) {
    mergedOrders.set(orderDoc.id, normalizeShopOrderRecord({ id: orderDoc.id, ...orderDoc.data() }));
  }

  return Array.from(mergedOrders.values()).sort((a, b) => {
    const left = getTimestampValue(a?.createdAt);
    const right = getTimestampValue(b?.createdAt);
    return right - left;
  });
}

export async function requestShopOrderAction(orderId, data = {}) {
  const normalizedActionType = String(data?.actionType || "").trim().toLowerCase();
  const payload = {
    requestedActionType: normalizedActionType,
    actionRequestedBy: String(data?.requestedBy || "").trim(),
    actionRequestedNote: String(data?.note || "").trim(),
    actionRequestedAt: serverTimestamp(),
    supportStatus: "action_required",
  };

  if (normalizedActionType === "refund") {
    payload.refundRequestedAt = serverTimestamp();
    payload.fulfillmentStatus = "refund_requested";
  }

  await updateShopOrder(orderId, payload);
}

export async function getDoctorProfiles(options = {}) {
  const firestore = resolveDb();
  if (!firestore) {
    return [];
  }

  const doctorProfilesCollection = collection(firestore, "doctor_profiles");
  const mapProfiles = (docs = []) => docs.map((profileDoc) => ({ id: profileDoc.id, ...profileDoc.data() }));

  if (options?.publishedOnly) {
    try {
      const profilesSnap = await getDocs(
        query(
          doctorProfilesCollection,
          where("published", "==", true),
          orderBy("createdAt", "desc")
        )
      );

      return mapProfiles(profilesSnap.docs);
    } catch (error) {
      if (!isFirestoreQueryIndexError(error)) {
        throw error;
      }

      const fallbackSnap = await getDocs(doctorProfilesCollection);
      return sortByCreatedAtDesc(mapProfiles(fallbackSnap.docs).filter((profile) => profile?.published === true));
    }
  }

  const profilesSnap = await getDocs(query(doctorProfilesCollection, orderBy("createdAt", "desc")));
  return mapProfiles(profilesSnap.docs);
}

export async function getDoctorProfileByEditor(editorUserId) {
  const profiles = await getDoctorProfiles();
  const normalizedEditorUserId = String(editorUserId || "").trim();
  return profiles.find((profile) => String(profile?.editorUserId || "").trim() === normalizedEditorUserId) || null;
}

export async function ensureDoctorStarterProfiles(users = []) {
  const firestore = requireDb();
  const existingProfiles = await getDoctorProfiles();
  const existingBySlug = new Map(existingProfiles.map((profile) => [String(profile?.slug || "").trim(), profile]));

  await Promise.all(DOCTOR_SPECIALTY_STARTER_PROFILES.map(async (starterProfile) => {
    const payload = buildDoctorProfilePayload(starterProfile, "");
    const matchedUser = findStarterDoctorUserMatch(starterProfile, users) || null;
    const existingProfile = existingBySlug.get(payload.slug);
    const nextPayload = {
      ...payload,
      editorUserId: matchedUser?.id || existingProfile?.editorUserId || payload.editorUserId,
      email: matchedUser?.email || payload.email,
      updatedAt: serverTimestamp(),
      createdAt: existingProfile?.createdAt || serverTimestamp(),
    };

    if (existingProfile?.id) {
      await setDoc(doc(firestore, "doctor_profiles", existingProfile.id), nextPayload, { merge: true });
      return;
    }

    await addDoc(collection(firestore, "doctor_profiles"), nextPayload);
  }));
}

export async function assignDoctorProfileToUser(profileId, targetUser) {
  const firestore = requireDb();
  const normalizedProfileId = String(profileId || "").trim();
  const normalizedTargetUserId = String(targetUser?.id || "").trim();
  if (!normalizedProfileId || !normalizedTargetUserId) {
    throw new Error("doctor_profile_missing_target");
  }

  const profileRef = doc(firestore, "doctor_profiles", normalizedProfileId);
  const profileSnap = await getDoc(profileRef);
  if (!profileSnap.exists()) {
    throw new Error("doctor_profile_not_found");
  }

  const profileData = { id: profileSnap.id, ...profileSnap.data() };
  const nextEmail = String(targetUser?.email || profileData?.email || "").trim().toLowerCase();
  const linkedProfileConflict = (await getDoctorProfiles()).find((profile) => {
    return profile.id !== normalizedProfileId && String(profile?.editorUserId || "").trim() === normalizedTargetUserId;
  });
  if (linkedProfileConflict) {
    throw new Error("doctor_profile_target_already_linked");
  }

  await updateDoc(profileRef, {
    editorUserId: normalizedTargetUserId,
    email: nextEmail,
    updatedAt: serverTimestamp(),
  });

  const doctorArticles = await getDoctorArticles({});
  const articlesToReassign = doctorArticles.filter((article) => {
    const articleAuthorId = String(article?.authorId || "").trim();
    return articleAuthorId === String(profileData?.editorUserId || "").trim() || (!articleAuthorId && String(article?.authorName || "").trim() === String(profileData?.displayName || "").trim());
  });

  await Promise.all(articlesToReassign.map((article) => updateDoc(doc(firestore, "doctor_articles", article.id), {
    authorId: normalizedTargetUserId,
    updatedAt: serverTimestamp(),
  })));

  return {
    reassignedArticleCount: articlesToReassign.length,
  };
}

export async function saveDoctorProfile(data = {}, editorUserId = "") {
  const firestore = requireDb();
  const payload = {
    ...buildDoctorProfilePayload(data, editorUserId),
    updatedAt: serverTimestamp(),
  };
  const normalizedProfileId = String(data?.id || "").trim();
  if (normalizedProfileId) {
    await setDoc(doc(firestore, "doctor_profiles", normalizedProfileId), {
      ...payload,
      createdAt: data?.createdAt || serverTimestamp(),
    }, { merge: true });
    return normalizedProfileId;
  }

  const existingProfile = editorUserId ? await getDoctorProfileByEditor(editorUserId) : null;
  if (existingProfile?.id) {
    await setDoc(doc(firestore, "doctor_profiles", existingProfile.id), payload, { merge: true });
    return existingProfile.id;
  }

  const ref = await addDoc(collection(firestore, "doctor_profiles"), {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getDoctorArticles(options = {}) {
  const firestore = resolveDb();
  if (!firestore) {
    return [];
  }

  const normalizedAuthorId = String(options?.authorId || "").trim();
  const constraints = [orderBy("createdAt", "desc")];
  const doctorArticlesCollection = collection(firestore, "doctor_articles");
  const mapArticles = (docs = []) => docs.map((articleDoc) => ({ id: articleDoc.id, ...articleDoc.data() }));
  const matchesArticleFilters = (article) => {
    if (options?.publishedOnly && (!article?.published || !article?.validated)) {
      return false;
    }

    if (normalizedAuthorId && String(article?.authorId || "").trim() !== normalizedAuthorId) {
      return false;
    }

    return true;
  };

  if (options?.publishedOnly) {
    constraints.unshift(where("published", "==", true), where("validated", "==", true));
  }

  if (normalizedAuthorId) {
    constraints.unshift(where("authorId", "==", normalizedAuthorId));
  }

  try {
    const snap = await getDocs(query(doctorArticlesCollection, ...constraints));
    return mapArticles(snap.docs);
  } catch (error) {
    if (!isFirestoreQueryIndexError(error)) {
      throw error;
    }

    const fallbackSnap = await getDocs(doctorArticlesCollection);
    return sortByCreatedAtDesc(mapArticles(fallbackSnap.docs).filter(matchesArticleFilters));
  }
}

export async function saveDoctorArticle(data = {}, editorUserId = "") {
  const firestore = requireDb();
  const payload = {
    ...buildDoctorArticlePayload(data, editorUserId),
    updatedAt: serverTimestamp(),
  };
  const normalizedArticleId = String(data?.id || "").trim();
  if (normalizedArticleId) {
    await setDoc(doc(firestore, "doctor_articles", normalizedArticleId), payload, { merge: true });
    return normalizedArticleId;
  }

  const ref = await addDoc(collection(firestore, "doctor_articles"), {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteDoctorArticle(articleId) {
  const firestore = requireDb();
  await deleteDoc(doc(firestore, "doctor_articles", String(articleId || "").trim()));
}

export async function getDoctorVideos(options = {}) {
  const firestore = resolveDb();
  if (!firestore) {
    return [];
  }

  const normalizedAuthorId = String(options?.authorId || "").trim();
  const constraints = [orderBy("createdAt", "desc")];
  const doctorVideosCollection = collection(firestore, "doctor_videos");
  const mapVideos = (docs = []) => docs.map((videoDoc) => ({ id: videoDoc.id, ...videoDoc.data() }));
  const matchesVideoFilters = (video) => {
    if (options?.publishedOnly && (!video?.published || !video?.validated)) {
      return false;
    }

    if (normalizedAuthorId && String(video?.authorId || "").trim() !== normalizedAuthorId) {
      return false;
    }

    return true;
  };

  if (options?.publishedOnly) {
    constraints.unshift(where("published", "==", true), where("validated", "==", true));
  }

  if (normalizedAuthorId) {
    constraints.unshift(where("authorId", "==", normalizedAuthorId));
  }

  try {
    const snap = await getDocs(query(doctorVideosCollection, ...constraints));
    return mapVideos(snap.docs);
  } catch (error) {
    if (!isFirestoreQueryIndexError(error)) {
      throw error;
    }

    const fallbackSnap = await getDocs(doctorVideosCollection);
    return sortByCreatedAtDesc(mapVideos(fallbackSnap.docs).filter(matchesVideoFilters));
  }
}

export async function saveDoctorVideo(data = {}, editorUserId = "") {
  const firestore = requireDb();
  const payload = {
    ...buildDoctorVideoPayload(data, editorUserId),
    updatedAt: serverTimestamp(),
  };
  const normalizedVideoId = String(data?.id || "").trim();
  if (normalizedVideoId) {
    await setDoc(doc(firestore, "doctor_videos", normalizedVideoId), payload, { merge: true });
    return normalizedVideoId;
  }

  const ref = await addDoc(collection(firestore, "doctor_videos"), {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteDoctorVideo(videoId) {
  const firestore = requireDb();
  await deleteDoc(doc(firestore, "doctor_videos", String(videoId || "").trim()));
}

export async function submitDoctorQuestion(data = {}) {
  const firestore = requireDb();
  const ref = await addDoc(collection(firestore, "doctor_questions"), {
    ...data,
    title: String(data?.title || "").trim(),
    question: String(data?.question || data?.body || data?.message || "").trim(),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getUserVaccinationProfile(userId) {
  const firestore = resolveDb();
  const normalizedUserId = String(userId || "").trim();
  if (!firestore || !normalizedUserId) {
    return null;
  }

  const snap = await getDoc(doc(firestore, "vaccinationProfiles", normalizedUserId));
  return snap.exists() ? sanitizeVaccinationProfile(snap.data()) : null;
}

export async function saveUserVaccinationProfile(userId, data = {}) {
  const firestore = requireDb();
  const normalizedUserId = String(userId || "").trim();
  await setDoc(doc(firestore, "vaccinationProfiles", normalizedUserId), {
    ...sanitizeVaccinationProfile(data),
    userId: normalizedUserId,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function saveQuizResult(userId, quizKey, data = {}) {
  const firestore = requireDb();
  await setDoc(doc(firestore, "quizResults", `${String(userId || "").trim()}_${String(quizKey || "").trim()}`), {
    userId: String(userId || "").trim(),
    quizKey: String(quizKey || "").trim(),
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

 export async function getGuides() {
   return await getCollectionRecords("guides", { orderField: "createdAt", orderDirection: "desc", limitCount: 100 });
 }

export async function sendChessGameMessage(gameId, senderId, senderName, text) {
  const firestore = requireDb();
  const normalizedGameId = String(gameId || "").trim();
  const normalizedSenderId = String(senderId || "").trim();
  const normalizedText = String(text || "").trim();

  if (!normalizedGameId || !normalizedSenderId || !normalizedText) {
    throw new Error("missing_chess_chat_fields");
  }

  const gameSnap = await getDoc(doc(firestore, "chessGames", normalizedGameId));
  if (!gameSnap.exists()) {
    throw new Error("chess_game_not_found");
  }

  const game = normalizeChessGameRecord({ id: gameSnap.id, ...gameSnap.data() });
  if (!game.participants.includes(normalizedSenderId)) {
    throw new Error("chess_game_access_denied");
  }

  await addDoc(collection(firestore, "chessGames", normalizedGameId, "messages"), {
    senderId: normalizedSenderId,
    senderName: String(senderName || "Joueur").trim() || "Joueur",
    text: normalizedText,
    timestamp: serverTimestamp(),
  });
}

export function subscribeToChessGameMessages(gameId, onData, onError) {
  const firestore = resolveDb();
  const normalizedGameId = String(gameId || "").trim();
  if (!firestore || !normalizedGameId) {
    onData?.([]);
    return () => {};
  }

  return onSnapshot(
    query(
      collection(firestore, "chessGames", normalizedGameId, "messages"),
      orderBy("timestamp", "asc"),
      limitToLast(50)
    ),
    (snap) => {
      onData?.(snap.docs.map((msgDoc) => ({ id: msgDoc.id, ...msgDoc.data() })));
    },
    onError
  );
}

 export async function saveUserFcmToken(userId, token) {
   const firestore = requireDb();
   const normalizedUserId = String(userId || "").trim();
   const normalizedToken = String(token || "").trim();
   if (!normalizedUserId || !normalizedToken) {
     return;
   }

   await setDoc(doc(firestore, "users", normalizedUserId), {
     fcmToken: normalizedToken,
     fcmTokens: arrayUnion(normalizedToken),
     updatedAt: serverTimestamp(),
   }, { merge: true });
 }
