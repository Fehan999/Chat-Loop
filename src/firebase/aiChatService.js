import {
  addDoc,
  collection,
  getDocs,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { toDate } from "../utils/dateUtils";
import { db } from "./config";

// gemini through google ai studio. the free tier is plenty for a chat app,
// the key comes from .env (see README)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL = import.meta.env.VITE_GEMINI_MODEL || "gemini-flash-latest";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// how many earlier messages go along with each question
const CONTEXT_MESSAGES = 20;

const SYSTEM_PROMPT = [
  "You are ChatLoop AI, the assistant inside the ChatLoop chat app.",
  "Be friendly, clear and to the point. Keep replies short unless the user asks for detail.",
  "Use simple markdown (bold, lists, code blocks) only when it actually helps.",
].join(" ");

export const isAIConfigured = () => Boolean(API_KEY);

// each user has their own history under aiChats/{uid}/messages
const aiMessagesRef = (uid) => collection(db, "aiChats", uid, "messages");

export const listenToAIMessages = (uid, callback) =>
  onSnapshot(
    query(aiMessagesRef(uid), orderBy("timestamp", "asc"), limitToLast(100)),
    (snapshot) =>
      callback(
        snapshot.docs.map((d) => {
          const data = d.data({ serverTimestamps: "estimate" });
          return { id: d.id, ...data, timestamp: toDate(data.timestamp) };
        })
      ),
    (error) => {
      console.error("AI messages listener failed:", error);
      callback([]);
    }
  );

// gemini wants the conversation to start with the user and alternate turns,
// so failed replies are dropped and back to back turns are merged
const buildContents = (history) => {
  const contents = [];
  history
    .filter((m) => !m.error && m.text?.trim())
    .forEach((m) => {
      const role = m.role === "model" ? "model" : "user";
      const last = contents[contents.length - 1];
      if (last?.role === role) last.parts[0].text += `\n\n${m.text}`;
      else contents.push({ role, parts: [{ text: m.text }] });
    });
  while (contents[0]?.role === "model") contents.shift();
  return contents;
};

const askGemini = async (history) => {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: buildContents(history),
      generationConfig: { temperature: 0.7 },
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.message || `Gemini request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }

  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();
  if (!text) throw new Error(data.promptFeedback?.blockReason ? "blocked" : "empty");
  return text;
};

const friendlyError = (error) => {
  if (error.status === 429)
    return "I'm getting a lot of questions right now. Give it a minute and try again.";
  if (error.status === 400 || error.status === 403)
    return "The AI key isn't working. Check VITE_GEMINI_API_KEY in your .env file.";
  if (error.message === "blocked")
    return "I can't help with that one, sorry. Try asking something else.";
  if (error instanceof TypeError)
    return "I couldn't reach the AI service. Check your connection and try again.";
  return "Something went wrong on my side. Please try again.";
};

// saves the question, asks gemini with recent context, saves the answer.
// errors are saved as a reply too so the conversation explains what happened
export const sendAIMessage = async (uid, text, history = []) => {
  await addDoc(aiMessagesRef(uid), { role: "user", text, timestamp: serverTimestamp() });

  let reply;
  let failed = false;
  try {
    reply = await askGemini([...history.slice(-CONTEXT_MESSAGES), { role: "user", text }]);
  } catch (error) {
    console.error("Gemini error:", error);
    failed = true;
    reply = friendlyError(error);
  }

  await addDoc(aiMessagesRef(uid), {
    role: "model",
    text: reply,
    error: failed,
    timestamp: serverTimestamp(),
  });
};

export const clearAIChat = async (uid) => {
  const snapshot = await getDocs(aiMessagesRef(uid));
  for (let i = 0; i < snapshot.docs.length; i += 450) {
    const batch = writeBatch(db);
    snapshot.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
};
