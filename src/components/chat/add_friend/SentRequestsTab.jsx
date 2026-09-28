import React from "react";
import { motion } from "framer-motion";
import { FiSend, FiClock } from "react-icons/fi";
import UserCard from "./UserCard";
import LoadingState from "./LoadingState";

const SentRequestsTab = ({
  requests,
  loading,
  onCancelRequest,
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
        <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiSend className="text-3xl text-orange-400" />
        </div>
        <h3 className="text-gray-900 font-medium mb-2">No sent requests</h3>
        <p className="text-gray-400 text-sm max-w-xs mx-auto">
          When you send friend requests, they'll appear here
        </p>
        <div className="mt-6 inline-flex items-center gap-2 text-xs text-gray-400">
          <FiClock />
          <span>Pending requests will show status</span>
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
            variant="sent"
            onViewProfile={() => onViewProfile(request)}
            onCancel={() => onCancelRequest(request.userId)}
          />
        </motion.div>
      ))}
    </div>
  );
};

export default SentRequestsTab;
