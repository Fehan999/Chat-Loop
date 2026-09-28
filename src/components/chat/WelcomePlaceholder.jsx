import { motion } from "framer-motion";
import { FiUserPlus } from "react-icons/fi";
import { HiSparkles } from "react-icons/hi2";
import Logo from "../brand/Logo";

const WelcomePlaceholder = ({ name, onFindFriends, onOpenAI }) => (
  <div className="flex h-full flex-1 items-center justify-center bg-gray-50 p-8">
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md text-center"
    >
      <div className="mb-6 flex justify-center">
        <Logo size={72} />
      </div>
      <h1 className="text-2xl font-bold text-gray-900">
        Hey {name?.split(" ")[0] || "there"}, welcome back
      </h1>
      <p className="mt-2 text-gray-500">Pick a conversation on the left, or start something new.</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <button onClick={onFindFriends} className="btn-primary">
          <FiUserPlus /> Find friends
        </button>
        <button onClick={onOpenAI} className="btn-secondary">
          <HiSparkles className="text-indigo-500" /> Ask ChatLoop AI
        </button>
      </div>
    </motion.div>
  </div>
);

export default WelcomePlaceholder;
