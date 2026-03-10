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
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Users ───────────────────────────────────────────────
export async function createUserProfile(uid, data) {
  const ref = doc(db, "users", uid);
  await setDoc(ref, {
    ...data,
    badges: [],
    createdAt: serverTimestamp(),
  });
  return ref;
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateUserProfile(uid, data) {
  await updateDoc(doc(db, "users", uid), data);
}

// ─── Posts ───────────────────────────────────────────────
export async function createPost(data) {
  const ref = await addDoc(collection(db, "posts"), {
    ...data,
    likesCount: 0,
    commentsCount: 0,
    createdAt: serverTimestamp(),
    reported: false,
    hidden: false,
  });
  return ref.id;
}

export async function getPosts({ tag, groupId, city, limitCount = 20, lastDoc } = {}) {
  let q = query(
    collection(db, "posts"),
    where("hidden", "==", false),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  if (tag) q = query(collection(db, "posts"), where("tag", "==", tag), where("hidden", "==", false), orderBy("createdAt", "desc"), limit(limitCount));
  if (groupId) q = query(collection(db, "posts"), where("groupId", "==", groupId), where("hidden", "==", false), orderBy("createdAt", "desc"), limit(limitCount));
  if (lastDoc) q = query(q, startAfter(lastDoc));

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data(), _doc: d }));
}

