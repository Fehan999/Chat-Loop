import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

// input with a leading icon, used by every auth form so they all match
const FormField = ({ icon: Icon, type = "text", className = "", ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  return (
    <div className={`relative ${className}`}>
      {Icon && (
        <Icon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
      )}
      <input
        {...props}
        type={isPassword && showPassword ? "text" : type}
        className={`input-field ${Icon ? "pl-11" : ""} ${isPassword ? "pr-11" : ""}`}
      />
      {isPassword && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <FiEyeOff /> : <FiEye />}
        </button>
      )}
    </div>
  );
};

export default FormField;
