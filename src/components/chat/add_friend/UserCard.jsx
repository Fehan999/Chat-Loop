// UserCard.jsx - Fixed with better UI for received requests
import { AnimatePresence, motion } from "framer-motion";
import React, { useState } from "react";
import {
  FiCalendar,
  FiCheck,
  FiClock,
  FiMapPin,
  FiUser,
  FiUserMinus,
  FiUserPlus,
  FiX,
} from "react-icons/fi";

const UserCard = ({
  user,
  searchTerm,
  onViewProfile,
  onSendRequest,
  onAccept,
  onDecline,
  onCancel,
  onRemoveFriend,
  variant = "search",
  friendStatus = "none",
  isRemoving = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleAction = async (action) => {
    setActionLoading(true);
    await action();
    setActionLoading(false);
  };

  // Highlight matching text
  const highlightMatch = (text) => {
    if (!searchTerm || !text) return text;

    const searchLower = searchTerm.toLowerCase();
    const textLower = text.toLowerCase();

    if (!textLower.includes(searchLower)) return text;

    const index = textLower.indexOf(searchLower);
    const before = text.substring(0, index);
    const match = text.substring(index, index + searchTerm.length);
    const after = text.substring(index + searchTerm.length);

    return (
      <span>
        {before}
        <span className="bg-yellow-200 font-medium px-0.5 rounded">
          {match}
        </span>
        {after}
      </span>
    );
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getButtonVariant = () => {
    if (friendStatus === "request_sent") {
      return {
        text: "Request Sent",
        Icon: FiClock,
        disabled: true,
        className: "bg-gray-100 text-gray-500 cursor-not-allowed",
      };
    }
    return {
      text: "Add Friend",
      Icon: FiUserPlus,
      disabled: false,
      className:
        "bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-md",
    };
  };

  const buttonConfig = getButtonVariant();
  const ButtonIcon = buttonConfig.Icon;

  // Safe user data with fallbacks
  const userName = user?.name || "User";
  const userUsername = user?.username || `@user_${user?.uniqueId}`;
  const userUniqueId = user?.uniqueId || "----";
  const userAvatar =
    user?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      userName
    )}&background=6366f1&color=fff&size=128`;
  const userStatus = user?.status || "offline";
  const userLocation = user?.location || "";
  const userJoinedDate = user?.joinedDate || "";
  const userBio = user?.bio || "";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-2xl border-2 border-gray-100 hover:border-indigo-200 transition-all shadow-sm hover:shadow-md overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main Card Content */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar with status */}
          <div className="relative">
            <img
              src={userAvatar}
              alt={userName}
              className="w-16 h-16 rounded-2xl ring-2 ring-white shadow-sm"
            />
            {userStatus === "online" && (
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></span>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">
                  {highlightMatch(userName)}
                </h3>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  {highlightMatch(userUsername)}
                </p>
              </div>

              {/* Unique ID Badge */}
              <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-lg whitespace-nowrap">
                ID: {userUniqueId}
              </span>
            </div>

            {/* Match Info */}
            {searchTerm && (
              <div className="mt-2">
                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full">
                  Matched by{" "}
                  {userUniqueId === searchTerm
                    ? "ID"
                    : userName?.toLowerCase().includes(searchTerm.toLowerCase())
                    ? "name"
                    : userUsername
                        ?.toLowerCase()
                        .includes(searchTerm.toLowerCase())
                    ? "username"
                    : "email"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - Improved for received variant */}
        <div className="flex gap-2 mt-4">
          {variant === "received" ? (
            // Three equal buttons for received requests
            <div className="flex gap-2 w-full">
              <button
                onClick={() => onViewProfile()}
                className="flex-1 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl font-medium text-sm hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
              >
                <FiUser className="text-lg" />
                Profile
              </button>
              <button
                onClick={() => handleAction(onAccept)}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-green-500 text-white rounded-xl font-medium text-sm hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <FiCheck className="text-lg" />
                    Confirm
                  </>
                )}
              </button>
              <button
                onClick={() => handleAction(onDecline)}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <FiX className="text-lg" />
                    Decline
                  </>
                )}
              </button>
            </div>
          ) : (
            // Two buttons for other variants
            <>
              <button
                onClick={() => onViewProfile()}
                className="flex-1 py-2.5 bg-gray-50 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
              >
                <FiUser className="text-gray-500" />
                View Profile
              </button>

              {variant === "search" && (
                <button
                  onClick={() => handleAction(onSendRequest)}
                  disabled={actionLoading || buttonConfig.disabled}
                  className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${buttonConfig.className}`}
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ButtonIcon className="text-lg" />
                      {buttonConfig.text}
                    </>
                  )}
                </button>
              )}

              {variant === "friend" && (
                <button
                  onClick={() => handleAction(onRemoveFriend)}
                  disabled={actionLoading || isRemoving}
                  className="flex-1 py-2.5 bg-red-50 text-red-600 rounded-xl font-medium text-sm hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <FiUserMinus className="text-lg" />
                      Remove Friend
                    </>
                  )}
                </button>
              )}

              {variant === "sent" && (
                <button
                  onClick={() => handleAction(onCancel)}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-orange-50 text-orange-600 rounded-xl font-medium text-sm hover:bg-orange-100 transition-colors flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <FiX className="text-lg" />
                      Cancel Request
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>

        {/* Timestamp for requests */}
        {(variant === "sent" || variant === "received") && (
          <p className="text-xs text-gray-400 mt-3">
            {variant === "sent"
              ? `Sent ${formatDate(user?.sentAt)}`
              : `Received ${formatDate(user?.receivedAt)}`}
          </p>
        )}
      </div>

      {/* Expanded Profile Preview */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-100 bg-gray-50 p-4"
          >
            <div className="grid grid-cols-2 gap-3 text-sm">
              {userLocation && (
                <div className="flex items-center gap-2">
                  <FiMapPin className="text-gray-400" />
                  <span className="text-gray-600">{userLocation}</span>
                </div>
              )}
              {userJoinedDate && (
                <div className="flex items-center gap-2">
                  <FiCalendar className="text-gray-400" />
                  <span className="text-gray-600">Joined {userJoinedDate}</span>
                </div>
              )}
              {userBio && (
                <div className="col-span-2 mt-2 text-gray-600">
                  <p className="text-sm">{userBio}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default UserCard;
