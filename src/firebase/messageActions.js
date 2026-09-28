import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { deleteFilesFromSupabase } from "../utils/supabase";
import { previewFor } from "./firestoreService";
import { db } from "./config";

const messageDoc = (chatId, messageId) => doc(db, "messages", chatId, "messages", messageId);

// reactions are stored as { [userId]: emoji }, one reaction per person.
// picking the same emoji again removes it. no read needed since the ui
// already knows what the user reacted with
export const toggleMessageReaction = async (
  chatId,
  messageId,
  userId,
  reaction,
  currentReaction
) => {
  try {
    await updateDoc(messageDoc(chatId, messageId), {
      [`reactions.${userId}`]: currentReaction === reaction ? deleteField() : reaction,
    });
    return true;
  } catch (error) {
    console.error("Error toggling reaction:", error);
    return false;
  }
};

// { userId: emoji } -> [{ emoji, count, users }] sorted by most used
export const getGroupedReactions = (reactions) => {
  if (!reactions) return [];
  const grouped = new Map();

  Object.entries(reactions).forEach(([userId, emoji]) => {
    if (typeof emoji !== "string") return;
    if (!grouped.has(emoji)) grouped.set(emoji, { emoji, count: 0, users: [] });
    const entry = grouped.get(emoji);
    entry.count += 1;
    entry.users.push(userId);
  });

  return Array.from(grouped.values()).sort((a, b) => b.count - a.count);
};

export const editMessage = async (chatId, messageId, newText, userId) => {
  try {
    const ref = messageDoc(chatId, messageId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("Message not found");

    const data = snap.data();
    if (data.senderId !== userId) throw new Error("You can only edit your own messages");

    const text = newText.trim();
    if (!text || data.text === text) return true;

    // serverTimestamp() isn't allowed inside arrays, so history uses a plain date
    await updateDoc(ref, {
      text,
      edited: true,
      lastEdited: serverTimestamp(),
      editHistory: [
        ...(data.editHistory || []),
        { text: data.text, editedAt: new Date().toISOString() },
      ],
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Error editing message:", error);
    return false;
  }
};

// soft delete, the bubble stays as "This message was deleted".
// uploaded files are removed from storage too
export const deleteMessage = async (chatId, message, userId) => {
  try {
    if (message.senderId !== userId) throw new Error("You can only delete your own messages");

    await updateDoc(messageDoc(chatId, message.id), {
      deleted: true,
      text: "",
      attachments: [],
      reactions: {},
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const paths = (message.attachments || []).map((file) => file.path);
    deleteFilesFromSupabase(paths);
    return true;
  } catch (error) {
    console.error("Error deleting message:", error);
    return false;
  }
};

// reports show up in the admin panel
export const reportMessage = async (chatId, message, userId, reason) => {
  try {
    await addDoc(collection(db, "reports"), {
      type: "message",
      chatId,
      messageId: message.id,
      messageText: message.text || "",
      reportedUserId: message.senderId || null,
      reportedBy: userId,
      reason,
      status: "pending",
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Error reporting message:", error);
    return false;
  }
};

// a user report either points at one of their messages as proof, or reports the
// whole account by its id so the team can go through it
export const reportUser = async (reportedUser, userId, { reason, details, message, chatId }) => {
  const profile = reportedUser.profile || reportedUser;
  try {
    await addDoc(collection(db, "reports"), {
      type: "user",
      reportedUserId: reportedUser.userId || reportedUser.id,
      reportedUserName: reportedUser.name || profile.name || "",
      reportedUserUniqueId: profile.uniqueId || "",
      reportedUsername: profile.username || "",
      reportedBy: userId,
      reason: details ? `${reason} - ${details}` : reason,
      ...(message
        ? {
            chatId,
            messageId: message.id,
            messageText: message.text || previewFor("", message.attachments),
          }
        : {}),
      status: "pending",
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Error reporting user:", error);
    return false;
  }
};
