import { AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import { FiCheck, FiFlag, FiHash, FiMessageSquare } from "react-icons/fi";
import { previewFor } from "../../firebase/firestoreService";
import { formatChatListTime } from "../../utils/dateUtils";
import { formatUsername } from "../../utils/userDisplay";
import Modal from "../common/Modal";
import ReportForm from "./message/ReportForm";

const USER_REASONS = [
  "Spam or scam",
  "Harassment or bullying",
  "Fake account",
  "Inappropriate behaviour",
  "Sharing personal information",
  "Other",
];

const MODES = [
  { id: "message", label: "A message", icon: FiMessageSquare },
  { id: "account", label: "Their account (ID)", icon: FiHash },
];

const MessagePicker = ({ messages, selectedId, onSelect }) => (
  <ul className="thin-scroll max-h-56 space-y-1.5 overflow-y-auto pr-1">
    {messages.map((message) => {
      const selected = message.id === selectedId;
      return (
        <li key={message.id}>
          <button
            type="button"
            onClick={() => onSelect(message)}
            className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
              selected
                ? "border-red-300 bg-red-50"
                : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
            }`}
          >
            <span
              className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border ${
                selected ? "border-red-500 bg-red-500 text-white" : "border-gray-300"
              }`}
            >
              {selected && <FiCheck size={10} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 break-words text-gray-800">
                {previewFor(message.text, message.attachments) || "Message"}
              </span>
              <span className="text-xs text-gray-400">{formatChatListTime(message.timestamp)}</span>
            </span>
          </button>
        </li>
      );
    })}
  </ul>
);

// reporting a person means pointing at the message that was the problem, or,
// when there's nothing in the chat to point at, reporting the account by its id
const ReportUserModal = ({ isOpen, onClose, user, messages = [], onSubmit }) => {
  const evidence = useMemo(
    () =>
      messages
        .filter((m) => m.senderId === user?.userId && !m.deleted && m.type !== "call")
        .slice(-30)
        .reverse(),
    [messages, user?.userId]
  );
  const [mode, setMode] = useState(null);
  const [picked, setPicked] = useState(null);

  const activeMode = mode || (evidence.length ? "message" : "account");
  const profile = user?.profile || user || {};

  const close = () => {
    setMode(null);
    setPicked(null);
    onClose();
  };

  const submit = async ({ reason, details }) => {
    await onSubmit({
      reason,
      details,
      message: activeMode === "message" ? picked : null,
      chatId: user.chatId,
    });
    setMode(null);
    setPicked(null);
  };

  return (
    <AnimatePresence>
      {isOpen && user && (
        <Modal title="Report user" icon={<FiFlag className="text-red-500" />} onClose={close}>
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-gray-50 p-3">
            <img src={user.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-gray-900">{user.name}</p>
              <p className="truncate text-xs text-gray-500">
                {formatUsername(profile.username)}
                {profile.uniqueId && ` · ID ${profile.uniqueId}`}
              </p>
            </div>
          </div>

          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
            What are you reporting?
          </p>
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
            {MODES.map(({ id, label, icon: Icon }) => {
              const unavailable = id === "message" && evidence.length === 0;
              return (
                <button
                  key={id}
                  type="button"
                  disabled={unavailable}
                  onClick={() => setMode(id)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    activeMode === id
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Icon /> {label}
                </button>
              );
            })}
          </div>

          {activeMode === "message" ? (
            <div className="mb-4">
              <p className="mb-2 text-sm text-gray-600">
                Pick the message that broke the rules. Our team will see it with your report.
              </p>
              <MessagePicker messages={evidence} selectedId={picked?.id} onSelect={setPicked} />
            </div>
          ) : (
            <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-sm text-indigo-800">
              {evidence.length === 0 && (
                <p className="mb-1 font-medium">They haven&apos;t sent you any messages.</p>
              )}
              <p>
                We&apos;ll send their account
                {profile.uniqueId ? ` (ID ${profile.uniqueId})` : ""} to our team, and they&apos;ll
                review it.
              </p>
            </div>
          )}

          <ReportForm
            reasons={USER_REASONS}
            ready={activeMode === "account" || !!picked}
            onClose={close}
            onSubmit={submit}
          />
          {activeMode === "message" && !picked && (
            <p className="mt-2 text-center text-xs text-gray-400">Select a message to continue</p>
          )}
        </Modal>
      )}
    </AnimatePresence>
  );
};

export default ReportUserModal;
