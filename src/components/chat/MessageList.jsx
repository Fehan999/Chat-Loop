import { AnimatePresence, motion } from "framer-motion";
import { Fragment, useLayoutEffect, useRef, useState } from "react";
import { FaFileAlt, FaPhoneAlt, FaPhoneSlash, FaVideo } from "react-icons/fa";
import { FiArrowDown, FiCheck, FiClock, FiSlash } from "react-icons/fi";
import { getGroupedReactions } from "../../firebase/messageActions";
import { formatTime, getDateGroupHeader, toDate } from "../../utils/dateUtils";
import ImageGalleryModal from "./message/ImageGalleryModal";
import VoiceMessagePlayer from "./message/VoiceMessagePlayer";
import MessageActions from "./MessageActions";

const GROUP_WINDOW_MS = 5 * 60 * 1000;

const isVoice = (file) => file.isVoice || file.type?.startsWith("audio/");
const isImage = (file) => file.type?.startsWith("image/");

// old voice notes were saved with this placeholder text
const visibleText = (msg) => (msg.text && msg.text !== "🎤 Voice message" ? msg.text : "");

const formatSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

// consecutive messages from the same person within a few minutes are
// grouped, only the last one in a run gets the avatar
const sameRun = (a, b) =>
  a &&
  b &&
  a.type !== "call" &&
  b.type !== "call" &&
  a.senderId === b.senderId &&
  Math.abs((toDate(a.timestamp)?.getTime() || 0) - (toDate(b.timestamp)?.getTime() || 0)) <
    GROUP_WINDOW_MS;

const sameDay = (a, b) =>
  toDate(a?.timestamp)?.toDateString() === toDate(b?.timestamp)?.toDateString();

const CallBubble = ({ msg }) => {
  const { status, isVideo } = msg.callData || {};
  const missed = status === "missed" || status === "rejected";
  const Icon = missed ? FaPhoneSlash : isVideo ? FaVideo : FaPhoneAlt;

  return (
    <div className="my-2 flex justify-center">
      <div
        className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium ${
          missed ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-600"
        }`}
      >
        <Icon className="text-[11px]" />
        {msg.text.replace("📞 ", "")}
        <span className="font-normal opacity-60">· {formatTime(msg.timestamp)}</span>
      </div>
    </div>
  );
};

const Attachments = ({ files, isMe, onOpenImage, onMediaLoad }) => {
  const images = files.filter(isImage);
  const others = files.filter((file) => !isImage(file));

  return (
    <div className="space-y-1.5">
      {images.length > 0 && (
        <div className={`grid gap-1 ${images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {images.map((file, index) => (
            <button
              key={file.url}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenImage(images, index);
              }}
              className="overflow-hidden rounded-xl bg-black/5"
            >
              <img
                src={file.url}
                alt={file.name || "Photo"}
                loading="lazy"
                onLoad={onMediaLoad}
                className={`w-full object-cover transition hover:opacity-90 ${
                  images.length > 1 ? "aspect-square max-w-[140px]" : "max-h-72 max-w-[260px]"
                }`}
              />
            </button>
          ))}
        </div>
      )}

      {others.map((file) =>
        isVoice(file) ? (
          <VoiceMessagePlayer
            key={file.url}
            url={file.url}
            duration={file.duration}
            waveform={file.waveform}
            isMe={isMe}
          />
        ) : (
          <a
            key={file.url}
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`flex max-w-[240px] items-center gap-3 rounded-xl p-2.5 transition ${
              isMe ? "bg-white/15 hover:bg-white/25" : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            <span
              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                isMe ? "bg-white/20" : "bg-indigo-100 text-indigo-600"
              }`}
            >
              <FaFileAlt />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{file.name}</span>
              <span className={`text-xs ${isMe ? "text-indigo-100" : "text-gray-400"}`}>
                {formatSize(file.size)}
              </span>
            </span>
          </a>
        )
      )}
    </div>
  );
};

