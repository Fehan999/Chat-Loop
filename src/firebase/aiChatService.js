// firebase/aiChatService.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  getDocs,
  serverTimestamp,
  limit,
} from "firebase/firestore";
import { db } from "./config";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI("12345678");

// AI Chat session management
let aiChatSessions = new Map();

export const AI_CHAT_ID = "ai_assistant_chat";
export const AI_USER_ID = "ai_assistant";

export const getOrCreateAIChat = async (userId) => {
  try {
    const chatsRef = collection(db, "chats");
    const q = query(
      chatsRef,
      where("participants", "array-contains", userId),
      where("isAI", "==", true)
    );

    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
    }

    // Create new AI chat
    const aiChat = {
      participants: [userId, AI_USER_ID],
      isAI: true,
      createdAt: serverTimestamp(),
      lastMessage: "Hello! I'm your AI assistant. How can I help you today?",
      lastMessageTime: serverTimestamp(),
      otherUser: {
        uid: AI_USER_ID,
        name: "AI Assistant",
        username: "ai_assistant",
        avatar:
          "https://ui-avatars.com/api/?name=AI&background=10b981&color=fff",
        status: "online",
        isAI: true,
      },
    };

    const docRef = await addDoc(chatsRef, aiChat);
    return { id: docRef.id, ...aiChat };
  } catch (error) {
    console.error("Error creating AI chat:", error);
    throw error;
  }
};

export const sendAIMessage = async (chatId, userMessage, userId, userName) => {
  try {
    // Add user message to Firestore
    const messagesRef = collection(db, "chats", chatId, "messages");
    const userMessageData = {
      text: userMessage,
      senderId: userId,
      senderName: userName,
      timestamp: serverTimestamp(),
      read: true,
      type: "sent",
    };

    const userMsgDoc = await addDoc(messagesRef, userMessageData);

    // Update chat last message
    const chatRef = doc(db, "chats", chatId);
    await updateDoc(chatRef, {
      lastMessage: userMessage,
      lastMessageTime: serverTimestamp(),
    });

    // Get AI response
    const aiResponse = await getAIResponse(userMessage, chatId, userId);

    // Add AI response to Firestore
    const aiMessageData = {
      text: aiResponse,
      senderId: AI_USER_ID,
      senderName: "AI Assistant",
      timestamp: serverTimestamp(),
      read: false,
      type: "received",
      isAI: true,
    };

    const aiMsgDoc = await addDoc(messagesRef, aiMessageData);

    // Update chat last message with AI response
    await updateDoc(chatRef, {
      lastMessage: aiResponse,
      lastMessageTime: serverTimestamp(),
    });

    return aiResponse;
  } catch (error) {
    console.error("Error sending AI message:", error);
    throw error;
  }
};

const getAIResponse = async (userMessage, chatId, userId) => {
  try {
    // Get or create chat session
    let session = aiChatSessions.get(chatId);

    if (!session) {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      // Get conversation history for context
      const history = await getConversationHistory(chatId, userId);

      const chat = model.startChat({
        history: history,
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
        },
      });

      aiChatSessions.set(chatId, chat);
      session = chat;
    }

    const result = await session.sendMessage(userMessage);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error getting AI response:", error);
    return getFallbackResponse(userMessage);
  }
};

const getConversationHistory = async (chatId, userId) => {
  try {
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(
      messagesRef,
      orderBy("timestamp", "desc"),
      limit(10) // Get last 10 messages for context
    );

    const querySnapshot = await getDocs(q);
    const messages = [];

    querySnapshot.docs.reverse().forEach((doc) => {
      const msg = doc.data();
      messages.push({
        role: msg.senderId === userId ? "user" : "model",
        parts: [{ text: msg.text }],
      });
    });

    return messages;
  } catch (error) {
    console.error("Error getting conversation history:", error);
    return [];
  }
};

const getFallbackResponse = (userMessage) => {
  const lowercaseMsg = userMessage.toLowerCase();

  if (lowercaseMsg.includes("hello") || lowercaseMsg.includes("hi")) {
    return "Hello! How can I assist you today?";
  }
  if (lowercaseMsg.includes("how are you")) {
    return "I'm doing great, thank you for asking! How can I help you?";
  }
  if (lowercaseMsg.includes("help")) {
    return "I can help you with various tasks including answering questions, providing information, helping with writing, coding, and much more. What do you need assistance with?";
  }
  if (lowercaseMsg.includes("thank")) {
    return "You're welcome! Is there anything else I can help you with?";
  }

  return "I understand you're asking about something. Could you please provide more details so I can better assist you?";
};

// Listen to AI messages
export const listenToAIMessages = (chatId, callback) => {
  const messagesRef = collection(db, "chats", chatId, "messages");
  const q = query(messagesRef, orderBy("timestamp", "asc"));

  return onSnapshot(q, (snapshot) => {
    const messages = [];
    snapshot.forEach((doc) => {
      messages.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date(),
      });
    });
    callback(messages);
  });
};

// Clear AI chat history
export const clearAIChatHistory = async (chatId) => {
  try {
    const messagesRef = collection(db, "chats", chatId, "messages");
    const querySnapshot = await getDocs(messagesRef);

    const deletePromises = querySnapshot.docs.map((doc) =>
      updateDoc(doc.ref, { text: "[Message deleted]", deleted: true })
    );

    await Promise.all(deletePromises);

    // Reset session
    aiChatSessions.delete(chatId);

    return true;
  } catch (error) {
    console.error("Error clearing AI chat history:", error);
    return false;
  }
};

// Get AI typing indicator
export const setAITypingIndicator = async (chatId, isTyping) => {
  try {
    const chatRef = doc(db, "chats", chatId);
    await updateDoc(chatRef, {
      aiTyping: isTyping,
      aiTypingTimestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error setting AI typing indicator:", error);
  }
};
