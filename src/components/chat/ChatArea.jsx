import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  FiArrowLeft,
  FiFlag,
  FiInfo,
  FiMoreVertical,
  FiPhone,
  FiTrash2,
  FiVideo,
} from "react-icons/fi";
import { deleteConversation, listenToTypingStatus } from "../../firebase/firestoreService";
import {
  deleteMessage,
  editMessage,
  reportMessage,
  toggleMessageReaction,
} from "../../firebase/messageActions";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { getExactTime, getStatusDotClass, getStatusText } from "../../utils/statusHelper";
import ConfirmDialog from "../common/ConfirmDialog";
import ContactInfoPanel from "./ContactInfoPanel";
import EditMessageModal from "./message/EditMessageModal";
import EmojiPickerModal from "./message/EmojiPickerModal";
import ReportMessageModal from "./message/ReportMessageModal";
import MessageInput from "./MessageInput";
import MessageList from "./MessageList";

const ChatArea = ({
  chat,
  messages,
  loading,
  hasMore,
  onLoadMore,
  onSendMessage,
  onReportUser,
  onStartCall,
  callInProgress,
  onBack,
  currentUser,
}) => {
  const uid = currentUser.uid;
  const isMobile = useIsMobile();

  const [peerTyping, setPeerTyping] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  // only one dialog is open at a time: { type, message }
  const [dialog, setDialog] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!chat.exists) return undefined;
    return listenToTypingStatus(chat.chatId, (data) => setPeerTyping(data?.[chat.userId] === true));
  }, [chat.chatId, chat.exists, chat.userId]);

  useEffect(() => {
    if (!showMenu) return undefined;
    const close = (e) => !menuRef.current?.contains(e.target) && setShowMenu(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showMenu]);

  const closeDialog = () => setDialog(null);

  const handleReact = (message, emoji) =>
    toggleMessageReaction(chat.chatId, message.id, uid, emoji, message.reactions?.[uid]);

  const handleCopy = async (message) => {
    try {
      await navigator.clipboard.writeText(message.text);
      toast.success("Copied");
    } catch {
      toast.error("Couldn't copy that.");
    }
  };

  const handleDeleteConversation = async () => {
    const ok = await deleteConversation(chat.chatId, uid);
    if (ok) {
      toast.success("Conversation deleted");
      setShowInfo(false);
    } else {
      toast.error("Couldn't delete the conversation.");
    }
  };

  const statusText = peerTyping ? "typing..." : getStatusText(chat.status, chat.lastSeen);

  return (
    <div className="flex h-full min-w-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col bg-white">
        <header className="flex items-center gap-3 border-b border-gray-100 px-3 py-2.5 sm:px-4">
          {onBack && (
            <button onClick={onBack} className="icon-btn -ml-1" aria-label="Back to chats">
              <FiArrowLeft className="text-xl" />
            </button>
          )}

          <button
            onClick={() => setShowInfo((v) => !v)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <div
              className="relative flex-shrink-0"
              title={chat.lastSeen ? `Last active ${getExactTime(chat.lastSeen)}` : undefined}
            >
              <img src={chat.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
              <span
                className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${getStatusDotClass(chat.status)}`}
              />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-gray-900">{chat.name}</h3>
              <p
                className={`truncate text-xs ${
                  peerTyping || chat.status === "online" ? "text-emerald-600" : "text-gray-500"
                }`}
              >
                {statusText}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onStartCall(false)}
              disabled={callInProgress}
              className="icon-btn"
              title={callInProgress ? "You're already on a call" : "Voice call"}
            >
              <FiPhone className="text-lg" />
            </button>
            <button
              onClick={() => onStartCall(true)}
              disabled={callInProgress}
              className="icon-btn"
              title={callInProgress ? "You're already on a call" : "Video call"}
            >
              <FiVideo className="text-lg" />
            </button>

            <div ref={menuRef} className="relative">
              <button
                onClick={() => setShowMenu((v) => !v)}
                className="icon-btn"
                aria-label="More options"
              >
                <FiMoreVertical className="text-lg" />
              </button>
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg"
                  >
                    <MenuButton
                      icon={FiInfo}
                      label="Contact info"
                      onClick={() => {
                        setShowInfo(true);
                        setShowMenu(false);
                      }}
                    />
                    <MenuButton
                      icon={FiFlag}
                      label="Report user"
                      onClick={() => {
                        onReportUser(chat);
                        setShowMenu(false);
                      }}
                    />
                    <MenuButton
                      icon={FiTrash2}
                      label="Delete conversation"
                      danger
                      onClick={() => {
                        setDialog({ type: "deleteConversation" });
                        setShowMenu(false);
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <MessageList
          messages={messages}
          currentUserId={uid}
          peer={chat}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
          onReact={handleReact}
          onMoreReactions={(message) => setDialog({ type: "react", message })}
          onEdit={(message) => setDialog({ type: "edit", message })}
          onDelete={(message) => setDialog({ type: "delete", message })}
          onReport={(message) => setDialog({ type: "report", message })}
          onCopy={handleCopy}
        />

        <MessageInput
          onSendMessage={onSendMessage}
          placeholder={`Message ${chat.name.split(" ")[0]}`}
          currentUser={currentUser}
          chatId={chat.chatId}
          chatReady={chat.exists}
        />
      </div>

      <AnimatePresence>
        {showInfo && (
          <ContactInfoPanel
            chat={chat}
            messages={messages}
            isMobile={isMobile}
            onClose={() => setShowInfo(false)}
            onReport={() => onReportUser(chat)}
            onDeleteConversation={() => setDialog({ type: "deleteConversation" })}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dialog?.type === "deleteConversation" && (
          <ConfirmDialog
            title="Delete this conversation?"
            message="All messages will be removed for both of you. This can't be undone."
            onConfirm={handleDeleteConversation}
            onClose={closeDialog}
          />
        )}
        {dialog?.type === "delete" && (
          <ConfirmDialog
            title="Delete message?"
            message="It will be removed for everyone in the chat."
            onConfirm={async () => {
              const ok = await deleteMessage(chat.chatId, dialog.message, uid);
              if (!ok) toast.error("Couldn't delete the message.");
            }}
            onClose={closeDialog}
          />
        )}
        {dialog?.type === "edit" && (
          <EditMessageModal
            message={dialog.message}
            onClose={closeDialog}
            onSave={async (text) => {
              const ok = await editMessage(chat.chatId, dialog.message.id, text, uid);
              if (!ok) toast.error("Couldn't save your edit.");
            }}
          />
        )}
        {dialog?.type === "report" && (
          <ReportMessageModal
            onClose={closeDialog}
            onSubmit={async (reason) => {
              const ok = await reportMessage(chat.chatId, dialog.message, uid, reason);
              if (ok) toast.success("Thanks, we'll take a look.");
              else toast.error("Couldn't send the report.");
              closeDialog();
            }}
          />
        )}
        {dialog?.type === "react" && (
          <EmojiPickerModal
            onSelect={(emoji) => handleReact(dialog.message, emoji)}
            onClose={closeDialog}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const MenuButton = ({ icon: Icon, label, onClick, danger }) => (
  <button
    onClick={onClick}
    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${
      danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"
    }`}
  >
    <Icon className={danger ? "" : "text-gray-400"} />
    {label}
  </button>
);

export default ChatArea;
