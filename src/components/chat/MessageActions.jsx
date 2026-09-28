// components/chat/MessageActions.jsx
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  FiCheck,
  FiEdit2,
  FiFlag,
  FiMoreHorizontal,
  FiTrash2,
  FiX,
} from "react-icons/fi";

const MessageActions = ({
  message,
  currentUser,
  onEdit,
  onDelete,
  onReport,
  onReactionToggle,
  isOwnMessage,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const menuRef = useRef(null);
  const reactionsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
      if (reactionsRef.current && !reactionsRef.current.contains(event.target)) {
        setShowReactions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEdit = () => {
    setIsEditing(true);
    setShowMenu(false);
  };

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== message.text) {
      onEdit(message.id, editText);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText(message.text);
  };

  const handleDelete = () => {
    onDelete(message.id);
    setShowDeleteConfirm(false);
    setShowMenu(false);
  };

  const handleReactionClick = (reaction) => {
    if (onReactionToggle) {
      onReactionToggle(message.id, reaction);
    }
    setShowReactions(false);
  };

  const reactions = ["❤️", "👍", "😂", "😮", "😢", "🔥"];
  const currentReactions = message.reactions || {};

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <input
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          className="flex-1 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSaveEdit();
            if (e.key === "Escape") handleCancelEdit();
          }}
        />
        <button
          onClick={handleSaveEdit}
          className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          <FiCheck className="text-sm" />
        </button>
        <button
          onClick={handleCancelEdit}
          className="p-1.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
        >
          <FiX className="text-sm" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1 flex-wrap min-h-[28px]">
        {Object.entries(currentReactions).map(([reaction, users]) => (
          <button
            key={reaction}
            onClick={() => handleReactionClick(reaction)}
            className={`text-xs px-2 py-0.5 rounded-full border transition-all duration-200 ${
              users.includes(currentUser?.uid)
                ? "bg-indigo-50 border-indigo-300 shadow-sm"
                : "bg-gray-50 border-gray-200 hover:bg-gray-100 hover:scale-105"
            } flex items-center gap-1`}
          >
            <span className="text-sm">{reaction}</span>
            <span className="text-[10px] font-medium text-gray-600">
              {users.length}
            </span>
          </button>
        ))}
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowReactions(!showReactions);
          }}
          className="text-xs px-2 py-0.5 rounded-full border border-dashed border-gray-300 bg-white hover:bg-gray-50 transition-colors text-gray-400 hover:text-gray-600"
        >
          +
        </button>
      </div>

      <AnimatePresence>
        {showReactions && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            className="absolute bottom-full left-0 mb-2 bg-white rounded-full shadow-xl border border-gray-200 py-1.5 px-2 z-50 flex items-center gap-0.5"
            style={{ transformOrigin: "bottom left" }}
          >
            {reactions.map((reaction) => (
              <button
                key={reaction}
                onClick={() => handleReactionClick(reaction)}
                className="text-xl hover:scale-150 transition-transform p-1 hover:bg-gray-100 rounded-full"
              >
                {reaction}
              </button>
            ))}
            <div className="w-px h-6 bg-gray-200 mx-1" />
            <button
              onClick={() => setShowReactions(false)}
              className="text-sm text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FiX className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`absolute -top-1 ${isOwnMessage ? '-right-8' : '-left-8'} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1.5 hover:bg-gray-100 rounded-full bg-white shadow-sm border border-gray-200"
          aria-label="Message actions"
        >
          <FiMoreHorizontal className="text-sm text-gray-600" />
        </button>

        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -5 }}
              className={`absolute top-full ${isOwnMessage ? 'right-0' : 'left-0'} mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-50 overflow-hidden`}
            >
              {isOwnMessage && (
                <>
                  <button
                    onClick={handleEdit}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                  >
                    <FiEdit2 className="text-sm text-gray-500" />
                    Edit
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                  >
                    <FiTrash2 className="text-sm text-red-500" />
                    Delete
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                </>
              )}
              <button
                onClick={() => {
                  onReport(message.id);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
              >
                <FiFlag className="text-sm text-gray-500" />
                Report
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showDeleteConfirm && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowDeleteConfirm(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Delete Message?
              </h3>
              <p className="text-gray-600 text-sm mb-6">
                This message will be deleted for everyone. This action cannot be
                undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MessageActions;