// components/chat/ChatDashboard.jsx
import { onAuthStateChanged } from "firebase/auth";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { auth } from "../../firebase/config";
import {
  getFriendRequests,
  getOrCreateChat,
  getUserChats,
  getUserData,
  incrementUnreadCount,
  initializeChatsForFriends,
  listenToMessages,
  listenToUnreadCounts,
  listenToUserFriends,
  markMessagesAsRead,
  sendMessage,
  updateUnreadCount,
} from "../../firebase/firestoreService";
// import AIChatButton from "./AIChatButton";
import ChatArea from "./ChatArea";
import MobileNav from "./MobileNav";
import ReportUserModal from "./ReportUserModal";
import SettingsPanel from "./SettingsPanel";
import Sidebar from "./Sidebar";
import WelcomePlaceholder from "./WelcomePlaceholder";
import AddFriendPage from "./add_friend/AddFriendPage";

// Simple notification sound using Web Audio API
let audioContext = null;

const playNotificationSound = () => {
  try {
    if (!audioContext) {
      // Only create when user has interacted
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioContext = new AudioContextClass();
      }
    }

    if (audioContext && audioContext.state === "suspended") {
      audioContext
        .resume()
        .then(() => {
          playSound();
        })
        .catch((e) => console.log("AudioContext resume failed:", e));
    } else if (audioContext) {
      playSound();
    }

    function playSound() {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      gainNode.gain.value = 0.15;

      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(
        0.00001,
        audioContext.currentTime + 0.3
      );
      oscillator.stop(audioContext.currentTime + 0.3);
    }
  } catch (e) {
    console.log("Sound not supported");
  }
};

