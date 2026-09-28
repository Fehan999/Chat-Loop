import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiUsers, FiUserMinus, FiUser } from "react-icons/fi";
import { doc, updateDoc, arrayRemove } from "firebase/firestore";
import { db } from "../../../firebase/config";
import UserCard from "./UserCard";
import LoadingState from "./LoadingState";

const FriendsTab = ({
  currentUserId,
  friendsList = [],
  friendsData = [],
  onViewProfile,
  onRemoveFriend,
}) => {
  const [loading, setLoading] = useState(true);
  const [removingFriendId, setRemovingFriendId] = useState(null);

  useEffect(() => {
    setLoading(false);
  }, [friendsData]);

  const handleRemoveFriend = async (friendId) => {
    if (!window.confirm("Are you sure you want to remove this friend?")) return;

    setRemovingFriendId(friendId);
    try {
      // Remove from current user's friends
      await updateDoc(doc(db, "users", currentUserId), {
        friends: arrayRemove(friendId),
      });

      // Remove from friend's friends list
      await updateDoc(doc(db, "users", friendId), {
        friends: arrayRemove(currentUserId),
      });

      // Call parent callback
      if (onRemoveFriend) {
        await onRemoveFriend(friendId);
      }

      alert("Friend removed successfully");
    } catch (error) {
      console.error("Error removing friend:", error);
      alert("Failed to remove friend. Please try again.");
    } finally {
      setRemovingFriendId(null);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (friendsData.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-16"
      >
        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiUsers className="text-3xl text-indigo-400" />
        </div>
        <h3 className="text-gray-900 font-medium mb-2">No friends yet</h3>
        <p className="text-gray-400 text-sm max-w-xs mx-auto">
          Connect with people and grow your network!
        </p>
        <div className="mt-6 inline-flex items-center gap-2 text-xs text-indigo-400">
          <FiUser />
          <span>Go to Discover tab to find friends</span>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 mb-2">
        You have {friendsData.length} friend
        {friendsData.length !== 1 ? "s" : ""}
      </p>
      {friendsData.map((friend, index) => (
        <motion.div
          key={friend.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <UserCard
            user={friend}
            variant="friend"
            onViewProfile={() => onViewProfile(friend)}
            onRemoveFriend={() => handleRemoveFriend(friend.id)}
            isRemoving={removingFriendId === friend.id}
          />
        </motion.div>
      ))}
    </div>
  );
};

export default FriendsTab;
