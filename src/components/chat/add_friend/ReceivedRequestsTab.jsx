import React from "react";
import { motion } from "framer-motion";
import { FiInbox, FiUserPlus } from "react-icons/fi";
import UserCard from "./UserCard";
import LoadingState from "./LoadingState";

const ReceivedRequestsTab = ({
  requests,
  loading,
  onAccept,
  onDecline,
  onViewProfile,
}) => {
  if (loading) {
    return <LoadingState />;
  }

  if (requests.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-16"
      >
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiInbox className="text-3xl text-green-400" />
        </div>
        <h3 className="text-gray-900 font-medium mb-2">Inbox is empty</h3>
        <p className="text-gray-400 text-sm max-w-xs mx-auto">
          When someone sends you a friend request, you'll see it here
        </p>
        <div className="mt-6 inline-flex items-center gap-2 text-xs text-indigo-400">
          <FiUserPlus />
          <span>Connect with people in Discover tab</span>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 mb-2">
        You have {requests.length} pending request
        {requests.length !== 1 ? "s" : ""}
      </p>
      {requests.map((request, index) => (
        <motion.div
          key={request.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <UserCard
            user={request}
            variant="received"
            onViewProfile={() => onViewProfile(request)}
            onAccept={() => onAccept(request.userId)}
            onDecline={() => onDecline(request.userId)}
          />
        </motion.div>
      ))}
    </div>
  );
};

export default ReceivedRequestsTab;