export async function getPost(postId) {
  const snap = await getDoc(doc(db, "posts", postId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function toggleLike(postId, userId) {
  const likeRef = doc(db, "posts", postId, "likes", userId);
  const likeSnap = await getDoc(likeRef);
  const { setDoc: setDocFn, deleteDoc: deleteDocFn } = await import("firebase/firestore");

  if (likeSnap.exists()) {
    await deleteDocFn(likeRef);
    await updateDoc(doc(db, "posts", postId), { likesCount: increment(-1) });
    return false;
  } else {
    await setDocFn(likeRef, { createdAt: serverTimestamp() });
    await updateDoc(doc(db, "posts", postId), { likesCount: increment(1) });
    return true;
  }
}

export async function savePost(userId, postId) {
  const saveRef = doc(db, "users", userId, "saved", postId);
  const saveSnap = await getDoc(saveRef);
  const { setDoc: setDocFn, deleteDoc: deleteDocFn } = await import("firebase/firestore");

  if (saveSnap.exists()) {
    await deleteDocFn(saveRef);
    return false;
  } else {
    await setDocFn(saveRef, { createdAt: serverTimestamp() });
    return true;
  }
}

export async function reportPost(postId, userId, reason) {
  await addDoc(collection(db, "reports"), {
    postId,
    userId,
    reason,
    createdAt: serverTimestamp(),
    resolved: false,
  });
  await updateDoc(doc(db, "posts", postId), { reported: true });
}

// ─── Comments ────────────────────────────────────────────
export async function addComment(postId, data) {
  const ref = await addDoc(collection(db, "posts", postId, "comments"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "posts", postId), { commentsCount: increment(1) });
  return ref.id;
}

export async function getComments(postId) {
  const q = query(
    collection(db, "posts", postId, "comments"),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Groups ─────────────────────────────────────────────
export async function getGroups() {
  const snap = await getDocs(collection(db, "groups"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getGroup(groupId) {
  const snap = await getDoc(doc(db, "groups", groupId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function joinGroup(groupId, userId) {
  await updateDoc(doc(db, "groups", groupId), {
    members: arrayUnion(userId),
    membersCount: increment(1),
  });
}

export async function leaveGroup(groupId, userId) {
  await updateDoc(doc(db, "groups", groupId), {
    members: arrayRemove(userId),
    membersCount: increment(-1),
  });
}

// ─── Guides ─────────────────────────────────────────────
export async function getGuides() {
  const q = query(collection(db, "guides"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Doctor / Pediatre ──────────────────────────────────
export async function getDoctorArticles() {
  const q = query(collection(db, "doctor_articles"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function submitDoctorQuestion(data) {
  return await addDoc(collection(db, "doctor_questions"), {
    ...data,
    answered: false,
    createdAt: serverTimestamp(),
  });
}

// ─── Quiz ───────────────────────────────────────────────
export async function saveQuizResult(userId, quizId, data) {
  return await addDoc(collection(db, "quiz_results"), {
    userId,
    quizId,
    ...data,
    createdAt: serverTimestamp(),
  });
}

// ─── Admin ──────────────────────────────────────────────
export async function getReportedPosts() {
  const q = query(
    collection(db, "posts"),
    where("reported", "==", true),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function hidePost(postId) {
  await updateDoc(doc(db, "posts", postId), { hidden: true });
}

export async function unhidePost(postId) {
  await updateDoc(doc(db, "posts", postId), { hidden: false, reported: false });
}

export async function getReports() {
  const q = query(
    collection(db, "reports"),
    where("resolved", "==", false),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function resolveReport(reportId) {
  await updateDoc(doc(db, "reports", reportId), { resolved: true });
}

export async function getAllUsers() {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Boutique ─────────────────────────────────────────────
export async function createShopItem(data) {
  const ref = await addDoc(collection(db, "shopItems"), {
    ...data,
    images: data.images || [],
    status: "available",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getShopItems(category = null) {
  let q;
  if (category && category !== "all") {
    q = query(
      collection(db, "shopItems"),
      where("status", "==", "available"),
      where("category", "==", category),
      orderBy("createdAt", "desc")
    );
  } else {
    q = query(
      collection(db, "shopItems"),
      where("status", "==", "available"),
      orderBy("createdAt", "desc")
    );
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getUserShopItems(uid) {
  const q = query(
    collection(db, "shopItems"),
    where("authorId", "==", uid),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateShopItem(itemId, data) {
  await updateDoc(doc(db, "shopItems", itemId), data);
}

export async function deleteShopItem(itemId) {
  await deleteDoc(doc(db, "shopItems", itemId));
}

export async function markItemSold(itemId) {
  await updateDoc(doc(db, "shopItems", itemId), { status: "sold" });
}

// ─── Messagerie ─────────────────────────────────────────────
export async function createConversation(participants, itemInfo = null) {
  // Check if conversation already exists
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", participants[0])
  );
  const snap = await getDocs(q);
  
  if (!snap.empty) {
    return snap.docs[0].id;
  }

  const ref = await addDoc(collection(db, "conversations"), {
    participants,
    itemInfo,
    lastMessage: null,
    lastMessageTime: serverTimestamp(),
    unreadCount: { [participants[0]]: 0, [participants[1]]: 0 },
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function sendMessage(conversationId, senderId, content, type = "text") {
  const messageRef = await addDoc(collection(db, "conversations", conversationId, "messages"), {
    senderId,
    content,
    type,
    timestamp: serverTimestamp(),
    read: false,
  });

  // Update conversation metadata
  await updateDoc(doc(db, "conversations", conversationId), {
    lastMessage: content,
    lastMessageTime: serverTimestamp(),
    [`unreadCount.${senderId}`]: increment(0),
  });

  return messageRef.id;
}

export async function getUserConversations(userId) {
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", userId),
    orderBy("lastMessageTime", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getConversationMessages(conversationId) {
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("timestamp", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function markMessagesAsRead(conversationId, userId) {
  const messagesRef = collection(db, "conversations", conversationId, "messages");
  const q = query(messagesRef, where("senderId", "!=", userId), where("read", "==", false));
  const snap = await getDocs(q);
  
  const batch = writeBatch(db);
  snap.docs.forEach((doc) => {
    batch.update(doc.ref, { read: true });
  });
  
  await batch.commit();
  
  // Reset unread count for this user
  await updateDoc(doc(db, "conversations", conversationId), {
    [`unreadCount.${userId}`]: 0,
  });
}

// ─── Favoris ─────────────────────────────────────────────
export async function toggleFavorite(userId, itemId) {
  const favoriteRef = doc(db, "favorites", `${userId}_${itemId}`);
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
  const q = query(
    collection(db, "favorites"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data().itemId);
}

export async function isItemFavorite(userId, itemId) {
  const snap = await getDoc(doc(db, "favorites", `${userId}_${itemId}`));
  return snap.exists();
}

// ─── Évaluations ─────────────────────────────────────────────
export async function createReview(data) {
  const ref = await addDoc(collection(db, "reviews"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getUserReviews(userId) {
  const q = query(
    collection(db, "reviews"),
    where("revieweeId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getUserRating(userId) {
  const q = query(collection(db, "reviews"), where("revieweeId", "==", userId));
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
  const q = query(
    collection(db, "reviews"),
    where("revieweeId", "==", revieweeId),
    where("reviewerId", "==", reviewerId)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

// ─── Recherche avancée ────────────────────────────────────
export async function searchShopItems(filters = {}) {
  // Use basic query without complex filters to avoid index issues
  let q = query(
    collection(db, "shopItems"),
    where("status", "==", "available"),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);
  let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Apply all filters client-side for now
  if (filters.category && filters.category !== "all") {
    items = items.filter(item => item.category === filters.category);
  }

  if (filters.condition && filters.condition !== "all") {
    items = items.filter(item => item.condition === filters.condition);
  }

  if (filters.minPrice) {
    items = items.filter(item => item.price >= parseFloat(filters.minPrice));
  }

  if (filters.maxPrice) {
    items = items.filter(item => item.price <= parseFloat(filters.maxPrice));
  }

  if (filters.location && filters.location.trim()) {
    items = items.filter(item => 
      item.location && item.location.toLowerCase().includes(filters.location.toLowerCase())
    );
  }

  // Text search
  if (filters.searchQuery && filters.searchQuery.trim()) {
    const query = filters.searchQuery.toLowerCase();
    items = items.filter(item => 
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.authorName.toLowerCase().includes(query)
    );
  }

  return items;
}
