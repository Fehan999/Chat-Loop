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

// the listeners are used by the owner and the guest login, the writes are owner only

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

// counts are aggregation queries, firestore doesn't download the documents.
// they need read access to every chat though, so only the owner gets them
export const fetchCounts = async () => {
  const [chats, messages] = await Promise.all([
    getCountFromServer(collection(db, "chats")),
    getCountFromServer(collectionGroup(db, "messages")),
  ]);
  return { conversations: chats.data().count, messages: messages.data().count };
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

export const updateUserAsAdmin = (userId, patch) =>
  updateDoc(doc(db, "users", userId), { ...patch, updatedAt: serverTimestamp() });

export const setUserBanned = (userId, banned, reason = "") =>
  updateDoc(doc(db, "users", userId), {
    banned,
    banReason: banned ? reason : "",
    bannedAt: banned ? serverTimestamp() : null,
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
