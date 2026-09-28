import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import SocialAuth from "./SocialAuth";
import TabSwitcher from "./TabSwitcher";

const AuthCard = () => {
  const [isLogin, setIsLogin] = useState(true);
  // social buttons get hidden once someone is halfway through the register steps
  const [showSocial, setShowSocial] = useState(true);

  const switchTab = (login) => {
    setIsLogin(login);
    setShowSocial(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="card p-6 sm:p-8"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {isLogin ? "Welcome back" : "Create your account"}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {isLogin ? "Sign in to pick up where you left off." : "It only takes a minute."}
        </p>
      </div>

      <TabSwitcher isLogin={isLogin} setIsLogin={switchTab} />

      <AnimatePresence mode="wait">
        <motion.div
          key={isLogin ? "login" : "register"}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }}
          transition={{ duration: 0.2 }}
        >
          {isLogin ? <LoginForm /> : <RegisterForm onStart={() => setShowSocial(false)} />}
        </motion.div>
      </AnimatePresence>

      {(isLogin || showSocial) && (
        <>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-gray-400">or continue with</span>
            </div>
          </div>
          <SocialAuth />
        </>
      )}

      <p className="mt-6 text-center text-xs text-gray-400">
        By continuing you agree to our Terms of Service.
      </p>
    </motion.div>
  );
};

export default AuthCard;
