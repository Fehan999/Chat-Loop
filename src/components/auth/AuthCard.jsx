import { AnimatePresence, motion } from "framer-motion";
import React, { useState } from "react";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import SocialAuth from "./SocialAuth";
import TabSwitcher from "./TabSwitcher";

const AuthCard = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showSocial, setShowSocial] = useState(true);

  const handleRegisterStart = () => {
    setShowSocial(false);
  };

  const handleBackToLogin = () => {
    setShowSocial(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
      className="relative bg-white/90 backdrop-blur-sm rounded-[40px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] p-8 w-full max-w-md border border-white/20"
    >
      {/* Inner glow effect */}
      <div className="absolute inset-0 rounded-[40px] bg-gradient-to-br from-amber-50/50 to-blue-50/50 pointer-events-none" />

      <div className="relative">
        {/* Logo/Brand */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-amber-400 to-orange-400 rounded-2xl rotate-45 flex items-center justify-center shadow-lg"
        >
          <div className="transform -rotate-45 text-white text-2xl font-bold">
            ★
          </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-light text-center text-gray-800 mb-2"
        >
          <span className="font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
            {isLogin ? "Welcome back" : "Join us"}
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-gray-500 mb-8"
        >
          {isLogin ? "Nice to see you again" : "Create your account"}
        </motion.p>

        <TabSwitcher
          isLogin={isLogin}
          setIsLogin={(val) => {
            setIsLogin(val);
            if (val) handleBackToLogin();
          }}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={isLogin ? "login" : "register"}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            {isLogin ? (
              <LoginForm />
            ) : (
              <RegisterForm onStart={handleRegisterStart} />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Social Login - Only show on login or when registration hasn't started */}
        <AnimatePresence>
          {(isLogin || showSocial) && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-400">
                    or continue with
                  </span>
                </div>
              </div>
              <SocialAuth />
            </>
          )}
        </AnimatePresence>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-xs text-gray-400 mt-6"
        >
          By continuing, you agree to our Terms of Service
        </motion.p>
      </div>
    </motion.div>
  );
};

export default AuthCard;
