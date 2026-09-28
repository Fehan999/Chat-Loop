import React from "react";
import { motion } from "framer-motion";
import { FiUserX, FiSearch, FiAlertCircle, FiSmile } from "react-icons/fi";

const EmptyState = ({ searchTerm }) => {
  const isNumber = /^\d+$/.test(searchTerm);
  const isFourDigits = /^\d{4}$/.test(searchTerm);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-12"
    >
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <FiUserX className="text-3xl text-gray-400" />
      </div>

      <h3 className="text-gray-900 font-medium text-lg mb-2">No users found</h3>

      <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">
        No matches for "{searchTerm}"
      </p>

      {/* Suggestions Card */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 text-left max-w-sm mx-auto border border-indigo-100">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
            <FiSearch className="text-indigo-500" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-indigo-900 mb-2">
              Search tips:
            </h4>
            <ul className="space-y-2">
              {isNumber ? (
                isFourDigits ? (
                  <li className="text-sm text-indigo-700 flex items-center gap-2">
                    <span className="w-1 h-1 bg-indigo-300 rounded-full" />
                    No user found with ID <strong>{searchTerm}</strong>
                  </li>
                ) : (
                  <li className="text-sm text-indigo-700 flex items-center gap-2">
                    <span className="w-1 h-1 bg-indigo-300 rounded-full" />
                    Enter exactly 4 digits for ID search (e.g., 1234)
                  </li>
                )
              ) : (
                <>
                  <li className="text-sm text-indigo-700 flex items-center gap-2">
                    <span className="w-1 h-1 bg-indigo-300 rounded-full" />
                    Check for typos or spelling errors
                  </li>
                  <li className="text-sm text-indigo-700 flex items-center gap-2">
                    <span className="w-1 h-1 bg-indigo-300 rounded-full" />
                    Try searching by username (e.g., @john)
                  </li>
                  <li className="text-sm text-indigo-700 flex items-center gap-2">
                    <span className="w-1 h-1 bg-indigo-300 rounded-full" />
                    Try searching by 4-digit ID
                  </li>
                </>
              )}
              <li className="text-sm text-indigo-700 flex items-center gap-2">
                <span className="w-1 h-1 bg-indigo-300 rounded-full" />
                The user might not be registered yet
              </li>
            </ul>
          </div>
        </div>

        {/* Encouragement */}
        <div className="mt-4 pt-4 border-t border-indigo-200 flex items-center gap-2 text-indigo-600">
          <FiSmile />
          <span className="text-xs">
            Don't worry, you can invite them to join!
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default EmptyState;
