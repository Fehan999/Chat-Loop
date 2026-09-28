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
import { ADMIN_EMAIL } from "../constants";
import { toDate } from "../utils/dateUtils";
import { db } from "./config";

// the same check lives in firestore.rules, this one only decides what the ui shows
export const isOwnerAccount = (user) =>
  !!user && user.email?.toLowerCase() === ADMIN_EMAIL && user.emailVerified === true;

export const ownerNeedsVerification = (user) =>
  !!user && user.email?.toLowerCase() === ADMIN_EMAIL && !user.emailVerified;

// everything below is only ever called in owner mode

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
    (error) => console.error("Admin users listener failed:", error)
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
    (error) => console.error("Admin reports listener failed:", error)
  );

// counts are aggregation queries, firestore doesn't download the documents
export const fetchCounts = async () => {
  const [chats, messages] = await Promise.all([
    getCountFromServer(collection(db, "chats")),
    getCountFromServer(collectionGroup(db, "messages")),
  ]);
  return { conversations: chats.data().count, messages: messages.data().count };
};

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

export const saveAnnouncement = ({ text, active }) =>
  setDoc(doc(db, "appConfig", "announcement"), {
    text: text.trim(),
    active,
    updatedAt: serverTimestamp(),
  });
