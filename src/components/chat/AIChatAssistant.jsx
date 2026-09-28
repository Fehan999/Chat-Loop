// // firebase/aiChatService.js
// import { GoogleGenerativeAI } from "@google/generative-ai";
// import {
//   collection,
//   addDoc,
//   query,
//   where,
//   orderBy,
//   onSnapshot,
//   updateDoc,
//   doc,
//   getDocs,
//   serverTimestamp,
//   limit,
//   getDoc,
//   setDoc,
// } from "firebase/firestore";
// import { db } from "./config";

// // Initialize Gemini AI
// const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);

// // AI Assistant constants
// export const AI_ASSISTANT_ID = "ai_assistant";
// export const AI_ASSISTANT_NAME = "ChatLoop AI Assistant";
// export const AI_ASSISTANT_USERNAME = "@chatloop_ai";
// export const AI_ASSISTANT_AVATAR =
//   "https://ui-avatars.com/api/?name=AI&background=10b981&color=fff&bold=true&length=2";

// // Store AI sessions per user (each user has their own session)
// const aiSessions = new Map();

// // Get or create AI chat for a specific user
// export const getOrCreateAIChat = async (userId) => {
//   try {
//     const chatsRef = collection(db, "chats");

//     // Check if AI chat already exists for this user
//     const q = query(
//       chatsRef,
//       where("participants", "array-contains", userId),
//       where("isAI", "==", true),
//       where("type", "==", "ai")
//     );

//     const querySnapshot = await getDocs(q);

//     if (!querySnapshot.empty) {
//       const chatDoc = querySnapshot.docs[0];
//       return { id: chatDoc.id, ...chatDoc.data() };
//     }

//     // Create new AI chat for this user
//     const aiChat = {
//       participants: [userId, AI_ASSISTANT_ID],
//       isAI: true,
//       type: "ai",
//       createdAt: serverTimestamp(),
//       lastMessage:
//         "👋 Hello! I'm ChatLoop AI Assistant. How can I help you today?",
//       lastMessageTime: serverTimestamp(),
//       otherUser: {
//         uid: AI_ASSISTANT_ID,
//         name: AI_ASSISTANT_NAME,
//         username: AI_ASSISTANT_USERNAME,
//         avatar: AI_ASSISTANT_AVATAR,
//         status: "online",
//         isAI: true,
//       },
//     };

//     const docRef = await addDoc(chatsRef, aiChat);

//     // Add welcome message
//     const messagesRef = collection(db, "chats", docRef.id, "messages");
//     await addDoc(messagesRef, {
//       text: "👋 **Hello! I'm ChatLoop AI Assistant!**\n\nI'm your personal AI companion, available 24/7 to help you with:\n\n✅ Answering questions\n✅ Writing and coding help\n✅ Advice and recommendations\n✅ Friendly conversations\n✅ And much more!\n\n**What would you like to talk about today?** 🚀",
//       senderId: AI_ASSISTANT_ID,
//       senderName: AI_ASSISTANT_NAME,
//       senderAvatar: AI_ASSISTANT_AVATAR,
//       timestamp: serverTimestamp(),
//       read: false,
//       type: "received",
//       isAI: true,
//     });

//     return { id: docRef.id, ...aiChat };
//   } catch (error) {
//     console.error("Error creating AI chat:", error);
//     throw error;
//   }
// };

// // Send message to AI and get response
// export const sendAIMessage = async (
//   chatId,
//   userId,
//   userMessage,
//   userName,
//   userAvatar
// ) => {
//   try {
//     const messagesRef = collection(db, "chats", chatId, "messages");

//     // Save user message
//     const userMessageData = {
//       text: userMessage,
//       senderId: userId,
//       senderName: userName || "You",
//       senderAvatar: userAvatar || null,
//       timestamp: serverTimestamp(),
//       read: true,
//       type: "sent",
//     };

//     await addDoc(messagesRef, userMessageData);

//     // Update chat last message
//     const chatRef = doc(db, "chats", chatId);
//     await updateDoc(chatRef, {
//       lastMessage:
//         userMessage.length > 50
//           ? userMessage.substring(0, 50) + "..."
//           : userMessage,
//       lastMessageTime: serverTimestamp(),
//     });

//     // Show typing indicator
//     await updateDoc(chatRef, {
//       aiTyping: true,
//       aiTypingTimestamp: serverTimestamp(),
//     });

//     // Get AI response
//     const aiResponse = await getAIResponse(chatId, userId, userMessage);

//     // Hide typing indicator
//     await updateDoc(chatRef, {
//       aiTyping: false,
//     });

//     // Save AI response
//     const aiMessageData = {
//       text: aiResponse,
//       senderId: AI_ASSISTANT_ID,
//       senderName: AI_ASSISTANT_NAME,
//       senderAvatar: AI_ASSISTANT_AVATAR,
//       timestamp: serverTimestamp(),
//       read: false,
//       type: "received",
//       isAI: true,
//     };

//     await addDoc(messagesRef, aiMessageData);

