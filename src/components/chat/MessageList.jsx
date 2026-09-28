// components/chat/MessageList.jsx
import { useRef, useState } from "react";
import {
  FaCheck,
  FaCheckDouble,
  FaFile,
  FaPause,
  FaPhone,
  FaPhoneSlash,
  FaPlay,
  FaVideo,
} from "react-icons/fa";
import { formatDuration } from "../../utils/dateUtils";
import ImageGalleryModal from "./message/ImageGalleryModal";
import MessageActions from "./MessageActions";

// Voice Message Player Component
const VoiceMessagePlayer = ({ audioUrl, duration: propDuration, isMe }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(propDuration || 0);
  const audioRef = useRef(null);

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div
      className={`flex items-center gap-2 rounded-full px-3 py-1.5 min-w-[160px] max-w-[200px] ${
        isMe ? "bg-indigo-100" : "bg-gray-100"
      }`}
    >
      <button
        onClick={togglePlay}
        className="w-7 h-7 bg-indigo-500 text-white rounded-full flex items-center justify-center hover:bg-indigo-600 transition-colors flex-shrink-0"
      >
        {isPlaying ? <FaPause size={10} /> : <FaPlay size={10} />}
      </button>
      <div className="flex-1 h-1 bg-gray-300 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 transition-all duration-100"
          style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 min-w-[35px] font-mono">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onEnded={() => setIsPlaying(false)}
      />
    </div>
  );
};

