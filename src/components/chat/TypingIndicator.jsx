import React from "react";
import { motion } from "framer-motion";

const TypingIndicator = ({ users, chatId }) => {
  const typingUsers = Object.entries(users || {})
    .filter(([userId, isTyping]) => isTyping === true)
    .map(([userId]) => userId);

  if (typingUsers.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="px-4 py-2 bg-gray-50 border-t border-gray-100"
    >
      <div className="flex items-center gap-2">
        <div className="flex space-x-1">
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          ></div>
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          ></div>
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          ></div>
        </div>
        <p className="text-xs text-gray-500">
          {typingUsers.length === 1
            ? "Someone is typing..."
            : `${typingUsers.length} people are typing...`}
        </p>
      </div>
    </motion.div>
  );
};

export default TypingIndicator;
