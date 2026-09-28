// ProfilePage.jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FiArrowLeft,
  FiUserPlus,
  FiCheck,
  FiClock,
  FiCalendar,
  FiMapPin,
  FiMessageCircle,
  FiUsers,
  FiLock,
  FiFlag,
  FiShare2,
  FiMoreHorizontal,
  FiHeart,
} from "react-icons/fi";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../../../firebase/config";

const ProfilePage = ({
  userId,
  currentUserId,
  onBack,
  onSendRequest,
  onAcceptRequest,
  friends = [],
  sentRequests = [],
}) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [isRequestSent, setIsRequestSent] = useState(false);
  const [isRequestReceived, setIsRequestReceived] = useState(false);
  const [mutualFriends, setMutualFriends] = useState([]);
  const [showActionLoading, setShowActionLoading] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser({
            id: userId,
            ...userData,
          });

          // Check friendship status
          setIsFriend(friends.includes(userId));
          setIsRequestSent(sentRequests.some((req) => req.userId === userId));

          // Check if received request
          const receivedRequestsQuery = await getDoc(
            doc(db, "friendRequests", `${userId}_${currentUserId}`)
          );
          setIsRequestReceived(
            receivedRequestsQuery.exists() &&
              receivedRequestsQuery.data().status === "pending"
          );

          // Calculate mutual friends
          const currentUserDoc = await getDoc(doc(db, "users", currentUserId));
          const currentUserFriends = currentUserDoc.data()?.friends || [];
          const targetUserFriends = userData.friends || [];
          const mutual = currentUserFriends.filter((friendId) =>
            targetUserFriends.includes(friendId)
          );

          // Fetch mutual friends details
          const mutualDetails = [];
          for (const friendId of mutual.slice(0, 5)) {
            const friendDoc = await getDoc(doc(db, "users", friendId));
            if (friendDoc.exists()) {
              mutualDetails.push({
                id: friendId,
                name: friendDoc.data().name,
                avatar: friendDoc.data().avatar,
              });
            }
          }
          setMutualFriends(mutualDetails);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserData();
    }
  }, [userId, currentUserId, friends, sentRequests]);

  const handleFriendAction = async () => {
    setShowActionLoading(true);
    try {
      if (isRequestReceived) {
        await onAcceptRequest(userId);
      } else if (!isFriend && !isRequestSent) {
        await onSendRequest(userId);
      }
    } catch (error) {
      console.error("Error with friend action:", error);
    } finally {
      setShowActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Recently";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">User not found</p>
          <button onClick={onBack} className="mt-4 text-indigo-500">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const getActionButton = () => {
    if (isFriend) {
      return {
        text: "Friends",
        icon: FiCheck,
        className: "bg-green-50 text-green-600 border-green-200",
        disabled: true,
      };
    }
    if (isRequestSent) {
      return {
        text: "Request Sent",
        icon: FiClock,
        className: "bg-yellow-50 text-yellow-600 border-yellow-200",
        disabled: true,
      };
    }
    if (isRequestReceived) {
      return {
        text: "Accept Request",
        icon: FiUserPlus,
        className: "bg-indigo-500 text-white hover:bg-indigo-600",
        disabled: false,
      };
    }
    return {
      text: "Add Friend",
      icon: FiUserPlus,
      className: "bg-indigo-500 text-white hover:bg-indigo-600",
      disabled: false,
    };
  };

  const actionButton = getActionButton();
  const ActionIcon = actionButton.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="px-4 py-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FiArrowLeft className="text-xl text-gray-600" />
          </button>
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Avatar Section - No Cover Photo */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <img
              src={
                user.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  user.name
                )}&background=6366f1&color=fff&size=200`
              }
              alt={user.name}
              className="w-32 h-32 rounded-2xl ring-4 ring-white shadow-xl object-cover"
            />
            {user.status === "online" && (
              <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full ring-2 ring-white"></span>
            )}
          </div>
        </div>

        {/* User Info */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">{user.name}</h1>
          <p className="text-gray-500 mb-2">{user.username}</p>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full">
            <span className="text-xs text-indigo-600 font-medium">
              ID: {user.uniqueId}
            </span>
          </div>
        </div>

        {/* Stats - Only Friends and Mutual Friends */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="text-center p-3 bg-white rounded-xl shadow-sm">
            <div className="text-2xl font-bold text-gray-900">
              {user.friends?.length || 0}
            </div>
            <div className="text-xs text-gray-500">Friends</div>
          </div>
          <div className="text-center p-3 bg-white rounded-xl shadow-sm">
            <div className="text-2xl font-bold text-gray-900">
              {mutualFriends.length}
            </div>
            <div className="text-xs text-gray-500">Mutual Friends</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={handleFriendAction}
            disabled={actionButton.disabled || showActionLoading}
            className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              actionButton.className
            } ${
              actionButton.disabled
                ? "opacity-50 cursor-not-allowed"
                : "hover:shadow-lg"
            }`}
          >
            {showActionLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ActionIcon className="text-lg" />
                {actionButton.text}
              </>
            )}
          </button>

          {isFriend && (
            <button
              onClick={() => {}}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <FiMessageCircle className="text-lg" />
              Message
            </button>
          )}

          {!isFriend && (
            <button
              onClick={() =>
                alert("Send a friend request first to message this person")
              }
              className="flex-1 py-3 bg-gray-100 text-gray-400 rounded-xl font-medium cursor-not-allowed flex items-center justify-center gap-2"
            >
              <FiLock className="text-lg" />
              Message (Locked)
            </button>
          )}
        </div>

        {/* Bio Section */}
        {user.bio && (
          <div className="mb-8 p-5 bg-white rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">About</h3>
            <p className="text-gray-600 leading-relaxed">{user.bio}</p>
          </div>
        )}

        {/* Details Grid - Removed Email Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center">
              <FiCalendar className="text-indigo-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Joined</p>
              <p className="text-sm text-gray-700">
                {formatDate(user.createdAt)}
              </p>
            </div>
          </div>

          {user.location && (
            <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center">
                <FiMapPin className="text-indigo-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Location</p>
                <p className="text-sm text-gray-700">{user.location}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center">
              <FiUsers className="text-indigo-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Privacy</p>
              <p className="text-sm text-gray-700 capitalize">
                {user.settings?.privacy || "Public"}
              </p>
            </div>
          </div>

          {/* Optional: Add a placeholder if needed to maintain grid balance */}
          {!user.location && (
            <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100 opacity-50">
              <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
                <FiUsers className="text-gray-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Status</p>
                <p className="text-sm text-gray-500">Active</p>
              </div>
            </div>
          )}
        </div>

        {/* Mutual Friends Section */}
        {mutualFriends.length > 0 && (
          <div className="mb-8 p-5 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Mutual Friends ({mutualFriends.length})
              </h3>
              {mutualFriends.length > 5 && (
                <button className="text-xs text-indigo-500 hover:text-indigo-600">
                  View All
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {mutualFriends.map((friend) => (
                <div key={friend.id} className="flex items-center gap-2">
                  <img
                    src={
                      friend.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        friend.name
                      )}&background=6366f1&color=fff&size=40`
                    }
                    alt={friend.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <span className="text-sm text-gray-600">{friend.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
