import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  writeBatch,
  onSnapshot,
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
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

  const [directBlock, reverseBlock] = await Promise.all([
    getDoc(doc(firestore, "userBlocks", buildUserBlockId(userId, targetUserId))),
    getDoc(doc(firestore, "userBlocks", buildUserBlockId(targetUserId, userId))),
  ]);

  if (directBlock.exists()) {
    return { blocked: true, direction: "outgoing" };
  }

  if (reverseBlock.exists()) {
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
  const conversationDoc = await getDoc(doc(firestore, "conversations", conversationId));
  if (!conversationDoc.exists()) {
    throw new Error("Conversation not found");
  }

  const conversation = conversationDoc.data();
  const recipientId = conversation.participants?.find((id) => id !== senderId);

  if (recipientId) {
    await assertUsersCanInteract(senderId, recipientId);
  }

  await assertMessageNotSpam(firestore, conversationId, senderId, content, data);

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
  
  // Update conversation metadata
  await updateDoc(doc(firestore, "conversations", conversationId), {
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
    // Increment recipient's unread count
    ...(recipientId && { [`unreadCount.${recipientId}`]: increment(1) }),
  });

  // TODO: Send push notification to recipient
  // This would require FCM token from recipient's profile
  
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
    orderBy("lastMessageTime", "desc")
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
    180
  );
  const candidatePageSize = normalizeRequestedLimit(
    filters.pageSize,
    normalizedSearchQuery || normalizedLocation
      ? Math.min(Math.max(requestedLimit, 48), 80)
      : Math.min(Math.max(requestedLimit, 36), 72),
    80
  );
  const maxServerDocuments = normalizeRequestedLimit(
    filters.maxServerDocuments,
    requestedLimit * (normalizedSearchQuery || normalizedLocation ? 8 : 5),
    480
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
    likesCount: Number(post?.likesCount || 0),
    commentsCount: Number(post?.commentsCount || 0),
    images: Array.isArray(post?.images) ? post.images : [],
    videos: Array.isArray(post?.videos) ? post.videos : [],
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

  const firstParticipantId = normalizedParticipants[0];
  const participantsKey = buildParticipantsKey(normalizedParticipants);
  const snap = await getDocs(
    query(collection(firestore, "conversations"), where("participants", "array-contains", firstParticipantId))
  );

  const matchingConversation = snap.docs
    .map((conversationDoc) => ({ id: conversationDoc.id, ...conversationDoc.data() }))
    .find((conversation) => {
      const conversationParticipants = Array.isArray(conversation?.participants) ? conversation.participants : [];
      return buildParticipantsKey(conversationParticipants) === participantsKey
        && String(conversation?.type || "direct").trim().toLowerCase() !== "group";
    });

  return matchingConversation || null;
}

