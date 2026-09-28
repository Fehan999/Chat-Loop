import React from "react";
import { motion } from "framer-motion";

const TabSwitcher = ({ isLogin, setIsLogin }) => {
  return (
    <div className="flex bg-gray-100 rounded-2xl p-1 mb-8 relative">
      <motion.div
        className="absolute bg-white rounded-xl shadow-md"
        layoutId="tab-indicator"
        style={{
          width: "50%",
          height: "calc(100% - 8px)",
          top: 4,
          left: isLogin ? 4 : "calc(50% - 4px)",
        }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
      <button
        onClick={() => setIsLogin(true)}
        className={`flex-1 py-3 text-sm font-medium relative z-10 transition-all ${
          isLogin ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <motion.span
          animate={{ scale: isLogin ? 1 : 0.95 }}
          transition={{ type: "spring" }}
        >
          Login
        </motion.span>
      </button>
      <button
        onClick={() => setIsLogin(false)}
        className={`flex-1 py-3 text-sm font-medium relative z-10 transition-all ${
          !isLogin ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <motion.span
          animate={{ scale: !isLogin ? 1 : 0.95 }}
          transition={{ type: "spring" }}
        >
          Register
        </motion.span>
      </button>
    </div>
  );
};

export default TabSwitcher;
