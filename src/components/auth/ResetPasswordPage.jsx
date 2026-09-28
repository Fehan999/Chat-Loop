import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FiAlertCircle, FiCheckCircle, FiLock } from "react-icons/fi";
import { auth } from "../../firebase/config";
import Logo from "../brand/Logo";
import SplashScreen from "../common/SplashScreen";
import { authErrorMessage } from "./authErrors";
import FormField from "./FormField";

// landing page for the link in firebase's password reset email
const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const oobCode = searchParams.get("oobCode");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!oobCode) {
      setError("This reset link is invalid or has expired.");
      setVerifying(false);
      return;
    }
    verifyPasswordResetCode(auth, oobCode)
      .then(setEmail)
      .catch((err) => setError(authErrorMessage(err, "We couldn't verify this reset link.")))
      .finally(() => setVerifying(false));
  }, [oobCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirmPassword) return setError("Passwords don't match.");

    setLoading(true);
    setError("");
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess(true);
      setTimeout(() => navigate("/auth"), 2500);
    } catch (err) {
      setError(authErrorMessage(err, "Couldn't reset your password. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  if (verifying) return <SplashScreen label="Checking your reset link..." />;

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card w-full max-w-md p-8"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={48} />
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Set a new password</h2>
          {email && <p className="mt-1 text-sm text-gray-500">for {email}</p>}
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
            <FiAlertCircle className="flex-shrink-0" />
            {error}
          </div>
        )}

        {success ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <FiCheckCircle className="text-2xl text-emerald-500" />
            </div>
            <p className="font-medium text-gray-900">Password updated</p>
            <p className="mt-1 text-sm text-gray-500">Taking you back to login...</p>
          </div>
        ) : (
          oobCode &&
          email && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <FormField
                icon={FiLock}
                type="password"
                placeholder="New password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <FormField
                icon={FiLock}
                type="password"
                placeholder="Confirm new password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Saving..." : "Reset password"}
              </button>
            </form>
          )
        )}

        <p className="mt-6 text-center text-sm">
          <Link to="/auth" className="font-medium text-indigo-500 hover:text-indigo-600">
            Back to login
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
