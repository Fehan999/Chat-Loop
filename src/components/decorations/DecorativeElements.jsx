import React from "react";
import { motion } from "framer-motion";

const DecorativeElements = () => {
  return (
    <>
      {/* Animated circles */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-r from-amber-200/30 to-orange-200/30 blur-3xl"
        animate={{
          x: [0, 100, 0],
          y: [0, -100, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        style={{ top: "-10%", left: "-5%" }}
      />

      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full bg-gradient-to-r from-blue-200/30 to-indigo-200/30 blur-3xl"
        animate={{
          x: [0, -80, 0],
          y: [0, 80, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        style={{ bottom: "-5%", right: "-2%" }}
      />

      {/* Geometric shapes */}
      <motion.div
        className="absolute w-32 h-32 border-4 border-amber-200/50 rounded-3xl rotate-45"
        animate={{ rotate: [45, 90, 45], scale: [1, 1.1, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        style={{ top: "15%", right: "10%" }}
      />

      <motion.div
        className="absolute w-40 h-40 border-4 border-blue-200/50 rounded-full"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        style={{ bottom: "20%", left: "8%" }}
      />

      {/* Dots pattern */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #e2e8f0 1px, transparent 0)",
          backgroundSize: "40px 40px",
          opacity: 0.5,
        }}
      />
    </>
  );
};

export default DecorativeElements;
