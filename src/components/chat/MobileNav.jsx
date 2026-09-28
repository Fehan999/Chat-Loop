import React from "react";
import { FiMessageCircle, FiSettings, FiUserPlus } from "react-icons/fi";

const MobileNav = ({ onOpenSettings, onAddFriend }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-around items-center">
      <button className="p-2 text-indigo-600">
        <FiMessageCircle className="text-2xl" />
      </button>
      <button
        onClick={onAddFriend}
        className="p-2 text-gray-600 hover:text-indigo-600 transition-colors"
      >
        <FiUserPlus className="text-2xl" />
      </button>
      <button
        onClick={onOpenSettings}
        className="p-2 text-gray-600 hover:text-indigo-600 transition-colors"
      >
        <FiSettings className="text-2xl" />
      </button>
    </div>
  );
};

export default MobileNav;