//     // Update chat last message with AI response
//     await updateDoc(chatRef, {
//       lastMessage:
//         aiResponse.length > 50
//           ? aiResponse.substring(0, 50) + "..."
//           : aiResponse,
//       lastMessageTime: serverTimestamp(),
//     });

//     return aiResponse;
//   } catch (error) {
//     console.error("Error sending AI message:", error);
//     throw error;
//   }
// };

// // Get AI response using Gemini
// const getAIResponse = async (chatId, userId, userMessage) => {
//   try {
//     // Check if API key is available
//     if (!process.env.REACT_APP_GEMINI_API_KEY) {
//       console.warn("Gemini API key not found, using fallback responses");
//       return getSmartFallbackResponse(userMessage);
//     }

//     // Get or create chat session for this user (each user has their own session)
//     let session = aiSessions.get(chatId);

//     if (!session) {
//       const model = genAI.getGenerativeModel({ model: "gemini-pro" });

//       // Get conversation history for context
//       const history = await getConversationHistory(chatId, userId);

//       const chat = model.startChat({
//         history: history,
//         generationConfig: {
//           maxOutputTokens: 1000,
//           temperature: 0.7,
//           topP: 0.8,
//           topK: 40,
//         },
//       });

//       aiSessions.set(chatId, chat);
//       session = chat;
//     }

//     const result = await session.sendMessage(userMessage);
//     const response = await result.response;
//     return response.text();
//   } catch (error) {
//     console.error("Error getting AI response:", error);
//     return getSmartFallbackResponse(userMessage);
//   }
// };

// // Get conversation history for context
// const getConversationHistory = async (chatId, userId) => {
//   try {
//     const messagesRef = collection(db, "chats", chatId, "messages");
//     const q = query(
//       messagesRef,
//       orderBy("timestamp", "desc"),
//       limit(20) // Get last 20 messages for context
//     );

//     const querySnapshot = await getDocs(q);
//     const messages = [];

//     // Reverse to get chronological order
//     const docs = querySnapshot.docs.reverse();

//     for (const doc of docs) {
//       const msg = doc.data();
//       if (msg.senderId === userId) {
//         messages.push({
//           role: "user",
//           parts: [{ text: msg.text }],
//         });
//       } else if (msg.senderId === AI_ASSISTANT_ID) {
//         messages.push({
//           role: "model",
//           parts: [{ text: msg.text }],
//         });
//       }
//     }

//     // Limit history to prevent token overflow
//     return messages.slice(-10);
//   } catch (error) {
//     console.error("Error getting conversation history:", error);
//     return [];
//   }
// };

// // Smart fallback responses when API fails
// const getSmartFallbackResponse = (userMessage) => {
//   const msg = userMessage.toLowerCase().trim();

//   const responses = {
//     greeting: /^(hi|hello|hey|greetings|sup|yo|hola)/i,
//     howAreYou: /(how are you|how do you do|how's it going|how are you doing)/i,
//     name: /(your name|who are you|what are you|introduce yourself)/i,
//     help: /(help|what can you do|capabilities|features|what do you do)/i,
//     thanks: /(thanks|thank you|appreciate it|thx)/i,
//     goodbye: /(bye|goodbye|see you|farewell|cya)/i,
//     weather: /(weather|temperature|rain|sunny|cloudy|forecast)/i,
//     time: /(time|clock|what time|current time)/i,
//     date: /(date|today|day|what day|current date)/i,
//     joke: /(joke|funny|laugh|humor|make me laugh)/i,
//     love: /(love|crush|relationship|dating|girlfriend|boyfriend)/i,
//     sad: /(sad|depressed|unhappy|feeling down|upset)/i,
//     coding: /(code|programming|javascript|python|react|function|debug|error)/i,
//     math: /(math|calculate|solve|equation|number|what is|compute)/i,
//     meaning: /(meaning of life|purpose|existential|why are we here)/i,
//     friend: /(friend|friends|make friends|social|lonely)/i,
//     advice: /(advice|suggestion|recommend|what should i)/i,
//     news: /(news|current events|what's happening|latest)/i,
//   };

//   if (responses.greeting.test(msg)) {
//     return "Hello! 👋 Great to see you! I'm ChatLoop AI Assistant. How can I assist you today? Feel free to ask me anything!";
//   }

//   if (responses.howAreYou.test(msg)) {
//     return "I'm doing fantastic! 🌟 Thanks for asking. I'm always here, powered by AI, ready to help you 24/7. How are you doing today?";
//   }

//   if (responses.name.test(msg)) {
//     return "I'm **ChatLoop AI Assistant**! 🤖 Your personal AI companion. I'm here to make your chatting experience better and help you with various tasks. Think of me as your friendly AI buddy!";
//   }

//   if (responses.help.test(msg)) {
//     return "Here's what I can help you with:\n\n📝 **Writing** - Essays, emails, creative writing, proofreading\n💻 **Coding** - Debugging, explaining code, writing functions\n📚 **Learning** - Explanations, tutoring, research help\n💡 **Ideas** - Brainstorming, planning, creative suggestions\n💬 **Chat** - Friendly conversations, advice, emotional support\n🎮 **Fun** - Jokes, games, trivia, interesting facts\n\nWhat would you like help with? 🚀";
//   }

