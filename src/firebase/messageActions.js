import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./config";

// ==================== MESSAGE REACTIONS ====================

/**
 * Toggle a reaction on a message - ONE REACTION PER USER
 * If user has a reaction, it gets replaced with the new one
 * If user clicks the same reaction, it gets removed
 */
export const toggleMessageReaction = async (
  chatId,
  messageId,
  userId,
  reaction
) => {
  try {
    const messageRef = doc(db, "messages", chatId, "messages", messageId);
    const messageDoc = await getDoc(messageRef);

    if (messageDoc.exists()) {
      const currentReactions = messageDoc.data().reactions || {};
      const currentUserReaction = currentReactions[userId];

      if (currentUserReaction === reaction) {
        // Remove reaction if clicking the same one
        const newReactions = { ...currentReactions };
        delete newReactions[userId];
        await updateDoc(messageRef, {
          reactions: newReactions,
          updatedAt: serverTimestamp(),
        });
        console.log(`Reaction ${reaction} removed from message ${messageId}`);
      } else {
        // Replace with new reaction (overwrite existing)
        await updateDoc(messageRef, {
          [`reactions.${userId}`]: reaction,
          updatedAt: serverTimestamp(),
        });
        console.log(`Reaction ${reaction} added to message ${messageId}`);
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error toggling reaction:", error);
    return false;
  }
};

/**
 * Get all reactions for a message grouped by emoji
 */
export const getGroupedReactions = (reactions) => {
  if (!reactions) return [];

  const reactionMap = new Map();

  Object.entries(reactions).forEach(([userId, emoji]) => {
    if (!reactionMap.has(emoji)) {
      reactionMap.set(emoji, { emoji, count: 0, users: [] });
    }
    const reaction = reactionMap.get(emoji);
    reaction.count++;
    reaction.users.push(userId);
  });

  return Array.from(reactionMap.values()).sort((a, b) => b.count - a.count);
};

// ==================== MESSAGE EDITING ====================

export const editMessage = async (chatId, messageId, newText, userId) => {
  try {
    const messageRef = doc(db, "messages", chatId, "messages", messageId);
    const messageDoc = await getDoc(messageRef);

    if (!messageDoc.exists()) {
      throw new Error("Message not found");
    }

    const messageData = messageDoc.data();

    if (messageData.senderId !== userId) {
      throw new Error("You can only edit your own messages");
    }

    if (messageData.text === newText.trim()) {
      return true;
    }

    const editHistory = messageData.editHistory || [];

    await updateDoc(messageRef, {
      text: newText.trim(),
      edited: true,
      lastEdited: serverTimestamp(),
      editHistory: [
        ...editHistory,
        {
          text: messageData.text,
          timestamp: serverTimestamp(),
        },
      ],
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error("Error editing message:", error);
    return false;
  }
};

// ==================== MESSAGE DELETION ====================

export const deleteMessage = async (chatId, messageId, userId) => {
  try {
    const messageRef = doc(db, "messages", chatId, "messages", messageId);
    const messageDoc = await getDoc(messageRef);

    if (!messageDoc.exists()) {
      throw new Error("Message not found");
    }

    const messageData = messageDoc.data();

    if (messageData.senderId !== userId) {
      throw new Error("You can only delete your own messages");
    }

    await updateDoc(messageRef, {
      deleted: true,
      text: "This message was deleted",
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      reactions: {},
    });

    return true;
  } catch (error) {
    console.error("Error deleting message:", error);
    return false;
  }
};

// ==================== MESSAGE REPORTING ====================

export const reportMessage = async (chatId, messageId, userId, reason) => {
  try {
    const reportRef = collection(db, "reports");
    await addDoc(reportRef, {
      chatId,
      messageId,
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
