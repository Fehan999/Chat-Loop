// components/chat/MessageInput.jsx
import EmojiPicker from "emoji-picker-react";
import { AnimatePresence, motion } from "framer-motion";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  FiFile,
  FiImage,
  FiLoader,
  FiMic,
  FiPaperclip,
  FiSend,
  FiSmile,
  FiX,
} from "react-icons/fi";
import { updateTypingStatus } from "../../firebase/firestoreService";
import { uploadFileToSupabase } from "../../utils/supabase";
import VoiceRecorder from "./VoiceRecorder";

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const MessageInput = ({
  onSendMessage,
  placeholder = "Type a message...",
  currentUser,
  chatId,
  userData,
}) => {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const typingTimeoutRef = useRef(null);
  const lastTypingStatusRef = useRef(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const sendTypingStatus = useCallback(
    async (isTyping) => {
      if (lastTypingStatusRef.current !== isTyping) {
        lastTypingStatusRef.current = isTyping;
        await updateTypingStatus(chatId, currentUser?.uid, isTyping);
      }
    },
    [chatId, currentUser]
  );

  useEffect(() => {
    if (!chatId || !currentUser) return;

    if (message.length > 0) {
      sendTypingStatus(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(
        () => sendTypingStatus(false),
        2000
      );
    } else {
      sendTypingStatus(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [message, chatId, currentUser, sendTypingStatus]);

  useEffect(() => {
    return () => {
      if (chatId && currentUser) {
        updateTypingStatus(chatId, currentUser.uid, false);
      }
    };
  }, [chatId, currentUser]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      addFiles(acceptedFiles);
    },
    noClick: true,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "text/plain": [".txt"],
    },
  });

  const addFiles = (files) => {
    // Check total images limit
    const currentImageCount = attachments.filter((a) =>
      a.type?.startsWith("image/")
    ).length;
    const newImages = files.filter((f) => f.type?.startsWith("image/"));
    const newFiles = files.filter((f) => !f.type?.startsWith("image/"));

    if (currentImageCount + newImages.length > MAX_IMAGES) {
      alert(`You can only upload up to ${MAX_IMAGES} images at once`);
      return;
    }

    // Check file sizes
    const oversizedFiles = files.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      alert(`Files larger than 10MB cannot be uploaded`);
      return;
    }

    const filesWithPreview = files.map((file) => ({
      id: Date.now() + Math.random(),
      file: file,
      name: file.name,
      type: file.type,
      size: file.size,
      preview: file.type?.startsWith("image/")
        ? URL.createObjectURL(file)
        : null,
      uploading: false,
      uploaded: false,
    }));

    setAttachments((prev) => [...prev, ...filesWithPreview]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((message.trim() || attachments.length > 0) && !uploading) {
      let uploadedFiles = [];

      if (attachments.length > 0) {
        setUploading(true);

        // Mark all as uploading
        setAttachments((prev) =>
          prev.map((att) => ({ ...att, uploading: true }))
        );

        // Upload files sequentially with progress
        for (let i = 0; i < attachments.length; i++) {
          const attachment = attachments[i];
          const messageId = Date.now().toString();

          setUploadProgress((prev) => ({ ...prev, [attachment.id]: 0 }));

          const uploadedFile = await uploadFileToSupabase(
            attachment.file,
            chatId,
            `${messageId}_${i}`,
            attachment.type?.startsWith("image/") ? "image" : "file"
          );

          if (uploadedFile) {
            uploadedFiles.push({
              ...uploadedFile,
              localId: attachment.id,
            });
            setUploadProgress((prev) => ({ ...prev, [attachment.id]: 100 }));
          }

          // Update progress for visual feedback
          setAttachments((prev) =>
            prev.map((att) =>
              att.id === attachment.id
                ? { ...att, uploaded: !!uploadedFile }
                : att
            )
          );
        }

        setUploading(false);
      }

      onSendMessage(message, uploadedFiles);
      setMessage("");

      // Clean up preview URLs
      attachments.forEach((att) => {
        if (att.preview) URL.revokeObjectURL(att.preview);
      });
      setAttachments([]);
      setUploadProgress({});
      sendTypingStatus(false);
    }
  };

  const handleSendVoice = async (audioBlob, duration) => {
    if (!chatId || !currentUser) return;

    setUploading(true);

    try {
      const messageId = Date.now().toString();

      // Create file from blob
      const voiceFile = new File([audioBlob], `voice_${Date.now()}.webm`, {
        type: "audio/webm",
      });

      // Upload to Supabase
      const uploaded = await uploadFileToSupabase(
        voiceFile,
        chatId,
        messageId,
        "voice"
      );

      if (!uploaded) {
        throw new Error("Upload failed");
      }

      // Create voice file object
      const voiceFileObj = {
        name: "Voice message",
        url: uploaded.url,
        type: "audio/webm",
        duration: duration,
        isVoice: true,
        path: uploaded.path,
      };

      // Send as message
      onSendMessage("🎤 Voice message", [voiceFileObj]);
    } catch (error) {
      console.error("Error sending voice message:", error);
      alert("Failed to send voice message. Please try again.");
    } finally {
      setUploading(false);
      setShowVoiceRecorder(false);
    }
  };

  const handleEmojiClick = (emojiData) => {
    setMessage((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleFileSelect = (e, type = "file") => {
    const files = Array.from(e.target.files);

    if (type === "image") {
      const images = files.filter((file) => file.type.startsWith("image/"));
      addFiles(images);
    } else {
      addFiles(files);
    }

    // Clear input
    e.target.value = "";
  };

  const removeAttachment = (index) => {
    const attachment = attachments[index];
    if (attachment.preview) {
      URL.revokeObjectURL(attachment.preview);
    }
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    // Remove from progress
    if (attachment.id) {
      setUploadProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[attachment.id];
        return newProgress;
      });
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const remainingImageSlots =
    MAX_IMAGES - attachments.filter((a) => a.type?.startsWith("image/")).length;

  return (
    <div className="border-t border-gray-200 bg-white" {...getRootProps()}>
      {/* Voice Recorder Modal */}
      <AnimatePresence>
        {showVoiceRecorder && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25 }}
            className="absolute bottom-20 left-4 right-4 z-50"
          >
            <VoiceRecorder
              onSendVoice={handleSendVoice}
              onCancel={() => setShowVoiceRecorder(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attachments Preview */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 pt-3 flex flex-wrap gap-2 border-b border-gray-100 max-h-32 overflow-y-auto"
          >
            {attachments.map((file, index) => (
              <motion.div
                key={file.id || index}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative bg-gray-100 rounded-lg p-2 flex items-center gap-2 text-sm group"
              >
                {file.type?.startsWith("image/") ? (
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                    {file.uploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <FiLoader className="text-white animate-spin" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <FiFile className="text-gray-600 text-xl" />
                    {file.uploading && (
                      <div className="absolute inset-0 bg-white/80 rounded-full flex items-center justify-center">
                        <FiLoader className="text-gray-600 animate-spin text-xs" />
                      </div>
                    )}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-gray-700 max-w-[150px] truncate text-xs">
                    {file.name}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {formatFileSize(file.size)}
                  </span>
                  {uploadProgress[file.id] > 0 &&
                    uploadProgress[file.id] < 100 && (
                      <div className="w-full h-1 bg-gray-200 rounded-full mt-1">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${uploadProgress[file.id]}%` }}
                        />
                      </div>
                    )}
                </div>
                <button
                  onClick={() => removeAttachment(index)}
                  disabled={file.uploading}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                >
                  <FiX className="text-xs" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="p-3">
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2 flex items-center gap-2">
            {/* Emoji Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiSmile className="text-xl" />
              </button>
              {showEmojiPicker && (
                <div className="absolute bottom-full left-0 mb-2 z-10">
                  <EmojiPicker onEmojiClick={handleEmojiClick} />
                </div>
              )}
            </div>

            {/* Image Attachment - with limit indicator */}
            <div className="relative group">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={remainingImageSlots === 0}
                className={`text-gray-400 hover:text-gray-600 transition-colors ${
                  remainingImageSlots === 0
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                title={
                  remainingImageSlots > 0
                    ? `Add image (${remainingImageSlots} left)`
                    : "Maximum 5 images"
                }
              >
                <FiImage className="text-xl" />
              </button>
              {remainingImageSlots < MAX_IMAGES && (
                <span className="absolute -top-1 -right-1 text-[10px] bg-indigo-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                  {remainingImageSlots}
                </span>
              )}
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileSelect(e, "image")}
              className="hidden"
            />

            {/* File Attachment */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FiPaperclip className="text-xl" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => handleFileSelect(e, "file")}
              className="hidden"
            />
            <input {...getInputProps()} />

            {/* Text Input */}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isDragActive ? "Drop files here..." : placeholder}
              rows="1"
              className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400 text-sm resize-none py-2 max-h-32"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
          </div>

          {message.trim() || attachments.length > 0 ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={uploading}
              className="p-3 bg-indigo-500 text-white rounded-full shadow-md hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <FiLoader className="text-lg animate-spin" />
              ) : (
                <FiSend className="text-lg" />
              )}
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setShowVoiceRecorder(true)}
              className="p-3 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
            >
              <FiMic className="text-lg" />
            </motion.button>
          )}
        </div>

        {/* File limit indicator */}
        {attachments.length > 0 && (
          <div className="text-xs text-gray-400 mt-2 text-center">
            {attachments.filter((a) => a.type?.startsWith("image/")).length} /{" "}
            {MAX_IMAGES} images • Total:{" "}
            {formatFileSize(attachments.reduce((sum, a) => sum + a.size, 0))}
          </div>
        )}
      </form>
    </div>
  );
};

export default MessageInput;
