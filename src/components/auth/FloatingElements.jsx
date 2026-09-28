import React from "react";
import { motion } from "framer-motion";

const FloatingElements = () => {
  return (
    <>
      <motion.div
        className="absolute w-64 h-64 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
        animate={{ x: [0, 100, 0], y: [0, -100, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        style={{ top: "10%", left: "5%" }}
      />
      <motion.div
        className="absolute w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
        animate={{ x: [0, -150, 0], y: [0, 150, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        style={{ bottom: "5%", right: "10%" }}
      />
      <motion.div
        className="absolute w-48 h-48 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
        animate={{ x: [0, 80, 0], y: [0, 80, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        style={{ top: "20%", right: "15%" }}
      />
    </>
  );
};

export default FloatingElements;
