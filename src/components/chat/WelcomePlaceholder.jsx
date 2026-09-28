import React from "react";
import { motion } from "framer-motion";
import {
  FiMessageCircle,
  FiUsers,
  FiCpu,
  FiShield,
  FiStar,
  FiHeart,
} from "react-icons/fi";
import { FaRobot } from "react-icons/fa";

const WelcomePlaceholder = () => {
  const features = [
    {
      icon: <FiMessageCircle className="text-2xl" />,
      title: "Real-time Chat",
      description: "Instant messaging with your friends and AI assistant",
    },
    {
      icon: <FiUsers className="text-2xl" />,
      title: "Connect with Friends",
      description: "Add friends using their username or email",
    },
    {
      icon: <FaRobot className="text-2xl" />,
      title: "AI Assistant",
      description: "Get help, answers, or just chat with our AI",
    },
    {
      icon: <FiShield className="text-2xl" />,
      title: "Safe & Secure",
      description: "Report inappropriate behavior to keep community safe",
    },
  ];

  const tips = [
    "Click on any chat to start messaging",
    "Add new friends using the + button",
    "Try chatting with AI Assistant",
    "Customize your profile in Settings",
  ];

  return (
    <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-white overflow-y-auto">
      <div className="max-w-3xl w-full px-8 py-12">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-block p-4 bg-indigo-100 rounded-full mb-4">
            <FiMessageCircle className="text-4xl text-indigo-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Welcome to Chat Loop
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Connect with friends, chat with AI, and enjoy seamless conversations
          </p>
        </motion.div>
        {/* Decorative Elements */}
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-r from-indigo-100/30 to-purple-100/30 rounded-full blur-3xl -z-10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-l from-blue-100/30 to-indigo-100/30 rounded-full blur-3xl -z-10"></div>
      </div>
    </div>
  );
};

export default WelcomePlaceholder;
