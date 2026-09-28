import { AnimatePresence, motion } from "framer-motion";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
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
import { MAX_FILE_SIZE, MAX_IMAGES_PER_MESSAGE } from "../../constants";
import { updateTypingStatus } from "../../firebase/firestoreService";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { uploadFileToSupabase } from "../../utils/supabase";
import VoiceRecorder from "./VoiceRecorder";

const EmojiPicker = lazy(() => import("emoji-picker-react"));

const TYPING_IDLE_MS = 2500;

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const voiceExtension = (mimeType) => {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
};

const MessageInput = ({
  onSendMessage,
  placeholder = "Type a message...",
  currentUser,
  chatId,
  chatReady,
}) => {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  const textareaRef = useRef(null);
  const emojiRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const typingRef = useRef({ active: false, timer: null });
  // on phones the enter key should add a new line, there's a send button
  const isTouch = useMediaQuery("(pointer: coarse)");

  const uid = currentUser?.uid;

  // typing indicator: one write when you start, one when you stop or go quiet
  const setTyping = useCallback(
    (active) => {
      const state = typingRef.current;
      clearTimeout(state.timer);
      if (active) state.timer = setTimeout(() => setTyping(false), TYPING_IDLE_MS);
      if (state.active === active || !chatReady) return;
      state.active = active;
      updateTypingStatus(chatId, uid, active);
    },
    [chatId, chatReady, uid]
  );

  useEffect(() => {
    const state = typingRef.current;
    return () => {
      clearTimeout(state.timer);
      if (state.active) updateTypingStatus(chatId, uid, false);
      state.active = false;
    };
  }, [chatId, uid]);

  // grow the textarea with its content, up to a limit
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [message]);

  useEffect(() => {
    if (!showEmoji) return undefined;
    const close = (e) => !emojiRef.current?.contains(e.target) && setShowEmoji(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showEmoji]);

  // previews are object urls, free them when the input goes away
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;
  useEffect(
    () => () => attachmentsRef.current.forEach((a) => a.preview && URL.revokeObjectURL(a.preview)),
    []
  );

  const addFiles = (files) => {
    if (!files.length) return;
    const tooBig = files.filter((f) => f.size > MAX_FILE_SIZE);
    if (tooBig.length) toast.error("Files over 10 MB can't be sent.");

    const allowed = files.filter((f) => f.size <= MAX_FILE_SIZE);
    const imageCount = attachments.filter((a) => a.type.startsWith("image/")).length;
    const newImages = allowed.filter((f) => f.type.startsWith("image/"));
    if (imageCount + newImages.length > MAX_IMAGES_PER_MESSAGE) {
      toast.error(`You can send up to ${MAX_IMAGES_PER_MESSAGE} images at once.`);
      return;
    }

    setAttachments((prev) => [
      ...prev,
      ...allowed.map((file) => ({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
        file,
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      })),
    ]);
    textareaRef.current?.focus();
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: addFiles,
    noClick: true,
    noKeyboard: true,
  });

  const removeAttachment = (id) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((a) => a.id !== id);
    });
  };

  // screenshots pasted straight into the box become attachments
  const handlePaste = (e) => {
    const files = Array.from(e.clipboardData?.files || []);
    if (files.length) {
      e.preventDefault();
      addFiles(files);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const text = message.trim();
    if ((!text && attachments.length === 0) || uploading) return;

    setTyping(false);
    const pending = attachments;
    let uploaded = [];

    if (pending.length) {
      setUploading(true);
      const stamp = Date.now();
      // uploads run side by side instead of one after another
      const results = await Promise.all(
        pending.map((a, i) => uploadFileToSupabase(a.file, chatId, `${stamp}_${i}`))
      );
      uploaded = results.filter(Boolean);
      setUploading(false);

      if (uploaded.length < pending.length) {
        toast.error("Some files couldn't be uploaded.");
        if (!uploaded.length && !text) return;
      }
      pending.forEach((a) => a.preview && URL.revokeObjectURL(a.preview));
      setAttachments([]);
    }

    setMessage("");
    const ok = await onSendMessage(text, uploaded);
    if (!ok && text) setMessage(text);
  };

  const handleSendVoice = async (blob, duration, waveform, mimeType) => {
    setRecording(false);
    setUploading(true);
    const baseType = mimeType.split(";")[0];
    const file = new File([blob], `voice_${Date.now()}.${voiceExtension(baseType)}`, {
      type: baseType,
    });

    const uploaded = await uploadFileToSupabase(file, chatId, Date.now().toString());
    setUploading(false);
    if (!uploaded) {
      toast.error("Voice message failed to upload.");
      return;
    }

    await onSendMessage("", [
      {
        name: "Voice message",
        url: uploaded.url,
        path: uploaded.path,
        type: baseType,
        size: uploaded.size,
        duration: Math.round(duration * 10) / 10,
        waveform,
        isVoice: true,
      },
    ]);
  };

  const canSend = message.trim() || attachments.length > 0;
  const imageSlotsLeft =
    MAX_IMAGES_PER_MESSAGE - attachments.filter((a) => a.type.startsWith("image/")).length;

  return (
    <div {...getRootProps({ className: "relative border-t border-gray-100 bg-white" })}>
      <input {...getInputProps()} />

      {isDragActive && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-t-xl border-2 border-dashed border-indigo-300 bg-indigo-50/90 text-sm font-medium text-indigo-600">
          Drop files to attach
        </div>
      )}

      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="thin-scroll flex gap-2 overflow-x-auto px-3 pt-3"
          >
            {attachments.map((file) => (
              <div
                key={file.id}
                className="group relative flex flex-shrink-0 items-center gap-2 rounded-xl bg-gray-100 p-1.5 pr-3"
              >
                {file.preview ? (
                  <img src={file.preview} alt="" className="h-12 w-12 rounded-lg object-cover" />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-indigo-500">
                    <FiFile className="text-lg" />
                  </span>
                )}
                <div className="max-w-[120px]">
                  <p className="truncate text-xs font-medium text-gray-700">{file.name}</p>
                  <p className="text-[11px] text-gray-400">{formatFileSize(file.size)}</p>
                </div>
                {uploading ? (
                  <FiLoader className="animate-spin text-indigo-500" />
                ) : (
                  <button
                    type="button"
                    onClick={() => removeAttachment(file.id)}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-700 text-white shadow"
                    aria-label={`Remove ${file.name}`}
                  >
                    <FiX className="text-xs" />
                  </button>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-3">
        {recording ? (
          <VoiceRecorder onSend={handleSendVoice} onCancel={() => setRecording(false)} />
        ) : (
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <div className="flex min-h-[44px] flex-1 items-end gap-1 rounded-3xl bg-gray-100 px-2 py-1.5">
              <div ref={emojiRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmoji((v) => !v)}
                  className="icon-btn p-1.5"
                  aria-label="Emoji"
                >
                  <FiSmile className="text-xl" />
                </button>
                {showEmoji && (
                  <div className="absolute bottom-full left-0 z-30 mb-3 shadow-xl">
                    <Suspense
                      fallback={<div className="h-[380px] w-[320px] rounded-xl bg-white" />}
                    >
                      <EmojiPicker
                        width={320}
                        height={380}
                        lazyLoadEmojis
                        emojiStyle="native"
                        previewConfig={{ showPreview: false }}
                        onEmojiClick={(data) => setMessage((prev) => prev + data.emoji)}
                      />
                    </Suspense>
                  </div>
                )}
              </div>

              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setTyping(e.target.value.length > 0);
                }}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !isTouch) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder={placeholder}
                rows={1}
                disabled={uploading}
                className="thin-scroll max-h-[140px] flex-1 resize-none bg-transparent px-1 py-1.5 text-[15px] text-gray-900 placeholder-gray-400 outline-none"
              />

              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={imageSlotsLeft <= 0 || uploading}
                className="icon-btn p-1.5"
                title="Send photos"
              >
                <FiImage className="text-xl" />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="icon-btn p-1.5"
                title="Attach a file"
              >
                <FiPaperclip className="text-xl" />
              </button>

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  addFiles(Array.from(e.target.files || []));
                  e.target.value = "";
                }}
              />
              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                onChange={(e) => {
                  addFiles(Array.from(e.target.files || []));
                  e.target.value = "";
                }}
              />
            </div>

            {canSend || uploading ? (
              <button
                type="submit"
                disabled={uploading}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white shadow-sm shadow-indigo-500/30 transition hover:bg-indigo-600 active:scale-95 disabled:opacity-60"
                aria-label="Send"
              >
                {uploading ? (
                  <FiLoader className="animate-spin text-lg" />
                ) : (
                  <FiSend className="text-lg" />
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setRecording(true)}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white shadow-sm shadow-indigo-500/30 transition hover:bg-indigo-600 active:scale-95"
                aria-label="Record a voice message"
              >
                <FiMic className="text-lg" />
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default MessageInput;
