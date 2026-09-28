import { useState } from "react";
import { FiLogOut, FiSearch, FiSettings, FiShield, FiUserPlus, FiX } from "react-icons/fi";
import { Link } from "react-router-dom";
import { AI_CHAT_KEY, AI_NAME } from "../../constants";
import { isOwnerAccount } from "../../firebase/adminService";
import { auth } from "../../firebase/config";
import { logout } from "../../service/userStatus";
import { formatChatListTime } from "../../utils/dateUtils";
import { getStatusDotClass } from "../../utils/statusHelper";
import Logo from "../brand/Logo";
import AIAvatar from "./ai/AIAvatar";

const Badge = ({ count }) =>
  count > 0 ? (
    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-indigo-500 px-1.5 text-[11px] font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  ) : null;

const ChatRow = ({ chat, active, onSelect }) => {
  const preview = chat.suspended
    ? "Account suspended"
    : chat.lastMessage
      ? `${chat.lastMessageMine ? "You: " : ""}${chat.lastMessage}`
      : chat.isFriend
        ? "Say hi 👋"
        : "No messages yet";
  const unread = chat.unreadCount > 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(chat.key)}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
        active ? "bg-indigo-50" : "hover:bg-gray-50"
      }`}
    >
      <div className="relative flex-shrink-0">
        <img src={chat.avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
        <span
          className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white ${getStatusDotClass(
            chat.status
          )}`}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={`truncate text-sm ${unread ? "font-bold" : "font-semibold"} text-gray-900`}>
            {chat.name}
          </p>
          <span
            className={`flex-shrink-0 text-[11px] ${unread ? "font-semibold text-indigo-500" : "text-gray-400"}`}
          >
            {formatChatListTime(chat.lastMessageTime)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p
            className={`truncate text-sm ${
              chat.suspended
                ? "text-red-500"
                : unread
                  ? "font-medium text-gray-800"
                  : "text-gray-500"
            }`}
          >
            {preview}
          </p>
          <Badge count={chat.unreadCount} />
        </div>
      </div>
    </button>
  );
};

const Sidebar = ({
  chats,
  selectedKey,
  onSelectChat,
  onOpenFriends,
  onOpenSettings,
  requestCount,
  me,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const term = searchTerm.trim().toLowerCase();

  const filteredChats = term
    ? chats.filter(
        (chat) =>
          chat.name.toLowerCase().includes(term) ||
          chat.username.toLowerCase().includes(term) ||
          chat.lastMessage.toLowerCase().includes(term)
      )
    : chats;
  const showAI = !term || AI_NAME.toLowerCase().includes(term);

  return (
    <div className="flex h-full flex-col bg-white">
      <header className="px-4 pb-3 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <Logo size={34} withText />
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenFriends}
              className="icon-btn relative"
              title="Friends & requests"
            >
              <FiUserPlus className="text-xl" />
              {requestCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {requestCount}
                </span>
              )}
            </button>
            <button onClick={onOpenSettings} className="icon-btn" title="Settings">
              <FiSettings className="text-xl" />
            </button>
          </div>
        </div>

        <div className="relative">
          <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search chats"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field py-2.5 pl-10 pr-9"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <FiX />
            </button>
          )}
        </div>
      </header>

      <nav className="thin-scroll flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {showAI && (
          <button
            type="button"
            onClick={() => onSelectChat(AI_CHAT_KEY)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
              selectedKey === AI_CHAT_KEY ? "bg-indigo-50" : "hover:bg-gray-50"
            }`}
          >
            <AIAvatar size={48} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">{AI_NAME}</p>
              <p className="truncate text-sm text-gray-500">Ask me anything</p>
            </div>
          </button>
        )}

        {filteredChats.map((chat) => (
          <ChatRow
            key={chat.key}
            chat={chat}
            active={selectedKey === chat.key}
            onSelect={onSelectChat}
          />
        ))}

        {filteredChats.length === 0 && (
          <div className="px-6 py-12 text-center">
            {term ? (
              <p className="text-sm text-gray-500">No chats match &quot;{searchTerm}&quot;</p>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700">No conversations yet</p>
                <p className="mt-1 text-xs text-gray-400">Add a friend to start chatting.</p>
                <button onClick={onOpenFriends} className="btn-primary mt-4 px-4 py-2">
                  <FiUserPlus /> Find friends
                </button>
              </>
            )}
          </div>
        )}
      </nav>

      <footer className="flex items-center gap-3 border-t border-gray-100 px-4 py-3">
        <button
          onClick={onOpenSettings}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <img src={me.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">{me.name}</p>
            <p className="truncate text-xs text-gray-400">{me.username}</p>
          </div>
        </button>
        {isOwnerAccount(auth.currentUser) && (
          <Link to="/admin" className="icon-btn" title="Admin panel">
            <FiShield />
          </Link>
        )}
        <button onClick={logout} className="icon-btn hover:text-red-500" title="Log out">
          <FiLogOut />
        </button>
      </footer>
    </div>
  );
};

export default Sidebar;