//   if (responses.thanks.test(msg)) {
//     return "You're very welcome! 😊 I'm glad I could help. Is there anything else you'd like to know or any other way I can assist you today?";
//   }

//   if (responses.goodbye.test(msg)) {
//     return "Goodbye! 👋 It was great chatting with you. Feel free to come back anytime you need help or just want to chat. Have a wonderful day! 🌟";
//   }

//   if (responses.joke.test(msg)) {
//     const jokes = [
//       "Why don't scientists trust atoms? Because they make up everything! 😄",
//       "What do you call a fake noodle? An impasta! 🍝",
//       "Why did the scarecrow win an award? He was outstanding in his field! 🌾",
//       "What do you call a bear with no teeth? A gummy bear! 🐻",
//       "Why don't eggs tell jokes? They'd crack each other up! 🥚",
//       "What do you call a fish wearing a bowtie? Sofishticated! 🐟",
//     ];
//     return jokes[Math.floor(Math.random() * jokes.length)];
//   }

//   if (responses.coding.test(msg)) {
//     return "I love coding! 💻 I can help you with:\n\n• Writing/optimizing code\n• Debugging errors\n• Explaining programming concepts\n• Best practices and design patterns\n• Code reviews\n• Learning resources\n\nWhat specific coding help do you need? Feel free to share your code or describe the problem!";
//   }

//   if (responses.love.test(msg)) {
//     return "Love is a beautiful thing! 💕 Whether you need advice about relationships, want to talk about your feelings, or just share something romantic, I'm here to listen and help. What's on your mind?";
//   }

//   if (responses.sad.test(msg)) {
//     return "I'm sorry you're feeling down. 💙 Remember that it's okay to not be okay sometimes. I'm here for you, and I care about how you're feeling. Would you like to talk about what's bothering you? Sometimes sharing helps. Or we could do something fun to cheer you up!";
//   }

//   if (responses.advice.test(msg)) {
//     return "I'd be happy to give you advice! 💡 To give you the best suggestions, could you tell me a bit more about what you need advice on? Whether it's about relationships, career, studies, or anything else, I'm here to help you think through it!";
//   }

//   if (responses.math.test(msg)) {
//     return "I can help with math! 🧮 I can solve equations, explain mathematical concepts, help with homework, or just calculate things for you. What math problem would you like me to help with?";
//   }

//   return "That's interesting! 🤔 I'd love to help you with that. Could you tell me a bit more about what you're looking for? I'm here to assist with any questions or tasks you have - no matter how big or small! 🌟";
// };

// // Listen to AI typing status
// export const listenToAITypingStatus = (chatId, callback) => {
//   const chatRef = doc(db, "chats", chatId);
//   return onSnapshot(chatRef, (doc) => {
//     if (doc.exists()) {
//       const data = doc.data();
//       callback(data.aiTyping || false);
//     }
//   });
// };

// // Clear AI chat history for user
// export const clearAIChatHistory = async (chatId, userId) => {
//   try {
//     const messagesRef = collection(db, "chats", chatId, "messages");
//     const querySnapshot = await getDocs(messagesRef);

//     const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref));

//     await Promise.all(deletePromises);

//     // Reset AI session for this chat
//     aiSessions.delete(chatId);

//     // Add new welcome message
//     const welcomeMessage = {
//       text: "✨ **Chat history cleared!** ✨\n\nI'm still here if you need anything. Our conversation is fresh and ready to go! What would you like to talk about? 🚀",
//       senderId: AI_ASSISTANT_ID,
//       senderName: AI_ASSISTANT_NAME,
//       senderAvatar: AI_ASSISTANT_AVATAR,
//       timestamp: serverTimestamp(),
//       read: false,
//       type: "received",
//       isAI: true,
//     };

//     await addDoc(messagesRef, welcomeMessage);

//     // Update chat last message
//     const chatRef = doc(db, "chats", chatId);
//     await updateDoc(chatRef, {
//       lastMessage: welcomeMessage.text.substring(0, 50) + "...",
//       lastMessageTime: serverTimestamp(),
//     });

//     return true;
//   } catch (error) {
//     console.error("Error clearing AI chat history:", error);
//     return false;
//   }
// };

// // Get AI chat for a user (to display in sidebar)
// export const getAIChatForUser = async (userId) => {
//   try {
//     const chatsRef = collection(db, "chats");
//     const q = query(
//       chatsRef,
//       where("participants", "array-contains", userId),
//       where("isAI", "==", true)
//     );

//     const querySnapshot = await getDocs(q);

//     if (!querySnapshot.empty) {
//       const chatDoc = querySnapshot.docs[0];
//       return { id: chatDoc.id, ...chatDoc.data() };
//     }

//     return null;
//   } catch (error) {
//     console.error("Error getting AI chat:", error);
//     return null;
//   }
// };
