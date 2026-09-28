import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { FiArrowRight, FiLock, FiMail } from "react-icons/fi";
import { auth } from "../../firebase/config";
import { authErrorMessage } from "./authErrors";
import ForgotPasswordModal from "./ForgotPasswordModal";
import FormField from "./FormField";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // App's auth listener takes care of the redirect
    } catch (err) {
      setError(authErrorMessage(err, "Couldn't sign you in. Please try again."));
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <FormField
          icon={FiMail}
          type="email"
          placeholder="Email address"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
        />

        <FormField
          icon={FiLock}
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className="text-sm font-medium text-indigo-500 hover:text-indigo-600"
          >
            Forgot password?
          </button>
        </div>

        <button type="submit" disabled={loading} className="btn-primary group w-full">
          {loading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              Sign in
              <FiArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        initialEmail={email}
        onClose={() => setShowForgotPassword(false)}
      />
    </>
  );
};

export default LoginForm;
