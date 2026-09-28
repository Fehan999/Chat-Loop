import { AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FiAlertTriangle, FiArrowLeft, FiCopy, FiSend, FiTrash2 } from "react-icons/fi";
import { AI_NAME } from "../../../constants";
import {
  clearAIChat,
  isAIConfigured,
  listenToAIMessages,
  sendAIMessage,
} from "../../../firebase/aiChatService";
import { formatTime } from "../../../utils/dateUtils";
import ConfirmDialog from "../../common/ConfirmDialog";
import Markdown from "../../common/Markdown";
import AIAvatar from "./AIAvatar";

const SUGGESTIONS = [
  "Help me reply to a message politely",
  "Explain something to me like I'm 12",
  "Give me a quick dinner idea",
  "Write a short birthday wish for a friend",
];

const ThinkingBubble = () => (
  <div className="flex items-end gap-2">
    <AIAvatar size={32} />
    <div className="flex gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-2 w-2 animate-bounce rounded-full bg-indigo-300"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  </div>
);

const AIChatArea = ({ me, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const configured = isAIConfigured();

  useEffect(
    () =>
      listenToAIMessages(me.id, (list) => {
        setMessages(list);
        setLoaded(true);
      }),
    [me.id]
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: loaded ? "smooth" : "auto" });
  }, [messages.length, thinking, loaded]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [input]);

  const send = async (text = input) => {
    const question = text.trim();
    if (!question || thinking || !configured) return;
    setInput("");
    setThinking(true);
    try {
      await sendAIMessage(me.id, question, messages);
    } catch {
      toast.error("Couldn't send that, please try again.");
      setInput(question);
    } finally {
      setThinking(false);
    }
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Couldn't copy.");
    }
  };

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-white">
      <header className="flex items-center gap-3 border-b border-gray-100 px-3 py-2.5 sm:px-4">
        {onBack && (
          <button onClick={onBack} className="icon-btn -ml-1" aria-label="Back to chats">
            <FiArrowLeft className="text-xl" />
          </button>
        )}
        <AIAvatar size={40} />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900">{AI_NAME}</h3>
          <p className="text-xs text-gray-500">Powered by Google Gemini</p>
        </div>
        {messages.length > 0 && (
          <button onClick={() => setConfirmClear(true)} className="icon-btn" title="Clear chat">
            <FiTrash2 />
          </button>
        )}
      </header>

      <div
        ref={scrollRef}
        className="thin-scroll flex-1 space-y-4 overflow-y-auto bg-gray-50 px-3 py-5 sm:px-6"
      >
        {!configured && (
          <div className="mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <FiAlertTriangle className="mt-0.5 flex-shrink-0" />
            <p>
              The AI chat isn&apos;t set up yet. Add a free Google AI Studio key as{" "}
              <code className="rounded bg-amber-100 px-1">VITE_GEMINI_API_KEY</code> in your{" "}
              <code className="rounded bg-amber-100 px-1">.env</code> file and restart the app.
            </p>
          </div>
        )}

        {loaded && messages.length === 0 && configured && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <AIAvatar size={64} />
            <h2 className="mt-4 text-lg font-semibold text-gray-900">
              Hi {me.name.split(" ")[0]}, what&apos;s on your mind?
            </h2>
            <p className="mt-1 text-sm text-gray-500">Ask anything, or try one of these:</p>
            <div className="mt-5 flex max-w-md flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => send(suggestion)}
                  className="rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-700 transition hover:border-indigo-200 hover:bg-indigo-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) =>
          msg.role === "user" ? (
            <div key={msg.id} className="flex justify-end">
              <div className="max-w-[78%] rounded-2xl rounded-br-md bg-indigo-500 px-3.5 py-2 text-white sm:max-w-[65%]">
                <p className="whitespace-pre-wrap break-words text-[15px]">{msg.text}</p>
                <p className="mt-1 text-right text-[11px] text-indigo-100">
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </div>
          ) : (
            <div key={msg.id} className="group flex items-end gap-2">
              <AIAvatar size={32} />
              <div
                className={`max-w-[85%] rounded-2xl rounded-bl-md px-4 py-2.5 text-[15px] leading-relaxed shadow-sm sm:max-w-[70%] ${
                  msg.error ? "bg-amber-50 text-amber-800" : "bg-white text-gray-800"
                }`}
              >
                <div className="break-words">
                  <Markdown text={msg.text} />
                </div>
                <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-gray-400">
                  <span>{formatTime(msg.timestamp)}</span>
                  {!msg.error && (
                    <button
                      onClick={() => copy(msg.text)}
                      className="flex items-center gap-1 opacity-0 transition hover:text-gray-600 group-hover:opacity-100"
                    >
                      <FiCopy /> Copy
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        )}

        {thinking && <ThinkingBubble />}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-end gap-2 border-t border-gray-100 p-3"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          disabled={!configured}
          placeholder={configured ? `Message ${AI_NAME}` : "AI chat isn't configured"}
          className="thin-scroll max-h-[140px] min-h-[44px] flex-1 resize-none rounded-3xl bg-gray-100 px-4 py-2.5 text-[15px] text-gray-900 placeholder-gray-400 outline-none focus:ring-4 focus:ring-indigo-100 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!input.trim() || thinking || !configured}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white shadow-sm shadow-indigo-500/30 transition hover:bg-indigo-600 disabled:opacity-50"
          aria-label="Send"
        >
          <FiSend className="text-lg" />
        </button>
      </form>

      <AnimatePresence>
        {confirmClear && (
          <ConfirmDialog
            title="Clear this chat?"
            message="Your conversation with ChatLoop AI will be deleted."
            confirmLabel="Clear"
            onConfirm={() => clearAIChat(me.id)}
            onClose={() => setConfirmClear(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIChatArea;
