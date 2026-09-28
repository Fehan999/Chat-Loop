import {
  collection,
  collectionGroup,
  doc,
  getCountFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { ADMIN_EMAILS, GUEST_EMAIL } from "../constants";
import { toDate } from "../utils/dateUtils";
import { db } from "./config";

const emailOf = (user) => user?.email?.toLowerCase() || "";

// the same checks live in firestore.rules, these only decide what the ui shows
export const isOwnerAccount = (user) =>
  ADMIN_EMAILS.includes(emailOf(user)) && user.emailVerified === true;

export const ownerNeedsVerification = (user) =>
  ADMIN_EMAILS.includes(emailOf(user)) && !user.emailVerified;

export const isGuestAccount = (user) => emailOf(user) === GUEST_EMAIL;

// shown to guests instead of the real address, e.g. "jo•••@gmail.com"
export const maskEmail = (email = "") => {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  return `${name.slice(0, 2)}•••@${domain}`;
};

// the listeners are used by the admin and the guest login, the writes are admin only

export const listenToAllUsers = (callback) =>
  onSnapshot(
    collection(db, "users"),
    (snapshot) =>
      callback(
        snapshot.docs
          .filter((d) => d.data().email)
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              ...data,
              createdAt: toDate(data.createdAt),
              lastSeen: toDate(data.lastSeen),
            };
          })
      ),
    (error) => {
      // usually means the latest firestore.rules aren't deployed yet
      console.error("Admin users listener failed:", error);
      callback([]);
    }
  );

export const listenToReports = (callback) =>
  onSnapshot(
    query(collection(db, "reports"), orderBy("createdAt", "desc"), limit(200)),
    (snapshot) =>
      callback(
        snapshot.docs.map((d) => {
          const data = d.data();
          return { id: d.id, ...data, createdAt: toDate(data.createdAt) };
        })
      ),
    (error) => {
      // usually means the latest firestore.rules aren't deployed yet
      console.error("Admin reports listener failed:", error);
      callback([]);
    }
  );

const countOf = async (q) => (await getCountFromServer(q)).data().count;

// counts are aggregation queries, firestore doesn't download the documents.
// they need read access to every chat though, so only the admin runs them.
//
// ai chat history also lives in subcollections called "messages", so the chat
// messages are the ones with a senderId (ai messages only have a role). that
// filter needs the collection group index in firestore.indexes.json, until it's
// deployed the total is shown as is.
// a chat doc exists as soon as someone opens a friend's chat, so conversations
// only count chats that have a last message
export const fetchCounts = async () => {
  const everything = collectionGroup(db, "messages");
  const [all, chatMessages, conversations] = await Promise.allSettled([
    countOf(everything),
    countOf(query(everything, where("senderId", "!=", null))),
    countOf(query(collection(db, "chats"), where("lastMessage", ">", ""))),
  ]);
  if (chatMessages.status === "rejected") {
    console.warn("Message count without the ai filter:", chatMessages.reason?.message);
  }

  const total = all.status === "fulfilled" ? all.value : null;
  const messages = chatMessages.status === "fulfilled" ? chatMessages.value : total;
  return {
    messages,
    aiMessages: chatMessages.status === "fulfilled" && total !== null ? total - messages : null,
    conversations: conversations.status === "fulfilled" ? conversations.value : null,
  };
};

// the admin's latest counts are saved here so the guest login can show them
// without being able to read anyone's chats
export const saveStats = (counts) =>
  setDoc(doc(db, "appConfig", "stats"), { ...counts, updatedAt: serverTimestamp() });

export const listenToStatsDoc = (callback) =>
  onSnapshot(
    doc(db, "appConfig", "stats"),
    (snap) => {
      const data = snap.exists() ? snap.data() : null;
      callback(data ? { ...data, updatedAt: toDate(data.updatedAt) } : null);
    },
    () => callback(null)
  );

// unsuspending clears the reason too, so nothing is left over if they're suspended again
const banFields = (banned, reason = "") => ({
  banned,
  banReason: banned ? reason : "",
  bannedAt: banned ? serverTimestamp() : null,
});

export const setUserBanned = (userId, banned, reason = "") =>
  updateDoc(doc(db, "users", userId), banFields(banned, reason));

// profile edits and the suspend switch go out as one write
export const saveUserAsAdmin = (userId, profile, ban) =>
  updateDoc(doc(db, "users", userId), {
    ...profile,
    ...(ban ? banFields(ban.banned, ban.reason) : {}),
    updatedAt: serverTimestamp(),
  });

export const updateReportStatus = (reportId, status) =>
  updateDoc(doc(db, "reports", reportId), { status, reviewedAt: serverTimestamp() });

export const removeReportedMessage = (chatId, messageId) =>
  updateDoc(doc(db, "messages", chatId, "messages", messageId), {
    deleted: true,
    text: "",
    attachments: [],
    reactions: {},
    removedByAdmin: true,
    deletedAt: serverTimestamp(),
  });

export const listenToAnnouncementDoc = (callback) =>
  onSnapshot(
    doc(db, "appConfig", "announcement"),
    (snap) => callback(snap.exists() ? snap.data() : { text: "", active: false }),
    () => callback({ text: "", active: false })
  );

export const saveAnnouncement = ({ title, text, active }) =>
  setDoc(doc(db, "appConfig", "announcement"), {
    title: title.trim(),
    text: text.trim(),
    active,
    updatedAt: serverTimestamp(),
  });
