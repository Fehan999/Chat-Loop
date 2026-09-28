import React from "react";
import { motion } from "framer-motion";
import { FiMessageCircle, FiCpu } from "react-icons/fi";

const ChatTabs = ({ activeTab, onTabChange }) => {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-2">
      <div className="flex gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onTabChange("friends")}
          className={`relative px-4 py-2 font-medium text-sm transition-colors flex items-center gap-2 ${
            activeTab === "friends"
              ? "text-indigo-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <FiMessageCircle className="text-lg" />
          Friends Chat
          {activeTab === "friends" && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
            />
          )}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onTabChange("ai")}
          className={`relative px-4 py-2 font-medium text-sm transition-colors flex items-center gap-2 ${
            activeTab === "ai"
              ? "text-indigo-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <FiCpu className="text-lg" />
          AI Chat
          {activeTab === "ai" && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
            />
          )}
        </motion.button>
      </div>
    </div>
  );
};

export default ChatTabs;