async function hydrateConversationRecord(conversationDocOrData) {
  const conversation = toPlainRecord(conversationDocOrData);
  if (!conversation) {
    return null;
  }

  const participants = Array.isArray(conversation?.participants) ? conversation.participants.filter(Boolean) : [];
  const participantMetadata = await getParticipantMetadata(participants);

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

export async function updateUserPresence(uid, data = {}) {
  const firestore = requireDb();
  const normalizedUid = String(uid || "").trim();
  if (!normalizedUid) {
    throw new Error("Missing user id");
  }

  const cachedExists = readPresenceProfileExistence(normalizedUid);
  if (cachedExists === false) {
    await createUserProfile(normalizedUid, {
      isOnline: Boolean(data?.isOnline),
    });
    return;
  }

  const userRef = doc(firestore, "users", normalizedUid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    writePresenceProfileExistence(normalizedUid, false);
    await createUserProfile(normalizedUid, {
      isOnline: Boolean(data?.isOnline),
    });
    return;
  }

  writePresenceProfileExistence(normalizedUid, true);
  await updateDoc(userRef, {
    isOnline: Boolean(data?.isOnline),
    lastActiveAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getAllUsers() {
  const users = await getCollectionRecords("users", { orderField: "createdAt", orderDirection: "desc" });
  return users.map((user) => normalizeUserProfileRecord(user));
}

export async function getDiscoverableUsers(options = {}) {
  const normalizedExcludedUserId = String(options?.excludeUserId || "").trim();
  const requestedLimit = normalizeRequestedLimit(options?.limitCount, 60, 200);
  const users = await getAllUsers();

  return users
    .filter((user) => user.id && user.id !== normalizedExcludedUserId)
    .filter((user) => !user.profileHidden)
    .filter((user) => normalizeUserModerationStatus(user.moderationStatus) !== "suspended")
    .slice(0, requestedLimit);
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

  const ref = await addDoc(collection(firestore, "posts"), payload);
  return ref.id;
}

export async function getPosts(options = {}) {
  const firestore = resolveDb();
  if (!firestore) {
    return [];
  }

  const normalizedGroupId = String(options?.groupId || "").trim();
  const requestedLimit = normalizeRequestedLimit(options?.limitCount, normalizedGroupId ? 40 : 60, 200);
  const constraints = [orderBy("createdAt", "desc"), limit(requestedLimit)];
  if (normalizedGroupId) {
    constraints.unshift(where("groupId", "==", normalizedGroupId));
  }

  const snap = await getDocs(query(collection(firestore, "posts"), ...constraints));
  return snap.docs
    .map((postDoc) => normalizePostRecord({ id: postDoc.id, ...postDoc.data() }))
    .filter((post) => options?.includeHidden ? true : !post.hidden);
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
  const groups = await getCollectionRecords("groups", { orderField: "createdAt", orderDirection: "desc", limitCount: 120 });
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

  await setDoc(doc(firestore, "groups", normalizedGroupId), {
    members: arrayUnion(normalizedUserId),
    memberUserIds: arrayUnion(normalizedUserId),
    updatedAt: serverTimestamp(),
  }, { merge: true });
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

export function subscribeToConversationMessages(conversationId, onData, onError) {
  const firestore = resolveDb();
  const normalizedConversationId = String(conversationId || "").trim();
  if (!firestore || !normalizedConversationId) {
    onData?.([]);
    return () => {};
  }

  return onSnapshot(
    query(collection(firestore, "conversations", normalizedConversationId, "messages"), orderBy("timestamp", "asc")),
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

  return onSnapshot(
    query(collection(firestore, "conversation_requests"), orderBy("createdAt", "desc")),
    (snap) => {
      const requests = snap.docs
        .map((requestDoc) => ({ id: requestDoc.id, ...requestDoc.data() }))
        .filter((request) => request.requesterId === normalizedUserId || request.recipientId === normalizedUserId)
        .filter((request) => String(request?.status || "pending").trim() === "pending");
      onData?.(requests);
    },
    onError
  );
}

export async function createConversationRequest(data = {}) {
  const firestore = requireDb();
  const fromUserId = String(data?.fromUserId || data?.requesterId || "").trim();
  const toUserId = String(data?.toUserId || data?.recipientId || "").trim();
  if (!fromUserId || !toUserId) {
    throw new Error("Missing conversation request participants");
  }

  await assertUsersCanInteract(fromUserId, toUserId);

  const existingConversation = await findExistingDirectConversation([fromUserId, toUserId]);
  if (existingConversation?.id) {
    return {
      status: "existing_conversation",
      conversationId: existingConversation.id,
    };
  }

  const requestsSnap = await getDocs(collection(firestore, "conversation_requests"));
  const matchingRequests = requestsSnap.docs.filter((requestDoc) => {
    const request = requestDoc.data() || {};
    return (
      ((request.requesterId === fromUserId && request.recipientId === toUserId)
        || (request.requesterId === toUserId && request.recipientId === fromUserId))
    );
  });
  const latestRequestDoc = matchingRequests
    .sort((a, b) => getTimestampValue(b.data()?.updatedAt || b.data()?.createdAt) - getTimestampValue(a.data()?.updatedAt || a.data()?.createdAt))[0];

  await assertConversationRequestNotRateLimited(latestRequestDoc, fromUserId);

  if (latestRequestDoc?.data()?.status === "pending") {
    return {
      status: "already_pending",
      requestId: latestRequestDoc.id,
    };
  }

  const [fromProfile, toProfile] = await Promise.all([getUserProfile(fromUserId), getUserProfile(toUserId)]);
  const ref = await addDoc(collection(firestore, "conversation_requests"), {
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
  const orders = await getCollectionRecords("shopOrders", { orderField: "createdAt", orderDirection: "desc" });
  return orders.map((order) => normalizeShopOrderRecord(order));
}

export async function getBuyerShopOrders(userId) {
  const normalizedUserId = String(userId || "").trim();
  const orders = await getShopOrders();
  return orders.filter((order) => String(order?.buyerId || "").trim() === normalizedUserId);
}

export async function getSellerShopOrders(userId) {
  const normalizedUserId = String(userId || "").trim();
  const orders = await getShopOrders();
  return orders.filter((order) => String(order?.sellerId || order?.authorId || "").trim() === normalizedUserId);
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
  const profiles = await getCollectionRecords("doctor_profiles", { orderField: "createdAt", orderDirection: "desc" });
  return profiles
    .map((profile) => ({ id: profile.id, ...profile }))
    .filter((profile) => options?.publishedOnly ? profile.published !== false : true);
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
  const articles = await getCollectionRecords("doctor_articles", { orderField: "createdAt", orderDirection: "desc" });
  const normalizedAuthorId = String(options?.authorId || "").trim();
  return articles.filter((article) => {
    if (options?.publishedOnly && article.published === false) {
      return false;
    }
    if (normalizedAuthorId && String(article?.authorId || "").trim() !== normalizedAuthorId) {
      return false;
    }
    return true;
  });
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
  const videos = await getCollectionRecords("doctor_videos", { orderField: "createdAt", orderDirection: "desc" });
  const normalizedAuthorId = String(options?.authorId || "").trim();
  return videos.filter((video) => {
    if (options?.publishedOnly && video.published === false) {
      return false;
    }
    if (normalizedAuthorId && String(video?.authorId || "").trim() !== normalizedAuthorId) {
      return false;
    }
    return true;
  });
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
