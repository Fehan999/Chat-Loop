import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./config";

// ==================== USER FUNCTIONS ====================

export const usersCollection = collection(db, "users");
export const getUserDoc = (userId) => doc(db, "users", userId);

export const getUserData = async (userId) => {
  if (!userId) return null;
  try {
    const userDoc = await getDoc(getUserDoc(userId));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
};

export const updateUserStatus = async (userId, status) => {
  try {
    const userRef = getUserDoc(userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      await updateDoc(userRef, {
        status,
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      // Create document if it doesn't exist
      await setDoc(userRef, {
        status,
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp(),
        uid: userId,
        createdAt: serverTimestamp(),
      });
    }
    console.log(
      `[Status] ${userId} → ${status} at ${new Date().toLocaleTimeString()}`
    );
  } catch (error) {
    console.error("Error updating user status:", error);
  }
};

//  listener for timestamp handling
export const listenToUserStatus = (userId, callback) => {
  const userRef = getUserDoc(userId);
  return onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      let lastSeen = data.lastSeen;

      // Convert Firestore timestamp to Date if needed
      if (lastSeen && lastSeen.toDate) {
        lastSeen = lastSeen.toDate();
      }

      callback(data.status || "offline", lastSeen);
    } else {
      callback("offline", null);
    }
  });
};

export const updateUserProfile = async (userId, data) => {
  try {
    const userRef = getUserDoc(userId);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Error updating profile:", error);
    return false;
  }
};

// ==================== FRIEND FUNCTIONS ====================

export const sendFriendRequest = async (fromUserId, toUserId) => {
  try {
    // Check if request already exists
    const existingRequest = query(
      collection(db, "friendRequests"),
      where("senderId", "==", fromUserId),
      where("receiverId", "==", toUserId)
    );
    const existingSnapshot = await getDocs(existingRequest);

    const friendRequest = {
      senderId: fromUserId,
      receiverId: toUserId,
      status: "pending",
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, "friendRequests"), friendRequest);
    return true;
  } catch (error) {
    console.error("Error sending friend request:", error);
    return false;
  }
};

