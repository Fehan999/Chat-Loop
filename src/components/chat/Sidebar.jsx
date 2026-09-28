// components/chat/Sidebar.jsx
import { signOut } from "firebase/auth";
import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import { FiLogOut, FiSearch, FiSettings, FiUserPlus } from "react-icons/fi";
import { auth } from "../../firebase/config";
import { listenToUserStatus } from "../../firebase/firestoreService";
import { formatLastSeen, getExactTime } from "../../utils/statusHelper";

const Sidebar = ({
  chats,
  selectedChat,
  onSelectChat,
  onAddFriend,
  onOpenSettings,
  isMobileView,
  currentUser,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [onlineStatuses, setOnlineStatuses] = useState({});
  const [userLastSeen, setUserLastSeen] = useState({});

  // Listen to online status for all friends
  useEffect(() => {
    const unsubscribes = [];
    const uniqueUserIds = [
      ...new Set(chats.map((chat) => chat.userId).filter(Boolean)),
    ];

    uniqueUserIds.forEach((userId) => {
      const unsubscribe = listenToUserStatus(userId, (status, lastSeen) => {
        setOnlineStatuses((prev) => ({
          ...prev,
          [userId]: status || "offline",
        }));

        if (lastSeen) {
          const lastSeenDate = lastSeen?.toDate?.() || new Date(lastSeen);
          setUserLastSeen((prev) => ({
            ...prev,
            [userId]: lastSeenDate,
          }));
        }
      });
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [chats.map((chat) => chat.userId).join(",")]);

  const filteredChats = chats.filter(
    (chat) =>
      chat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chat.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="h-full bg-white flex flex-col shadow-lg">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            ChatLoop
          </h1>
          <div className="flex items-center gap-1">
            <button
              onClick={onAddFriend}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Add Friend"
            >
              <FiUserPlus className="text-xl text-gray-600" />
            </button>
            <button
              onClick={onOpenSettings}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Settings"
            >
              <FiSettings className="text-xl text-gray-600" />
            </button>
          </div>
        </div>

        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search messages or friends..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
          />
        </div>
      </div>

      {/* Chats List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <FiSearch className="text-4xl text-gray-300 mb-3" />
            <p className="text-gray-500">No conversations yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Add friends to start chatting
            </p>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const currentStatus =
              onlineStatuses[chat.userId] || chat.status || "offline";
            const lastSeenTime = userLastSeen[chat.userId];
            const isOnline = currentStatus === "online";

            return (
              <motion.div
                key={chat.id}
                whileHover={{ backgroundColor: "#f9fafb" }}
                onClick={() => onSelectChat(chat)}
                className={`px-4 py-3 cursor-pointer transition-colors relative hover:bg-gray-50 ${
                  selectedChat?.id === chat.id
                    ? "bg-indigo-50 border-l-4 border-indigo-500"
                    : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar with Status */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={chat.avatar}
                      alt={chat.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"
                      }`}
                    ></span>
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {chat.name}
                      </h4>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {chat.lastSeen}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-1 truncate">
                      {chat.username}
                    </p>
                    <p className="text-sm text-gray-600 truncate">
                      {chat.lastMessage}
                    </p>

                    {/* Last seen for offline users */}
                    {!isOnline && lastSeenTime && (
                      <div className="mt-1 group relative inline-block">
                        <p className="text-xs text-gray-400 cursor-help">
                          Last seen {formatLastSeen(lastSeenTime)}
                        </p>
                        <div className="absolute bottom-full left-0 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          {getExactTime(lastSeenTime)}
                        </div>
                      </div>
                    )}

                    {/* Online status text */}
                    {isOnline && (
                      <p className="text-xs text-green-500 mt-1">Active now</p>
                    )}
                  </div>

                  {/* Unread Count Badge */}
                  {chat.unreadCount > 0 && (
                    <div className="flex-shrink-0 ml-2">
                      <div className="min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5 shadow-sm">
                        {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-200 bg-white sticky bottom-0">
        <button
          onClick={handleLogout}
          className="w-full py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <FiLogOut />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
