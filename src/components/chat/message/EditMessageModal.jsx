// components/chat/EditMessageModal.jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiX, FiCheck } from "react-icons/fi";

const EditMessageModal = ({ message, onSave, onClose }) => {
  const [editText, setEditText] = useState(message.text);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editText]);

  const handleSave = async () => {
    if (editText.trim() && editText !== message.text) {
      setIsSaving(true);
      await onSave(editText);
      setIsSaving(false);
      onClose();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden"
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Edit Message</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FiX className="text-gray-500 text-xl" />
          </button>
        </div>

        <div className="p-4">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all resize-none"
            rows="4"
            autoFocus
          />
          <p className="text-xs text-gray-400 mt-2">
            Press Enter to save, Escape to cancel
          </p>
        </div>

        <div className="flex gap-3 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!editText.trim() || isSaving}
            className="flex-1 py-2.5 bg-indigo-500 text-white font-medium rounded-xl hover:bg-indigo-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              "Saving..."
            ) : (
              <>
                <FiCheck /> Save
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default EditMessageModal;