export const acceptFriendRequest = async (
  requestId,
  currentUserId,
  requesterId
) => {
  try {
    const requestRef = doc(db, "friendRequests", requestId);
    await updateDoc(requestRef, {
      status: "accepted",
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Error accepting friend request:", error);
    return false;
  }
};

export const rejectFriendRequest = async (requestId) => {
  try {
    const requestRef = doc(db, "friendRequests", requestId);
    await updateDoc(requestRef, {
      status: "rejected",
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Error rejecting friend request:", error);
    return false;
  }
};

export const getFriendRequests = (userId, callback) => {
  const q = query(
    collection(db, "friendRequests"),
    where("receiverId", "==", userId),
    where("status", "==", "pending")
  );

  return onSnapshot(q, async (snapshot) => {
    const requests = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const requesterData = await getUserData(data.senderId);
      requests.push({
        id: doc.id,
        ...data,
        requester: requesterData,
      });
    }
    callback(requests);
  });
};

// ==================== CHAT FUNCTIONS ====================

export const chatsCollection = collection(db, "chats");
export const getChatDoc = (chatId) => doc(db, "chats", chatId);

export const getOrCreateChat = async (userId1, userId2) => {
  try {
    // Create a unique chat ID by sorting user IDs (without any prefix)
    const chatId = [userId1, userId2].sort().join("_");

    // Check if chat already exists
    const chatRef = doc(db, "chats", chatId);
    const chatDoc = await getDoc(chatRef);

    if (chatDoc.exists()) {
      return { id: chatDoc.id, ...chatDoc.data() };
    }

    // Create new chat with deterministic ID
    const newChat = {
      participants: [userId1, userId2],
      createdAt: serverTimestamp(),
      lastMessage: "",
      lastMessageTime: serverTimestamp(),
      lastMessageSender: "",
      type: "private",
    };

    await setDoc(chatRef, newChat);
    return { id: chatId, ...newChat };
  } catch (error) {
    console.error("Error creating chat:", error);
    return null;
  }
};

// Fixed: Get user chats with deterministic IDs
export const getUserChats = (userId, callback) => {
  const q = query(
    chatsCollection,
    where("participants", "array-contains", userId)
  );

  return onSnapshot(q, async (snapshot) => {
    const chats = [];
    for (const doc of snapshot.docs) {
      const chatData = doc.data();
      const otherParticipantId = chatData.participants?.find(
        (id) => id !== userId
      );
      if (otherParticipantId) {
        const otherUser = await getUserData(otherParticipantId);
        if (otherUser) {
          chats.push({
            id: doc.id,
            ...chatData,
            otherUser,
          });
        }
      }
    }
    // Sort manually after fetching
    chats.sort((a, b) => {
      const timeA = a.lastMessageTime?.toDate?.() || new Date(0);
      const timeB = b.lastMessageTime?.toDate?.() || new Date(0);
      return timeB - timeA;
    });
    callback(chats);
  });
};

// ==================== MESSAGE FUNCTIONS ====================

export const sendMessage = async (chatId, messageData) => {
  try {
    // First, verify the chat document exists
    const chatRef = doc(db, "chats", chatId);
    const chatDoc = await getDoc(chatRef);

    if (!chatDoc.exists()) {
      console.error("Chat document does not exist:", chatId);
      return false;
    }

    const messagesRef = collection(db, "messages", chatId, "messages");

    const message = {
      ...messageData,
      timestamp: serverTimestamp(),
      read: false,
      createdAt: new Date().toISOString(),
    };

    await addDoc(messagesRef, message);

    await updateDoc(chatRef, {
      lastMessage: messageData.text,
      lastMessageTime: serverTimestamp(),
      lastMessageSender: messageData.senderId,
    });

    return true;
  } catch (error) {
    console.error("Error sending message:", error);
    return false;
  }
};

export const listenToMessages = (chatId, callback) => {
  const messagesRef = collection(db, "messages", chatId, "messages");
  const q = query(messagesRef);

  return onSnapshot(q, (snapshot) => {
    const messages = [];
    snapshot.forEach((doc) => {
      const data = doc.data();

      // Properly handle Firestore Timestamp
      let timestamp = data.timestamp;
      let formattedTime = "Just now";

      if (timestamp) {
        if (timestamp.toDate) {
          const date = timestamp.toDate();
          formattedTime = date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
          timestamp = date;
        } else if (timestamp instanceof Date) {
          formattedTime = timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
        }
      }

      messages.push({
        id: doc.id,
        ...data,
        timestamp: timestamp,
        formattedTime: formattedTime,
      });
    });

    messages.sort((a, b) => {
      const timeA = a.timestamp?.getTime?.() || 0;
      const timeB = b.timestamp?.getTime?.() || 0;
      return timeA - timeB;
    });

    callback(messages);
  });
};

export const markMessagesAsRead = async (chatId, userId) => {
  try {
    const messagesRef = collection(db, "messages", chatId, "messages");
    const q = query(messagesRef, where("read", "==", false));
    const querySnapshot = await getDocs(q);

    const batch = writeBatch(db);
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.senderId !== userId) {
        batch.update(doc.ref, { read: true });
      }
    });

    await batch.commit();
  } catch (error) {
    console.error("Error marking messages as read:", error);
  }
};

