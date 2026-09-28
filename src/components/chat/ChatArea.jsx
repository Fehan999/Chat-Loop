// components/chat/ChatArea.jsx
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { AnimatePresence } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import {
  FiAlertCircle,
  FiArrowLeft,
  FiFlag,
  FiInfo,
  FiMoreVertical,
  FiPhone,
  FiTrash2,
  FiVideo,
} from "react-icons/fi";
import callService from "../../firebase/callService";
import { db } from "../../firebase/config";
import {
  deleteConversation,
  listenToTypingStatus,
  listenToUserStatus,
} from "../../firebase/firestoreService";
import {
  getExactTime,
  getStatusDotClass,
  getStatusText,
} from "../../utils/statusHelper";
import MessageInput from "./MessageInput";
import MessageList from "./MessageList";
import CallInterface from "./call/CallInterface";
import IncomingCallModal from "./call/IncomingCallModal";
import EditMessageModal from "./message/EditMessageModal";
import EmojiPickerModal from "./message/EmojiPickerModal";
import ReportMessageModal from "./message/ReportMessageModal";

import {
  deleteMessage,
  editMessage,
  reportMessage,
  toggleMessageReaction,
} from "../../firebase/messageActions";

const ChatArea = ({
  chat,
  messages,
  onSendMessage,
  onReportUser,
  onBack,
  isMobileView,
  currentUser,
}) => {
  const [isUserOnCall, setIsUserOnCall] = useState(false);
  const messagesEndRef = useRef(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [selectedMessageText, setSelectedMessageText] = useState("");
  const [userStatus, setUserStatus] = useState(chat.status || "offline");
  const [lastSeen, setLastSeen] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});

  // Call-related state
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [isStartingCall, setIsStartingCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Listen to real-time status
  useEffect(() => {
    if (chat.userId && !chat.isAI) {
      const unsubscribe = listenToUserStatus(
        chat.userId,
        (status, lastSeenTime) => {
          setUserStatus(status || "offline");
          setLastSeen(lastSeenTime?.toDate?.() || lastSeenTime);
        }
      );
      return () => unsubscribe();
    }
  }, [chat.userId, chat.isAI]);

  // Check if user is on a call
  useEffect(() => {
    const checkUserCallStatus = async () => {
      if (currentUser) {
        const activeCallData = await callService.checkUserActiveCall(
          currentUser.uid
        );
        setIsUserOnCall(!!activeCallData);

        // Listen for call status changes
        const callsRef = collection(db, "calls");
        const q = query(
          callsRef,
          where("callerId", "==", currentUser.uid),
          where("status", "in", ["calling", "ringing", "connecting", "active"])
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          setIsUserOnCall(!snapshot.empty);
        });

        return () => unsubscribe();
      }
    };

    checkUserCallStatus();
  }, [currentUser]);

  // Listen to typing indicators
  useEffect(() => {
    if (chat.id) {
      const unsubscribe = listenToTypingStatus(chat.id, (typingData) => {
        setTypingUsers(typingData);
      });
      return () => unsubscribe();
    }
  }, [chat.id]);

  // Listen for incoming calls for this specific chat
  useEffect(() => {
    if (currentUser && chat.userId) {
      const unsubscribe = callService.listenForIncomingCalls(
        currentUser.uid,
        (call) => {
          // Only show incoming call modal if it's for this chat
          if (call && call.status === "calling" && call.chatId === chat.id) {
            setIncomingCall(call);
          }
        }
      );

      return () => unsubscribe();
    }
  }, [currentUser, chat.id, chat.userId]);

  const getTypingText = () => {
    const typingUserIds = Object.entries(typingUsers)
      .filter(
        ([userId, isTyping]) => isTyping === true && userId !== currentUser?.uid
      )
      .map(([userId]) => userId);

    if (typingUserIds.length === 0) return null;
    if (typingUserIds.length === 1) {
      return `${chat.name} is typing...`;
    }
    return `${typingUserIds.length} people are typing...`;
  };

  const handleDeleteConversation = async () => {
    if (chat.id && currentUser) {
      const success = await deleteConversation(chat.id, currentUser.uid);
      if (success) {
        setShowDeleteConfirm(false);
        setShowMenu(false);
      }
    }
  };

  const handleEditMessage = async (messageId, newText) => {
    if (chat.id && currentUser) {
      const success = await editMessage(
        chat.id,
        messageId,
        newText,
        currentUser.uid
      );
      if (success) {
        setShowEditModal(false);
        setSelectedMessageId(null);
      }
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (chat.id && currentUser) {
      const success = await deleteMessage(chat.id, messageId, currentUser.uid);
      if (success) {
        console.log("Message deleted successfully");
      }
    }
  };

  const handleToggleReaction = async (messageId, reaction) => {
    if (chat.id && currentUser) {
      await toggleMessageReaction(
        chat.id,
        messageId,
        currentUser.uid,
        reaction
      );
    }
  };

  const handleReportMessage = async (messageId, reason) => {
    if (chat.id && currentUser && reason) {
      const success = await reportMessage(
        chat.id,
        messageId,
        currentUser.uid,
        reason
      );
      if (success) {
        setShowReportModal(false);
        setSelectedMessageId(null);
        alert("Message reported successfully");
      }
    }
  };

  const handleDoubleClickMessage = (messageId) => {
    handleToggleReaction(messageId, "❤️");
  };

  const handleOpenEmojiPicker = (messageId) => {
    setSelectedMessageId(messageId);
    setShowEmojiPicker(true);
  };

  const handleOpenEditModal = (messageId, messageText) => {
    setSelectedMessageId(messageId);
    setSelectedMessageText(messageText);
    setShowEditModal(true);
  };

  // Call handlers
  const handleStartCall = async (isVideo = false) => {
    if (!currentUser || !chat.userId) return;

    // Check if user is already on a call
    if (isUserOnCall) {
      alert("You are already on a call. Please end the current call first.");
      return;
    }

    setIsStartingCall(true);
    try {
      const callId = await callService.initiateCall(
        chat.id,
        currentUser.uid,
        chat.userId,
        isVideo
      );

      setActiveCall({
        id: callId,
        isVideo,
        chat,
        isInitiator: true,
      });
    } catch (error) {
      console.error("Error starting call:", error);
      if (error.message.includes("already on a call")) {
        alert(error.message);
      } else {
        alert("Failed to start call. Please try again.");
      }
    } finally {
      setIsStartingCall(false);
    }
  };

  const handleEndCall = async () => {
    if (activeCall) {
      const duration = callDuration || 0;
      await callService.endCall(activeCall.id, duration);
      // Remove the duplicate addCallMessage here since endCall already adds it
    }
    setActiveCall(null);
    setCallDuration(0);
  };

  const handleAcceptCall = async (call) => {
    try {
      await callService.acceptCall(call.id);
      setActiveCall({
        id: call.id,
        isVideo: call.isVideo,
        chat,
        isInitiator: false,
      });
      setIncomingCall(null);
    } catch (error) {
      console.error("Error accepting call:", error);
      alert("Failed to accept call. Please try again.");
    }
  };

  const handleRejectCall = async (callId) => {
    try {
      await callService.rejectCall(callId);
      setIncomingCall(null);
    } catch (error) {
      console.error("Error rejecting call:", error);
    }
  };

  const statusText = getStatusText(userStatus, lastSeen);
  const statusDotClass = getStatusDotClass(userStatus);
  const exactLastSeen = lastSeen ? getExactTime(lastSeen) : null;
  const typingText = getTypingText();

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center gap-3 sticky top-0 z-10">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FiArrowLeft className="text-xl text-gray-600" />
          </button>
        )}

        <div className="relative group">
          <img
            src={chat.avatar}
            alt={chat.name}
            className="w-10 h-10 rounded-full object-cover"
          />
          <span
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${statusDotClass}`}
          ></span>

          {userStatus !== "online" && lastSeen && (
            <div className="absolute bottom-full left-0 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              Last active: {exactLastSeen}
            </div>
          )}
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{chat.name}</h3>
          <p className="text-xs text-gray-500">
            {isUserOnCall ? (
              <span className="text-red-500 flex items-center gap-1">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                On a call
              </span>
            ) : (
              statusText
            )}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => handleStartCall(false)}
            disabled={isStartingCall || isUserOnCall}
            className={`p-2 rounded-full transition-colors ${
              isUserOnCall
                ? "bg-gray-100 cursor-not-allowed opacity-50"
                : "hover:bg-gray-100"
            }`}
            title={isUserOnCall ? "You are already on a call" : "Audio call"}
          >
            <FiPhone
              className={`text-lg ${
                isUserOnCall ? "text-gray-400" : "text-gray-600"
              }`}
            />
          </button>
          <button
            onClick={() => handleStartCall(true)}
            disabled={isStartingCall || isUserOnCall}
            className={`p-2 rounded-full transition-colors ${
              isUserOnCall
                ? "bg-gray-100 cursor-not-allowed opacity-50"
                : "hover:bg-gray-100"
            }`}
            title={isUserOnCall ? "You are already on a call" : "Video call"}
          >
            <FiVideo
              className={`text-lg ${
                isUserOnCall ? "text-gray-400" : "text-gray-600"
              }`}
            />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FiMoreVertical className="text-gray-600 text-lg" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20">
                <button
                  onClick={() => {
                    onReportUser(chat);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <FiFlag className="text-red-500" />
                  Report User
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <FiInfo className="text-gray-500" />
                  View Info
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <FiTrash2 />
                  Delete Conversation
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <FiAlertCircle className="text-red-500 text-2xl" />
              <h3 className="text-lg font-semibold text-gray-900">
                Delete Conversation?
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              This will delete all messages in this conversation. This action
              cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConversation}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showReportModal && (
        <ReportMessageModal
          onClose={() => {
            setShowReportModal(false);
            setSelectedMessageId(null);
          }}
          onSubmit={(reason) => handleReportMessage(selectedMessageId, reason)}
        />
      )}

      {showEditModal && (
        <EditMessageModal
          message={{ text: selectedMessageText }}
          onSave={(newText) => handleEditMessage(selectedMessageId, newText)}
          onClose={() => {
            setShowEditModal(false);
            setSelectedMessageId(null);
          }}
        />
      )}

      {showEmojiPicker && (
        <EmojiPickerModal
          onSelect={(emoji) => {
            handleToggleReaction(selectedMessageId, emoji);
            setShowEmojiPicker(false);
            setSelectedMessageId(null);
          }}
          onClose={() => {
            setShowEmojiPicker(false);
            setSelectedMessageId(null);
          }}
        />
      )}

      {/* Messages */}
      <MessageList
        messages={messages}
        currentUser="me"
        chatType="friend"
        onEditMessage={handleOpenEditModal}
        onDeleteMessage={handleDeleteMessage}
        onReportMessage={(messageId) => {
          setSelectedMessageId(messageId);
          setShowReportModal(true);
        }}
        onToggleReaction={handleToggleReaction}
        onDoubleClickMessage={handleDoubleClickMessage}
        onOpenEmojiPicker={handleOpenEmojiPicker}
      />
      <div ref={messagesEndRef} />

      {/* Typing Indicator */}
      {typingText && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
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
            <p className="text-xs text-gray-500">{typingText}</p>
          </div>
        </div>
      )}

      {/* Message Input */}
      <MessageInput
        onSendMessage={onSendMessage}
        placeholder={`Message ${chat.name}...`}
        currentUser={currentUser}
        chatId={chat.id}
        chatUserName={chat.name}
      />

      {/* Call Interface */}
      <AnimatePresence>
        {activeCall && (
          <CallInterface
            callId={activeCall.id}
            chat={activeCall.chat}
            currentUser={currentUser}
            isInitiator={activeCall.isInitiator}
            onEndCall={handleEndCall}
            isVideo={activeCall.isVideo}
          />
        )}
      </AnimatePresence>

      {/* Incoming Call Modal */}
      <AnimatePresence>
        {incomingCall && (
          <IncomingCallModal
            call={incomingCall}
            onAccept={handleAcceptCall}
            onReject={handleRejectCall}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatArea;