const ReactionChips = ({ reactions, isMe, currentUserId, nameFor, onToggle }) => {
  const grouped = getGroupedReactions(reactions);
  if (grouped.length === 0) return null;

  return (
    <div className={`absolute -bottom-3.5 z-[5] flex gap-1 ${isMe ? "right-2" : "left-2"}`}>
      {grouped.map(({ emoji, count, users }) => {
        const mine = users.includes(currentUserId);
        return (
          <button
            key={emoji}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(emoji);
            }}
            title={users.map(nameFor).join(", ")}
            className={`flex h-6 items-center gap-0.5 rounded-full border px-1.5 text-xs shadow-sm transition hover:scale-105 ${
              mine ? "border-indigo-200 bg-indigo-50" : "border-gray-100 bg-white"
            }`}
          >
            <span>{emoji}</span>
            {count > 1 && <span className="font-medium text-gray-600">{count}</span>}
          </button>
        );
      })}
    </div>
  );
};

const MessageList = ({
  messages,
  currentUserId,
  peer,
  loading,
  hasMore,
  onLoadMore,
  onReact,
  onMoreReactions,
  onEdit,
  onDelete,
  onReport,
  onCopy,
}) => {
  const [gallery, setGallery] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [showJump, setShowJump] = useState(false);

  const scrollRef = useRef(null);
  const atBottomRef = useRef(true);
  const edgesRef = useRef({ first: null, last: null, height: 0 });

  const scrollToBottom = (behavior = "auto") => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  };

  // decides what to do with the scroll position after the list changes:
  // first load jumps to the bottom, older pages keep your place, new
  // messages follow along unless you're reading further up
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const first = messages[0]?.id || null;
    const last = messages[messages.length - 1]?.id || null;
    const prev = edgesRef.current;

    if (!prev.last) {
      el.scrollTop = el.scrollHeight;
    } else if (first !== prev.first && last === prev.last) {
      el.scrollTop += el.scrollHeight - prev.height;
    } else if (last !== prev.last) {
      const newest = messages[messages.length - 1];
      if (atBottomRef.current || newest?.senderId === currentUserId) {
        scrollToBottom("smooth");
      } else {
        setShowJump(true);
      }
    }

    edgesRef.current = { first, last, height: el.scrollHeight };
  }, [messages, currentUserId]);

  const handleScroll = () => {
    const el = scrollRef.current;
    const distance = el.scrollHeight - el.clientHeight - el.scrollTop;
    atBottomRef.current = distance < 120;
    if (atBottomRef.current && showJump) setShowJump(false);
  };

  // images change the height after they load, stay pinned if we were at the bottom
  const handleMediaLoad = () => {
    if (atBottomRef.current) scrollToBottom();
  };

  const nameFor = (userId) => (userId === currentUserId ? "You" : peer?.name || "Them");

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onClick={() => setActiveId(null)}
        className="thin-scroll h-full overflow-y-auto bg-gray-50 px-3 py-4 sm:px-6"
      >
        {loading && (
          <div className="flex h-full items-center justify-center">
            <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-indigo-500 border-t-transparent" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <img src={peer?.avatar} alt="" className="mb-3 h-16 w-16 rounded-full object-cover" />
            <p className="font-semibold text-gray-900">{peer?.name}</p>
            <p className="mt-1 text-sm text-gray-500">No messages yet. Say hi 👋</p>
          </div>
        )}

        {!loading && hasMore && (
          <div className="mb-4 flex justify-center">
            <button
              onClick={onLoadMore}
              className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-100"
            >
              Load earlier messages
            </button>
          </div>
        )}

        {!loading &&
          messages.map((msg, index) => {
            const prev = messages[index - 1];
            const next = messages[index + 1];
            const showDate = !prev || !sameDay(prev, msg);
            const dateLabel = showDate && (
              <div className="my-4 flex justify-center">
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-gray-500 shadow-sm">
                  {getDateGroupHeader(msg.timestamp) || "Today"}
                </span>
              </div>
            );

            if (msg.type === "call") {
              return (
                <Fragment key={msg.id}>
                  {dateLabel}
                  <CallBubble msg={msg} />
                </Fragment>
              );
            }

            const isMe = msg.senderId === currentUserId;
            const text = visibleText(msg);
            const files = msg.attachments || [];
            const hasReactions = Object.keys(msg.reactions || {}).length > 0;
            const startsRun = showDate || !sameRun(prev, msg);
            const endsRun = !sameRun(msg, next) || !sameDay(msg, next);
            const imagesOnly = !text && files.length > 0 && files.every(isImage);

            const bubbleColor = msg.deleted
              ? "bg-white text-gray-400 border border-dashed border-gray-200"
              : isMe
                ? "bg-indigo-500 text-white"
                : "bg-white text-gray-900 shadow-sm";
            const corner = isMe ? (endsRun ? "rounded-br-md" : "") : endsRun ? "rounded-bl-md" : "";

            return (
              <Fragment key={msg.id}>
                {dateLabel}
                <div
                  className={`group flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"} ${
                    startsRun ? "mt-3" : "mt-0.5"
                  } ${hasReactions ? "mb-4" : ""}`}
                  onDoubleClick={() => !msg.deleted && onReact(msg, "❤️")}
                >
                  {!isMe && (
                    <div className="w-8 flex-shrink-0">
                      {endsRun && (
                        <img
                          src={peer?.avatar}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      )}
                    </div>
                  )}

                  <div
                    className={`flex max-w-[78%] flex-col sm:max-w-[65%] ${isMe ? "items-end" : "items-start"}`}
                  >
                    <div
                      className="relative"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveId((current) => (current === msg.id ? null : msg.id));
                      }}
                    >
                      {!msg.deleted && (
                        <MessageActions
                          isMe={isMe}
                          visible={activeId === msg.id}
                          myReaction={msg.reactions?.[currentUserId]}
                          canEdit={!!text}
                          canCopy={!!text}
                          onReact={(emoji) => onReact(msg, emoji)}
                          onMoreReactions={() => onMoreReactions(msg)}
                          onEdit={() => onEdit(msg)}
                          onCopy={() => onCopy(msg)}
                          onDelete={() => onDelete(msg)}
                          onReport={() => onReport(msg)}
                        />
                      )}

                      <div
                        className={`rounded-2xl ${corner} ${bubbleColor} ${
                          imagesOnly ? "p-1" : "px-3.5 py-2"
                        } ${msg.pending ? "opacity-80" : ""}`}
                      >
                        {msg.deleted ? (
                          <p className="flex items-center gap-1.5 text-sm italic">
                            <FiSlash className="text-xs" /> This message was deleted
                          </p>
                        ) : (
                          <>
                            {files.length > 0 && (
                              <Attachments
                                files={files}
                                isMe={isMe}
                                onMediaLoad={handleMediaLoad}
                                onOpenImage={(images, i) => setGallery({ images, index: i })}
                              />
                            )}
                            {text && (
                              <p
                                className={`whitespace-pre-wrap break-words text-[15px] leading-snug ${files.length ? "mt-1.5" : ""}`}
                              >
                                {text}
                              </p>
                            )}
                          </>
                        )}

                        <div
                          className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${
                            imagesOnly ? "px-2 pb-1" : ""
                          } ${isMe && !msg.deleted ? "text-indigo-100" : "text-gray-400"}`}
                        >
                          {msg.edited && !msg.deleted && <span>edited ·</span>}
                          <span>{formatTime(msg.timestamp)}</span>
                          {isMe && !msg.deleted && (
                            <span title={msg.pending ? "Sending" : msg.read ? "Seen" : "Delivered"}>
                              {msg.pending ? (
                                <FiClock className="text-[10px]" />
                              ) : msg.read ? (
                                <span className="flex text-sky-200">
                                  <FiCheck />
                                  <FiCheck className="-ml-2" />
                                </span>
                              ) : (
                                <FiCheck />
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {!msg.deleted && (
                        <ReactionChips
                          reactions={msg.reactions}
                          isMe={isMe}
                          currentUserId={currentUserId}
                          nameFor={nameFor}
                          onToggle={(emoji) => onReact(msg, emoji)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </Fragment>
            );
          })}
      </div>

      <AnimatePresence>
        {showJump && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => {
              setShowJump(false);
              scrollToBottom("smooth");
            }}
            className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-indigo-600"
          >
            New messages <FiArrowDown />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gallery && (
          <ImageGalleryModal
            images={gallery.images}
            initialIndex={gallery.index}
            onClose={() => setGallery(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessageList;
