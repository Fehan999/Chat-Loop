import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiMail, FiX, FiSend, FiCheckCircle } from "react-icons/fi";
import { sendPasswordResetEmail } from "firebase/auth"; // Only import once
import { auth } from "../../firebase/config";
import ReactDOM from "react-dom";

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      // Don't pass actionCodeSettings - let Firebase use the URL from console
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);

      setTimeout(() => {
        onClose();
        setEmail("");
        setSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("Password reset error:", error);
      switch (error.code) {
        case "auth/user-not-found":
          setError("No account found with this email address");
          break;
        case "auth/invalid-email":
          setError("Invalid email address format");
          break;
        case "auth/too-many-requests":
          setError("Too many requests. Please try again later");
          break;
        default:
          setError("Failed to send reset email. Please try again");
      }
    } finally {
      setLoading(false);
    }
  };

  // Create portal to render modal at root level
  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - fixed position */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]"
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
          />

          {/* Modal Container - centered */}
          <div className="fixed inset-0 flex items-center justify-center z-[10000] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-center p-6 border-b border-gray-100">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                  Reset Password
                </h3>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <FiX className="text-2xl" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {!success ? (
                  <form onSubmit={handleResetPassword}>
                    <p className="text-gray-600 mb-6">
                      Enter your email address and we'll send you a link to
                      reset your password.
                    </p>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 text-red-500 text-sm p-3 rounded-xl border border-red-200 mb-4"
                      >
                        {error}
                      </motion.div>
                    )}

                    <div className="relative mb-6">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                        <FiMail className="text-xl" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email address"
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-200 transition-all outline-none"
                        required
                        disabled={loading}
                        autoFocus
                      />
                    </div>

                    <motion.button
                      whileHover={{ scale: loading ? 1 : 1.02 }}
                      whileTap={{ scale: loading ? 1 : 0.98 }}
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          Send Reset Link
                          <FiSend className="text-lg" />
                        </>
                      )}
                    </motion.button>
                  </form>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-6"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.2 }}
                      className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
                    >
                      <FiCheckCircle className="text-4xl text-green-500" />
                    </motion.div>
                    <h4 className="text-xl font-semibold text-gray-800 mb-2">
                      Check Your Email
                    </h4>
                    <p className="text-gray-600 mb-2">
                      We've sent a password reset link to
                    </p>
                    <p className="font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded-lg inline-block">
                      {email}
                    </p>
                    <p className="text-xs text-gray-400 mt-4">
                      The modal will close automatically in 3 seconds...
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ForgotPasswordModal;