const ChatDashboard = () => {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedUserForReport, setSelectedUserForReport] = useState(null);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});

  let unsubscribeChats = null;
  let unsubscribeFriends = null;
  let unsubscribeUnread = null;
  let currentChatListener = null;
  const backgroundListeners = useRef({});
  const lastMessageIds = useRef({});

  // Handle responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load messages for selected chat only
  useEffect(() => {
    if (selectedChat && currentUser) {
      // Clean up previous listener
      if (currentChatListener) {
        currentChatListener();
      }

      // Listen to messages for selected chat
      currentChatListener = listenToMessages(
        selectedChat.id,
        async (loadedMessages) => {
          const formattedMessages = loadedMessages.map((msg) => ({
            id: msg.id,
            text: msg.text,
            sender: msg.senderId === currentUser.uid ? "me" : "other",
            formattedTime: msg.formattedTime,
            timestamp: msg.timestamp,
            type: msg.senderId === currentUser.uid ? "sent" : "received",
            read: msg.read,
            attachments: msg.attachments,
            senderName: msg.senderName,
            senderAvatar: msg.senderAvatar,
            reactions: msg.reactions || {},
          }));
          setMessages(formattedMessages);

          // Mark messages as read and clear unread count
          await markMessagesAsRead(selectedChat.id, currentUser.uid);
          await updateUnreadCount(selectedChat.id, currentUser.uid);
        }
      );
    }

    return () => {
      if (currentChatListener) {
        currentChatListener();
      }
    };
  }, [selectedChat, currentUser]);

  // Listen to all chats for background notifications
  useEffect(() => {
    if (currentUser && chats.length > 0) {
      // Clean up old listeners
      Object.values(backgroundListeners.current).forEach((unsub) => unsub());
      backgroundListeners.current = {};

      chats.forEach((chat) => {
        const unsubscribe = listenToMessages(
          chat.id,
          async (loadedMessages) => {
            if (loadedMessages.length > 0 && selectedChat?.id !== chat.id) {
              const lastMsg = loadedMessages[loadedMessages.length - 1];
              // Only process messages from others
              if (
                lastMsg.senderId !== currentUser.uid &&
                lastMsg.id !== lastMessageIds.current[chat.id]
              ) {
                lastMessageIds.current[chat.id] = lastMsg.id;
                playNotificationSound();
                // Increment unread count for this chat
                await incrementUnreadCount(chat.id, currentUser.uid);
              }
            }
          }
        );
        backgroundListeners.current[chat.id] = unsubscribe;
      });
    }

    return () => {
      Object.values(backgroundListeners.current).forEach((unsub) => unsub());
    };
  }, [currentUser, chats, selectedChat]);

  // Auth listener and load user data
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const userData = await getUserData(user.uid);
          setUserData(userData);

          // Load friends list
          unsubscribeFriends = listenToUserFriends(
            user.uid,
            (loadedFriends) => {
              setFriends(loadedFriends);
              if (loadedFriends.length > 0) {
                initializeChatsForFriends(user.uid, loadedFriends);
              }
            }
          );

          // Load user's chats
          unsubscribeChats = getUserChats(user.uid, (loadedChats) => {
            setChats(loadedChats);
            setLoading(false);
            setError(null);
          });

          // Listen to unread counts
          unsubscribeUnread = listenToUnreadCounts(user.uid, (counts) => {
            setUnreadCounts(counts);
          });
        } catch (err) {
          console.error("Error loading user data:", err);
          setError("Failed to load chats. Please refresh the page.");
          setLoading(false);
        }
      } else {
        setCurrentUser(null);
        setUserData(null);
        setFriends([]);
        setChats([]);
        setMessages([]);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeChats) unsubscribeChats();
      if (unsubscribeFriends) unsubscribeFriends();
      if (unsubscribeUnread) unsubscribeUnread();
      if (currentChatListener) currentChatListener();
      Object.values(backgroundListeners.current).forEach((unsub) => unsub());
    };
  }, []);

  // Load friend requests
  useEffect(() => {
    if (currentUser) {
      const unsubscribeRequests = getFriendRequests(
        currentUser.uid,
        (requests) => {
          setFriendRequests(requests);
        }
      );
      return () => unsubscribeRequests();
    }
  }, [currentUser]);

  const handleSendMessage = async (text, attachments = []) => {
    if (
      selectedChat &&
      currentUser &&
      (text.trim() || attachments.length > 0)
    ) {
      const messageData = {
        text: text.trim(),
        senderId: currentUser.uid,
        senderName: userData?.name,
        senderAvatar: userData?.avatar,
        attachments: attachments,
      };

      const success = await sendMessage(selectedChat.id, messageData);
      if (!success) {
        console.error("Failed to send message");
      }
    }
  };

  const handleChatSelect = async (chat) => {
    // If it's a new friend without a chat, create one first
    if (chat.isNew && chat.userId && currentUser) {
      const newChat = await getOrCreateChat(currentUser.uid, chat.userId);
      if (newChat) {
        chat.id = newChat.id;
        chat.isNew = false;
      }
    }

    // Clear unread count when selecting chat
    if (
      chat.id &&
      currentUser &&
      (unreadCounts[chat.id] > 0 || chat.unreadCount > 0)
    ) {
      await updateUnreadCount(chat.id, currentUser.uid);
    }

    setSelectedChat(chat);
    if (isMobileView) {
      setShowMobileChat(true);
    }
  };

  const handleBackToChats = () => {
    setShowMobileChat(false);
    setSelectedChat(null);
  };

  const handleAddFriend = async () => {
    setShowAddFriend(false);
  };

  const handleUpdateProfile = async (updatedData) => {
    setUserData((prev) => ({ ...prev, ...updatedData }));
    setShowSettings(false);
  };

  const handleReportUser = (user) => {
    setSelectedUserForReport(user);
    setShowReportModal(true);
  };

  // Combine chats and friends with unread counts
  const sidebarChats = useMemo(() => {
    const uniqueChats = new Map();

    chats.forEach((chat) => {
      if (chat.otherUser) {
        uniqueChats.set(chat.otherUser.uid, {
          id: chat.id,
          type: "friend",
          name: chat.otherUser?.name || "User",
          username: chat.otherUser?.username || "@user",
          avatar:
            chat.otherUser?.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              chat.otherUser?.name || "User"
            )}&background=6366f1&color=fff`,
          status: chat.otherUser?.status || "offline",
          lastMessage: chat.lastMessage || "No messages yet",
          lastSeen: chat.lastMessageTime?.toDate?.()
            ? new Date(chat.lastMessageTime.toDate()).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Just now",
          unreadCount: unreadCounts[chat.id] || 0,
          isAI: false,
          userId: chat.otherUser?.uid,
          isNew: false,
          lastMessageTime: chat.lastMessageTime?.toDate?.() || new Date(0),
        });
      }
    });

    friends.forEach((friend) => {
      if (!uniqueChats.has(friend.id)) {
        uniqueChats.set(friend.id, {
          id: `friend_${friend.id}`,
          type: "friend",
          name: friend.name,
          username: friend.username,
          avatar:
            friend.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              friend.name || "User"
            )}&background=6366f1&color=fff`,
          status: friend.status || "offline",
          lastMessage: "Start a conversation!",
          lastSeen: "Click to chat",
          unreadCount: 0,
          isAI: false,
          userId: friend.id,
          isNew: true,
          lastMessageTime: new Date(0),
        });
      }
    });

    return Array.from(uniqueChats.values()).sort((a, b) => {
      if (a.isNew && !b.isNew) return 1;
      if (!a.isNew && b.isNew) return -1;
      return b.lastMessageTime - a.lastMessageTime;
    });
  }, [chats, friends, unreadCounts]);

  if (loading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your chats...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md p-8 bg-white rounded-2xl shadow-lg">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar/Chats List */}
      <div
        className={`${
          isMobileView ? (showMobileChat ? "hidden" : "w-full") : "w-96"
        } h-full flex-shrink-0 border-r border-gray-200`}
      >
        <Sidebar
          chats={sidebarChats}
          selectedChat={selectedChat}
          onSelectChat={handleChatSelect}
          onAddFriend={() => setShowAddFriend(true)}
          onOpenSettings={() => setShowSettings(true)}
          isMobileView={isMobileView}
          currentUser={currentUser}
        />
      </div>

      {/* Chat Area or Welcome Placeholder */}
      <div className="flex-1 h-full">
        {selectedChat ? (
          <ChatArea
            chat={selectedChat}
            messages={messages}
            onSendMessage={handleSendMessage}
            onReportUser={handleReportUser}
            onBack={isMobileView ? handleBackToChats : null}
            isMobileView={isMobileView}
            currentUser={currentUser}
          />
        ) : (
          !isMobileView && <WelcomePlaceholder />
        )}
      </div>

      {/* Mobile Navigation */}
      {isMobileView && !selectedChat && (
        <MobileNav
          onOpenSettings={() => setShowSettings(true)}
          onAddFriend={() => setShowAddFriend(true)}
        />
      )}

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && userData && (
          <SettingsPanel
            user={userData}
            onClose={() => setShowSettings(false)}
            onUpdate={handleUpdateProfile}
            currentUser={currentUser}
          />
        )}
      </AnimatePresence>

      {/* Add Friend Page */}
      <AnimatePresence>
        {showAddFriend && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30 }}
            className="fixed inset-0 bg-white z-50"
          >
            <AddFriendPage
              onBack={() => setShowAddFriend(false)}
              currentUserId={currentUser?.uid}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report User Modal */}
      <ReportUserModal
        isOpen={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setSelectedUserForReport(null);
        }}
        user={selectedUserForReport}
        onSubmit={(reason) => {
          setShowReportModal(false);
          setSelectedUserForReport(null);
        }}
      />
      {/* <AIChatButton currentUser={currentUser} /> */}
    </div>
  );
};

export default ChatDashboard;