export const uploadFile = async (file, userId, chatId) => {
  try {
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${timestamp}_${safeFileName}`;
    const filePath = `chats/${chatId}/${fileName}`;

    const storageRef = ref(storage, filePath);

    const metadata = {
      contentType: file.type,
      customMetadata: {
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
      },
    };

    const snapshot = await uploadBytes(storageRef, file, metadata);

    const url = await getDownloadURL(snapshot.ref);

    console.log("Upload successful, URL:", url);

    return {
      name: file.name,
      url, // This URL already has a token and will work
      type: file.type,
      size: file.size,
    };
  } catch (error) {
    console.error("Upload error:", error);
    return null;
  }
};

export const getUserFriends = async (userId) => {
  try {
    const q = query(
      collection(db, "friendRequests"),
      where("status", "==", "accepted"),
      where("senderId", "==", userId)
    );

    const q2 = query(
      collection(db, "friendRequests"),
      where("status", "==", "accepted"),
      where("receiverId", "==", userId)
    );

    const [sentSnapshot, receivedSnapshot] = await Promise.all([
      getDocs(q),
      getDocs(q2),
    ]);

    const friendIds = [];

    sentSnapshot.forEach((doc) => {
      const data = doc.data();
      friendIds.push(data.receiverId);
    });

    receivedSnapshot.forEach((doc) => {
      const data = doc.data();
      friendIds.push(data.senderId);
    });

    const friends = [];
    for (const friendId of friendIds) {
      const friendData = await getUserData(friendId);
      if (friendData) {
        friends.push(friendData);
      }
    }

    return friends;
  } catch (error) {
    console.error("Error getting user friends:", error);
    return [];
  }
};

export const listenToUserFriends = (userId, callback) => {
  const q = query(
    collection(db, "friendRequests"),
    where("status", "==", "accepted"),
    where("senderId", "==", userId)
  );

  const q2 = query(
    collection(db, "friendRequests"),
    where("status", "==", "accepted"),
    where("receiverId", "==", userId)
  );

  const unsub1 = onSnapshot(q, async () => {
    const friends = await getUserFriends(userId);
    callback(friends);
  });

  const unsub2 = onSnapshot(q2, async () => {
    const friends = await getUserFriends(userId);
    callback(friends);
  });

  return () => {
    unsub1();
    unsub2();
  };
};

export const initializeChatsForFriends = async (userId, friendsList) => {
  try {
    const friends = friendsList || (await getUserFriends(userId));

    for (const friend of friends) {
      const chat = await getOrCreateChat(userId, friend.id);
    }

    return true;
  } catch (error) {
    console.error("Error initializing chats:", error);
    return false;
  }
};
// Typing Indicator
export const updateTypingStatus = async (chatId, userId, isTyping) => {
  try {
    const typingRef = doc(db, "typing", chatId);
    await setDoc(
      typingRef,
      {
        [userId]: isTyping,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error updating typing status:", error);
  }
};

export const listenToTypingStatus = (chatId, callback) => {
  const typingRef = doc(db, "typing", chatId);
  return onSnapshot(typingRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    } else {
      callback({});
    }
  });
};

// Delete conversation
export const deleteConversation = async (chatId, userId) => {
  try {
    // Delete all messages in the chat
    const messagesRef = collection(db, "messages", chatId, "messages");
    const messagesSnapshot = await getDocs(messagesRef);

    const batch = writeBatch(db);
    messagesSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Update chat last message
    const chatRef = getChatDoc(chatId);
    batch.update(chatRef, {
      lastMessage: "Conversation deleted",
      lastMessageTime: serverTimestamp(),
      lastMessageSender: userId,
      deletedBy: arrayUnion(userId),
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return false;
  }
};
// Update unread count for a chat
export const updateUnreadCount = async (chatId, userId) => {
  try {
    const userRef = getUserDoc(userId);
    await updateDoc(userRef, {
      [`unreadCounts.${chatId}`]: 0,
    });
    return true;
  } catch (error) {
    console.error("Error updating unread count:", error);
    return false;
  }
};

// Increment unread count for a chat
export const incrementUnreadCount = async (chatId, userId) => {
  try {
    const userRef = getUserDoc(userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const currentCount = userDoc.data()?.unreadCounts?.[chatId] || 0;
      await updateDoc(userRef, {
        [`unreadCounts.${chatId}`]: currentCount + 1,
      });
    }
    return true;
  } catch (error) {
    console.error("Error incrementing unread count:", error);
    return false;
  }
};

// Listen to unread counts
export const listenToUnreadCounts = (userId, callback) => {
  const userRef = getUserDoc(userId);
  return onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      callback(data.unreadCounts || {});
    }
  });
};

export const updateUserAvatar = async (userId, avatarUrl) => {
  try {
    const userRef = getUserDoc(userId);
    await updateDoc(userRef, {
      avatar: avatarUrl,
      photoURL: avatarUrl,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error("Error updating avatar:", error);
    return false;
  }
};
