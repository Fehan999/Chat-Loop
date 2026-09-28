import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { MESSAGE_PAGE_SIZE } from "../constants";
import { toDate } from "../utils/dateUtils";
import { generateUniqueIdWithTimestamp } from "../utils/generateUserId";
import { db } from "./config";

// users

export const usersCollection = collection(db, "users");
export const getUserDoc = (userId) => doc(db, "users", userId);

export const getUserData = async (userId) => {
  if (!userId) return null;
  try {
    const snap = await getDoc(getUserDoc(userId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
};

// live copy of one user doc. used for the signed in user and every friend
export const listenToUser = (userId, callback) =>
  onSnapshot(
    getUserDoc(userId),
    (snap) => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    (error) => {
      console.error("User listener failed:", error);
      callback(null);
    }
  );

// merge write so it never wipes profile fields, and no read beforehand
export const updateUserStatus = async (userId, status) => {
  if (!userId) return;
  try {
    await setDoc(
      getUserDoc(userId),
      { uid: userId, status, lastSeen: serverTimestamp() },
      { merge: true }
    );
  } catch (error) {
    console.error("Error updating user status:", error);
  }
};

// shape of a brand new user doc, shared by email and social sign up.
// merge because the presence write may have created the doc a moment earlier
export const createUserProfile = async ({
  uid,
  name,
  email,
  phone = "",
  bio = "",
  avatar = "",
}) => {
  const uniqueId = generateUniqueIdWithTimestamp();
  const profile = {
    uid,
    name,
    email,
    phone,
    bio,
    avatar,
    uniqueId,
    username: `@${name.replace(/\s+/g, "").toLowerCase()}_${uniqueId}`,
    location: "",
    friends: [],
    status: "online",
    showActiveStatus: true,
    lastSeen: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(getUserDoc(uid), profile, { merge: true });
  return profile;
};

export const updateUserProfile = async (userId, data) => {
  try {
    await updateDoc(getUserDoc(userId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Error updating profile:", error);
    return false;
  }
};

// the 4 digit ids aren't guaranteed unique, so this can return a few people
export const findUsersByUniqueId = async (uniqueId, excludeId) => {
  const snap = await getDocs(
    query(usersCollection, where("uniqueId", "==", uniqueId.trim()), limit(10))
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((u) => u.id !== excludeId && u.email);
};

// chats

export const chatsCollection = collection(db, "chats");
export const getChatDoc = (chatId) => doc(db, "chats", chatId);

// one chat per pair of users, the id is just both uids sorted
export const chatIdFor = (userId1, userId2) => [userId1, userId2].sort().join("_");

export const getOrCreateChat = async (userId1, userId2) => {
  try {
    const chatId = chatIdFor(userId1, userId2);
    const chatRef = getChatDoc(chatId);
    const snap = await getDoc(chatRef);
    if (snap.exists()) return { id: chatId, ...snap.data() };

    const newChat = {
      participants: [userId1, userId2],
      createdAt: serverTimestamp(),
      lastMessage: "",
      lastMessageTime: serverTimestamp(),
      lastMessageSender: "",
      type: "private",
      unreadCounts: { [userId1]: 0, [userId2]: 0 },
    };
    await setDoc(chatRef, newChat);
    return { id: chatId, ...newChat };
  } catch (error) {
    console.error("Error creating chat:", error);
    return null;
  }
};

// profiles are not joined in here on purpose, the dashboard keeps its own live
// listeners for them so a status change doesn't refetch every chat
export const listenToChats = (userId, callback) => {
  const q = query(chatsCollection, where("participants", "array-contains", userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const chats = snapshot.docs.map((d) => {
        const data = d.data({ serverTimestamps: "estimate" });
        return {
          id: d.id,
          ...data,
          otherUserId: data.participants?.find((id) => id !== userId) || null,
          lastMessageTime: toDate(data.lastMessageTime),
        };
      });
      callback(chats);
    },
    (error) => console.error("Chats listener failed:", error)
  );
};

// messages

const messagesRef = (chatId) => collection(db, "messages", chatId, "messages");

// short text for the sidebar when a message is only media
export const previewFor = (text, attachments = []) => {
  if (text?.trim()) return text.trim();
  const first = attachments?.[0];
  if (!first) return "";
  if (first.isVoice || first.type?.startsWith("audio/")) return "🎤 Voice message";
  if (first.type?.startsWith("image/")) {
    return attachments.length > 1 ? `📷 ${attachments.length} photos` : "📷 Photo";
  }
  return `📎 ${first.name || "File"}`;
};

// message + chat summary go out in one batch, so the sidebar can't drift
// from what's actually in the conversation
export const sendMessage = async (chatId, messageData, recipientId) => {
  try {
    const batch = writeBatch(db);
    const messageRef = doc(messagesRef(chatId));

    batch.set(messageRef, {
      ...messageData,
      timestamp: serverTimestamp(),
      read: false,
      createdAt: new Date().toISOString(),
    });

    const chatUpdate = {
      lastMessage: previewFor(messageData.text, messageData.attachments),
      lastMessageTime: serverTimestamp(),
      lastMessageSender: messageData.senderId,
    };
    if (recipientId) chatUpdate[`unreadCounts.${recipientId}`] = increment(1);
    batch.update(getChatDoc(chatId), chatUpdate);

    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error sending message:", error);
    return false;
  }
};

// only the latest page is kept live, older ones come in when the user scrolls up
export const listenToMessages = (chatId, callback, pageSize = MESSAGE_PAGE_SIZE) => {
  const q = query(messagesRef(chatId), orderBy("timestamp", "asc"), limitToLast(pageSize));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs.map((d) => {
        const data = d.data({ serverTimestamps: "estimate" });
        return {
          id: d.id,
          ...data,
          timestamp: toDate(data.timestamp),
          pending: d.metadata.hasPendingWrites,
        };
      });
      callback(messages);
    },
    (error) => console.error("Messages listener failed:", error)
  );
};

// flips read receipts on the messages we have in memory and resets our badge
export const markMessagesAsRead = async (chatId, userId, messages = []) => {
  try {
    const unread = messages
      .filter((m) => !m.read && m.senderId !== userId && !m.pending)
      .slice(0, 450);

    const batch = writeBatch(db);
    unread.forEach((m) => batch.update(doc(messagesRef(chatId), m.id), { read: true }));
    batch.update(getChatDoc(chatId), { [`unreadCounts.${userId}`]: 0 });
    await batch.commit();
  } catch (error) {
    console.error("Error marking messages as read:", error);
  }
};

// typing indicator

export const updateTypingStatus = async (chatId, userId, isTyping) => {
  if (!chatId || !userId) return;
  try {
    await setDoc(
      doc(db, "typing", chatId),
      { [userId]: isTyping, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (error) {
    console.error("Error updating typing status:", error);
  }
};

export const listenToTypingStatus = (chatId, callback) =>
  onSnapshot(
    doc(db, "typing", chatId),
    (snap) => callback(snap.exists() ? snap.data() : {}),
    () => callback({})
  );

// wipes the messages for both people. batches are capped at 500 writes
// so big conversations get deleted in chunks
export const deleteConversation = async (chatId, userId) => {
  try {
    const snapshot = await getDocs(messagesRef(chatId));
    const docs = snapshot.docs;

    for (let i = 0; i < docs.length; i += 450) {
      const batch = writeBatch(db);
      docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    await updateDoc(getChatDoc(chatId), {
      lastMessage: "",
      lastMessageTime: serverTimestamp(),
      lastMessageSender: userId,
      unreadCounts: {},
    });
    return true;
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return false;
  }
};

// remembers the last announcement this person has seen, so it pops up only once
// on every device they use
export const markAnnouncementSeen = (userId, version) =>
  updateDoc(getUserDoc(userId), { seenAnnouncement: version }).catch((error) =>
    console.error("Couldn't save announcement as seen:", error)
  );

// app wide announcement, edited from the admin panel
export const listenToAnnouncement = (callback) =>
  onSnapshot(
    doc(db, "appConfig", "announcement"),
    (snap) => callback(snap.exists() ? snap.data() : null),
    () => callback(null)
  );
