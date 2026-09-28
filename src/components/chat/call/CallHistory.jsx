// src/components/call/CallHistory.jsx
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FiPhone, FiVideo, FiPhoneMissed, FiCheck, FiX } from "react-icons/fi";
import { db } from "../../firebase/config";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";

const CallHistory = ({ userId, onStartCall }) => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCallHistory = async () => {
      try {
        const callsRef = collection(db, "calls");
        const q = query(
          callsRef,
          where("callerId", "==", userId),
          orderBy("startedAt", "desc")
        );

        const snapshot = await getDocs(q);
        const callsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setCalls(callsData);
      } catch (error) {
        console.error("Error loading call history:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCallHistory();
  }, [userId]);

  const getCallIcon = (call) => {
    if (call.status === "missed" || call.status === "rejected") {
      return <FiPhoneMissed className="text-red-500" />;
    }
    return call.isVideo ? <FiVideo /> : <FiPhone />;
  };

  const getCallStatus = (call) => {
    switch (call.status) {
      case "active":
        return <FiCheck className="text-green-500" />;
      case "ended":
        return <FiX className="text-gray-500" />;
      case "missed":
      case "rejected":
        return <FiPhoneMissed className="text-red-500" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {calls.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>No call history yet</p>
        </div>
      ) : (
        calls.map((call, index) => (
          <motion.div
            key={call.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                {getCallIcon(call)}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {call.callerId === userId ? "Outgoing" : "Incoming"}{" "}
                  {call.isVideo ? "Video" : "Audio"} Call
                </p>
                <p className="text-xs text-gray-500">
                  {call.startedAt?.toDate()
                    ? formatDistanceToNow(call.startedAt.toDate(), {
                        addSuffix: true,
                      })
                    : "Just now"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {call.duration
                  ? `${Math.floor(call.duration / 60)}:${(call.duration % 60)
                      .toString()
                      .padStart(2, "0")}`
                  : ""}
              </span>
              {getCallStatus(call)}
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
};

export default CallHistory;
