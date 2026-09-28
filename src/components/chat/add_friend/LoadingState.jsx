import React from "react";
import { motion } from "framer-motion";

const LoadingState = () => {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="p-3 bg-gray-50 rounded-xl border border-gray-200"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
            <div className="flex-1">
              <div className="w-24 h-4 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="w-32 h-3 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default LoadingState;
