/**
 * One-time script to delete duplicate conversations in Firestore.
 * 
 * Usage:
 *   1. Download your service account key from:
 *      Firebase Console → Project Settings → Service Accounts → Generate new private key
 *   2. Save it as scripts/serviceAccount.json
 *   3. Run: node scripts/cleanup-duplicate-conversations.js
 */

const admin = require("firebase-admin");
const path = require("path");

const SERVICE_ACCOUNT_PATH = path.join(__dirname, "serviceAccount.json");

let serviceAccount;
try {
  serviceAccount = require(SERVICE_ACCOUNT_PATH);
} catch {
  console.error("❌ Missing scripts/serviceAccount.json");
  console.error("   Download it from: Firebase Console → Project Settings → Service Accounts → Generate new private key");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

function buildParticipantsKey(participants = []) {
  return [...new Set(participants.filter(Boolean))].sort().join("__");
}

async function deleteCollectionRecursive(ref) {
  const snap = await ref.listCollections();
  for (const col of snap) {
    const docs = await col.get();
    for (const d of docs.docs) {
      await deleteCollectionRecursive(d.ref);
      await d.ref.delete();
    }
  }
}

async function cleanupDuplicates() {
  console.log("🔍 Fetching all conversations...");
  const snap = await db.collection("conversations").get();
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  console.log(`   Found ${all.length} total conversations`);

  const groups = new Map();
  for (const conv of all) {
    const participants = Array.isArray(conv.participants) ? conv.participants : [];
    if (participants.length === 0) continue;
    const key = buildParticipantsKey(participants);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(conv);
  }

  let deleted = 0;
  for (const [key, group] of groups.entries()) {
    if (group.length <= 1) continue;

    group.sort((a, b) => {
      const ta = a.lastMessageTime?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
      const tb = b.lastMessageTime?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });

    const [keep, ...toDelete] = group;
    console.log(`\n📂 Key: ${key}`);
    console.log(`   ✅ Keep: ${keep.id} (lastMessage: ${keep.lastMessage || "—"})`);

    for (const conv of toDelete) {
      console.log(`   🗑️  Delete: ${conv.id}`);
      const ref = db.collection("conversations").doc(conv.id);
      const messagesSnap = await ref.collection("messages").get();
      const batch = db.batch();
      messagesSnap.docs.forEach((m) => batch.delete(m.ref));
      batch.delete(ref);
      await batch.commit();
      deleted++;
    }
  }

  console.log(`\n✅ Done. Deleted ${deleted} duplicate conversation(s).`);
  process.exit(0);
}

cleanupDuplicates().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
