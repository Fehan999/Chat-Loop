import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiSearch } from "react-icons/fi";

const EMOJIS = [
  "❤️",
  "👍",
  "😂",
  "😮",
  "😢",
  "🔥",
  "🎉",
  "😍",
  "🥰",
  "😎",
  "😭",
  "😡",
  "🤔",
  "🙏",
  "💀",
  "👏",
  "✨",
  "⭐",
  "🍕",
  "🍺",
  "🏆",
  "💯",
  "🤣",
  "😱",
  "😴",
  "🥺",
  "😤",
  "😇",
  "🤗",
  "🥳",
  "😘",
  "😊",
  "🤪",
  "😈",
  "👻",
  "💔",
  "💪",
  "👑",
  "🎵",
  "⚡",
];

const EmojiPickerModal = ({ onSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredEmojis = EMOJIS.filter((emoji) =>
    emoji.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Choose Reaction
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FiX className="text-gray-500 text-xl" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search emojis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>

        {/* Emoji Grid */}
        <div className="p-4 max-h-[400px] overflow-y-auto">
          <div className="grid grid-cols-8 gap-2">
            {filteredEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onSelect(emoji);
                  onClose();
                }}
                className="w-12 h-12 text-2xl hover:bg-gray-100 rounded-xl transition-colors flex items-center justify-center transform hover:scale-110"
              >
                {emoji}
              </button>
            ))}
          </div>
          {filteredEmojis.length === 0 && (
            <p className="text-center text-gray-500 py-8">No emojis found</p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default EmojiPickerModal;
