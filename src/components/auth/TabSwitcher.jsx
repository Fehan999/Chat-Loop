import { motion } from "framer-motion";

const TABS = [
  { id: true, label: "Login" },
  { id: false, label: "Register" },
];

const TabSwitcher = ({ isLogin, setIsLogin }) => (
  <div className="mb-6 grid grid-cols-2 rounded-xl bg-gray-100 p-1">
    {TABS.map((tab) => {
      const active = tab.id === isLogin;
      return (
        <button
          key={tab.label}
          type="button"
          onClick={() => setIsLogin(tab.id)}
          className={`relative rounded-lg py-2.5 text-sm font-medium transition-colors ${
            active ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {active && (
            <motion.span
              layoutId="auth-tab"
              className="absolute inset-0 rounded-lg bg-white shadow-sm"
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}
          <span className="relative">{tab.label}</span>
        </button>
      );
    })}
  </div>
);

export default TabSwitcher;