// Call Message Component
const CallMessage = ({ message, isMe }) => {
  const callData = message.callData;
  const isMissed = callData?.status === "missed";
  const isRejected = callData?.status === "rejected";
  const isEnded = callData?.status === "ended";
  const isIncoming = !isMe;

  let icon = <FaPhone className="text-lg" />;
  let bgColor = "bg-gray-100";
  let textColor = "text-gray-700";
  let statusText = "";

  if (callData?.isVideo) {
    icon = <FaVideo className="text-lg" />;
  }

  if (isMissed) {
    bgColor = "bg-red-50";
    textColor = "text-red-600";
    statusText = "Missed call";
    icon = <FaPhoneSlash className="text-lg" />;
  } else if (isRejected) {
    bgColor = "bg-orange-50";
    textColor = "text-orange-600";
    statusText = "Call rejected";
  } else if (isEnded) {
    if (callData?.duration > 0) {
      statusText = `Call ended • ${formatDuration(callData.duration)}`;
    } else {
      statusText = "Call ended";
    }
  }

  if (!callData?.status || callData?.status === "calling") {
    statusText = isIncoming ? "Incoming call" : "Outgoing call";
  }

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} my-2`}>
      <div
        className={`flex items-center gap-3 px-4 py-2 rounded-xl ${bgColor} ${textColor} max-w-[80%]`}
      >
        <div
          className={`p-2 rounded-full ${
            isMe ? "bg-indigo-100" : "bg-gray-200"
          }`}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium">{statusText}</p>
          {callData?.duration > 0 && callData?.status === "ended" && (
            <p className="text-xs opacity-75 mt-0.5">
              {formatDuration(callData.duration)}
            </p>
          )}
          {isMissed && (
            <p className="text-xs opacity-75 mt-0.5">
              {isIncoming ? "You missed a call" : "Call was missed"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const MessageList = ({
  messages,
  currentUser,
  onEditMessage,
  onDeleteMessage,
  onReportMessage,
  onToggleReaction,
  onDoubleClickMessage,
  onOpenEmojiPicker,
}) => {
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const messagesEndRef = useRef(null);

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    try {
      if (timestamp?.toDate) {
        return timestamp.toDate().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      return new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const renderAttachments = (attachments, isMe, hasText) => {
    if (!attachments || attachments.length === 0) return null;

    return (
      <div className={`flex flex-wrap gap-2 ${hasText ? "mt-2" : ""}`}>
        {attachments.map((file, idx) => {
          if (
            file.type?.startsWith("audio/") ||
            file.name?.endsWith(".webm") ||
            file.name?.endsWith(".mp3") ||
            file.isVoice
          ) {
            return (
              <div key={idx} className="mt-1">
                <VoiceMessagePlayer
                  audioUrl={file.url}
                  duration={file.duration}
                  isMe={isMe}
                />
              </div>
            );
          }

          if (file.type?.startsWith("image/")) {
            return (
              <div key={idx} className="relative group">
                <img
                  src={file.url}
                  alt=""
                  loading="lazy"
                  className="w-full max-w-[200px] max-h-[200px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity object-cover"
                  onClick={(e) => {
                    e.stopPropagation();
                    const imagesInMessage = attachments.filter((f) =>
                      f.type?.startsWith("image/")
                    );
                    setGalleryImages(imagesInMessage);
                    setGalleryIndex(
                      imagesInMessage.findIndex((i) => i.url === file.url)
                    );
                    setShowGallery(true);
                  }}
                />
              </div>
            );
          }

          return (
            <a
              key={idx}
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <FaFile className="text-gray-600" />
              <span className="text-sm text-gray-700 truncate max-w-[150px]">
                {file.name}
              </span>
            </a>
          );
        })}
      </div>
    );
  };

  if (!messages?.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        No messages yet
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => {
          if (msg.type === "call") {
            return (
              <CallMessage
                key={msg.id}
                message={msg}
                isMe={msg.sender === "me"}
              />
            );
          }

          const isMe = msg.sender === "me";
          const isDeleted = msg.deleted;
          const hasText =
            msg.text &&
            msg.text.trim() !== "" &&
            !msg.text.includes("🎤 Voice message");
          const onlyMedia =
            !hasText && msg.attachments && msg.attachments.length > 0;

          let bubbleClass = "";
          if (isMe) {
            if (onlyMedia) {
              bubbleClass = "bg-transparent rounded-lg overflow-hidden";
            } else {
              bubbleClass =
                "bg-indigo-500 text-white rounded-2xl rounded-br-none";
            }
          } else {
            bubbleClass =
              "bg-white text-gray-900 rounded-2xl rounded-bl-none shadow-sm";
          }

          return (
            <div
              key={msg.id}
              className={`group flex ${isMe ? "justify-end" : "justify-start"} relative`}
              onDoubleClick={() => onDoubleClickMessage && onDoubleClickMessage(msg.id)}
            >
              <div
                className={`flex items-end gap-2 max-w-[75%] ${
                  isMe ? "flex-row-reverse" : ""
                }`}
              >
                {!isMe && (
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                    <img
                      src={
                        msg.senderAvatar ||
                        "https://ui-avatars.com/api/?name=User&background=6366f1&color=fff"
                      }
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="relative flex flex-col max-w-full">
                  {/* MessageActions - Reactions at TOP */}
                  {!isDeleted && (
                    <div className="mb-1">
                      <MessageActions
                        message={msg}
                        currentUser={currentUser}
                        onEdit={onEditMessage}
                        onDelete={onDeleteMessage}
                        onReport={onReportMessage}
                        onReactionToggle={onToggleReaction}
                        isOwnMessage={isMe}
                      />
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`px-4 py-2 ${bubbleClass} ${
                      isDeleted ? "opacity-60 italic" : ""
                    } relative`}
                  >
                    {!isMe && msg.senderName && !onlyMedia && (
                      <p className="text-xs font-semibold text-indigo-600 mb-1">
                        {msg.senderName}
                      </p>
                    )}

                    {hasText && !isDeleted && (
                      <p className="text-sm break-words whitespace-pre-wrap">
                        {msg.text}
                      </p>
                    )}

                    {isDeleted && (
                      <p className="text-sm italic text-gray-500">
                        This message was deleted
                      </p>
                    )}

                    {!isDeleted &&
                      msg.attachments &&
                      renderAttachments(msg.attachments, isMe, hasText)}

                    {!isDeleted && (!onlyMedia || hasText) && (
                      <div
                        className={`flex items-center gap-1 mt-1 ${
                          isMe ? "justify-end" : "justify-start"
                        }`}
                      >
                        <p
                          className={`text-xs ${
                            isMe ? "text-indigo-100" : "text-gray-400"
                          }`}
                        >
                          {formatTime(msg.timestamp)}
                          {msg.edited && !isDeleted && (
                            <span className="ml-1">(edited)</span>
                          )}
                        </p>
                        {isMe && !isDeleted && (
                          <span
                            className="text-xs"
                            title={msg.read ? "Seen" : "Delivered"}
                          >
                            {msg.read ? <FaCheckDouble /> : <FaCheck />}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Image Gallery Modal */}
      {showGallery && (
        <ImageGalleryModal
          images={galleryImages}
          initialIndex={galleryIndex}
          onClose={() => setShowGallery(false)}
        />
      )}
    </>
  );
};

export default MessageList;