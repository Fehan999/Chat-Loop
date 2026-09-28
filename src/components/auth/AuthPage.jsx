import React from "react";
import { motion } from "framer-motion";
import AuthCard from "./AuthCard";

const AuthPage = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row items-center justify-center p-4 relative overflow-hidden">
      {/* Left Side - Welcome Section */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="md:flex-1 flex flex-col items-center md:items-start justify-center text-center md:text-left mb-8 md:mb-0 px-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-400 rounded-2xl rotate-45 flex items-center justify-center shadow-lg mb-6"
        >
          <div className="transform -rotate-45 text-white text-3xl font-bold">
            ★
          </div>
        </motion.div>

        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
          Welcome to{" "}
          <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
            Our Platform
          </span>
        </h1>

        <p className="text-gray-500 text-lg mb-8 max-w-md">
          Join our community and connect with amazing people around the world.
        </p>
      </motion.div>

      {/* Right Side - Auth Card */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="md:flex-1 flex justify-center w-full"
      >
        <AuthCard />
      </motion.div>

      {/* Credit - Fixed position at bottom right */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="fixed bottom-6 right-6 z-10"
      >
        <p className="text-gray-400 text-sm bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
          Designed & Developed by{" "}
          <a
            href="https://www.ehansiddique.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent font-semibold hover:opacity-80 transition-opacity"
          >
            Ehan Siddique
          </a>
        </p>
      </motion.div>
    </div>
  );
};

export default AuthPage;
