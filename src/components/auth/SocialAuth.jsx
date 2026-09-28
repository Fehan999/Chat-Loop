import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import {
  auth,
  db,
  googleProvider,
  githubProvider,
} from "../../firebase/config";
import { generateUniqueIdWithTimestamp } from "../../utils/generateUserId";

const SocialAuth = () => {
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState("");

  const handleSocialLogin = async (provider, providerName) => {
    setLoading(providerName);
    setError("");

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists()) {
        const uniqueId = generateUniqueIdWithTimestamp();

        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name: user.displayName || providerName,
          email: user.email,
          uniqueId: uniqueId,
          username: `@${
            user.displayName?.toLowerCase().replace(/\s+/g, "") || providerName
          }_${uniqueId}`,
          avatar:
            user.photoURL ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              user.displayName || providerName
            )}&background=amber&color=fff&size=128&bold=true`,
          bio: "",
          phone: "",
          location: "",
          joinedDate: new Date().toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          }),
          status: "online",
          createdAt: new Date().toISOString(),
          friends: [],
          settings: {
            notifications: true,
            darkMode: false,
            privacy: "public",
          },
        });
      }
    } catch (error) {
      console.error("Social login error:", error);
      setError(`Failed to login with ${providerName}`);
    } finally {
      setLoading(null);
    }
  };

  const socialButtons = [
    {
      provider: googleProvider,
      name: "Google",
      icon: FcGoogle,
      color: "hover:bg-red-50",
    },
    {
      provider: githubProvider,
      name: "GitHub",
      icon: FaGithub,
      color: "hover:bg-gray-100",
    },
  ];

  return (
    <>
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 text-red-500 text-sm p-3 rounded-xl border border-red-200 mb-3"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-3">
        {socialButtons.map((btn) => (
          <motion.button
            key={btn.name}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSocialLogin(btn.provider, btn.name)}
            disabled={loading}
            className={`flex-1 flex items-center justify-center gap-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 ${btn.color} hover:border-gray-300 transition-all group disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading === btn.name ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-amber-500 rounded-full animate-spin" />
            ) : (
              <>
                <btn.icon className="text-xl group-hover:rotate-12 transition-transform" />
                <span className="text-sm font-medium">{btn.name}</span>
              </>
            )}
          </motion.button>
        ))}
      </div>
    </>
  );
};

export default SocialAuth;
