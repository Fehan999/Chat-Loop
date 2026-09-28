// // components/chat/AIChatButton.jsx
// import React, { useState, useEffect } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import { FaRobot, FaComments } from "react-icons/fa";
// // import AiChatAssistant from "./AIChatAssistant"

// const AIChatButton = ({ currentUser }) => {
//   const [isOpen, setIsOpen] = useState(false);
//   const [hasUnread, setHasUnread] = useState(false);

//   useEffect(() => {
//     // Check for unread AI messages periodically
//     const interval = setInterval(() => {
//       // You can implement logic to check for unread AI messages
//       // For now, we'll just simulate
//     }, 30000);

//     return () => clearInterval(interval);
//   }, []);

//   return (
//     <>
//       {/* Floating Button */}
//       <motion.button
//         whileHover={{ scale: 1.1 }}
//         whileTap={{ scale: 0.9 }}
//         onClick={() => setIsOpen(!isOpen)}
//         className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full shadow-lg flex items-center justify-center text-white hover:shadow-xl transition-shadow"
//       >
//         <AnimatePresence>
//           {hasUnread && !isOpen && (
//             <motion.div
//               initial={{ scale: 0 }}
//               animate={{ scale: 1 }}
//               exit={{ scale: 0 }}
//               className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
//             >
//               <span className="text-xs font-bold">1</span>
//             </motion.div>
//           )}
//         </AnimatePresence>
//         {isOpen ? <FaComments size={24} /> : <FaRobot size={24} />}
//       </motion.button>

//       {/* AI Chat Assistant */}
//       {/* <AIChatAssistant
//         currentUser={currentUser}
//         isOpen={isOpen}
//         onClose={() => setIsOpen(false)}
//       /> */}
//     </>
//   );
// };

// export default AIChatButton;
