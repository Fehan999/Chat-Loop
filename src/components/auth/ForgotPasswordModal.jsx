import { sendPasswordResetEmail } from "firebase/auth";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiCheckCircle, FiMail, FiSend, FiX } from "react-icons/fi";
import { auth } from "../../firebase/config";
import { authErrorMessage } from "./authErrors";
import FormField from "./FormField";

// rendered in a portal so the auth card animation doesn't clip it
const ForgotPasswordModal = ({ isOpen, onClose, initialEmail = "" }) => {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail);
      setError("");
      setSent(false);
    }
  }, [isOpen, initialEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (err) {
      setError(authErrorMessage(err, "Couldn't send the reset email. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Reset your password</h3>
              <button onClick={onClose} className="icon-btn" aria-label="Close">
                <FiX />
              </button>
            </div>

            {sent ? (
              <div className="py-4 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                  <FiCheckCircle className="text-2xl text-emerald-500" />
                </div>
                <p className="font-medium text-gray-900">Check your inbox</p>
                <p className="mt-1 text-sm text-gray-500">
                  If an account exists for{" "}
                  <span className="font-medium text-gray-700">{email}</span>, a reset link is on its
                  way.
                </p>
                <button onClick={onClose} className="btn-secondary mt-6 w-full">
                  Back to login
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-gray-500">
                  Enter the email you signed up with and we&apos;ll send you a link to set a new
                  password.
                </p>
                {error && (
                  <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
                    {error}
                  </div>
                )}
                <FormField
                  icon={FiMail}
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? (
                    "Sending..."
                  ) : (
                    <>
                      Send reset link <FiSend />
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ForgotPasswordModal;
