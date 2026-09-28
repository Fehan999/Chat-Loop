import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { FiArrowLeft, FiArrowRight, FiEye, FiLock, FiMail, FiShield } from "react-icons/fi";
import { Link } from "react-router-dom";
import { GUEST_EMAIL, GUEST_PASSWORD } from "../../constants";
import { auth } from "../../firebase/config";
import AboutDeveloper from "../about/AboutDeveloper";
import { authErrorMessage } from "../auth/authErrors";
import FormField from "../auth/FormField";
import SocialAuth from "../auth/SocialAuth";
import Logo from "../brand/Logo";

// firebase answers "invalid credential" both for a wrong password and for an
// account that doesn't exist yet, so the first guest login creates the account
const signInAsGuest = async () => {
  try {
    await signInWithEmailAndPassword(auth, GUEST_EMAIL, GUEST_PASSWORD);
  } catch (error) {
    const missing = ["auth/invalid-credential", "auth/user-not-found"].includes(error.code);
    if (!missing) throw error;
    await createUserWithEmailAndPassword(auth, GUEST_EMAIL, GUEST_PASSWORD);
  }
};

const Spinner = ({ light }) => (
  <span
    className={`h-5 w-5 animate-spin rounded-full border-2 ${
      light ? "border-white border-t-transparent" : "border-gray-300 border-t-indigo-500"
    }`}
  />
);

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(null);

  const run = (key, fn) => async () => {
    setError("");
    setLoading(key);
    try {
      await fn();
      // App's auth listener re-renders the admin page once we're signed in
    } catch (err) {
      setError(authErrorMessage(err, "Couldn't sign you in. Please try again."));
      setLoading(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    run("admin", () => signInWithEmailAndPassword(auth, email.trim(), password))();
  };

  return (
    <div className="min-h-[100dvh] bg-gray-50 px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <Logo size={36} withText />
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <FiArrowLeft /> Back to app
          </Link>
        </div>

        <div className="card p-6 sm:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600">
            <FiShield /> Admin panel
          </span>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">Sign in to the dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Admin accounts get full access. Just want to look around? Use the guest login below.
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-800">
              <FiEye /> Guest login
            </p>
            <p className="mt-1 text-xs text-amber-700">
              See the real dashboard, users and reports. Editing, deleting and suspending are turned
              off.
            </p>
            <dl className="mt-3 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-xs">
              <dt className="text-amber-700">Email</dt>
              <dd className="select-all font-mono text-amber-900">{GUEST_EMAIL}</dd>
              <dt className="text-amber-700">Password</dt>
              <dd className="select-all font-mono text-amber-900">{GUEST_PASSWORD}</dd>
            </dl>
            <button
              type="button"
              onClick={run("guest", signInAsGuest)}
              disabled={!!loading}
              className="btn-primary mt-4 w-full bg-amber-500 shadow-amber-500/30 hover:bg-amber-600"
            >
              {loading === "guest" ? <Spinner light /> : "Log in as guest"}
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-gray-400">admin sign in</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <FormField
              icon={FiMail}
              type="email"
              placeholder="Admin email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!loading}
              required
            />
            <FormField
              icon={FiLock}
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!!loading}
              required
            />
            <button type="submit" disabled={!!loading} className="btn-primary group w-full">
              {loading === "admin" ? (
                <Spinner light />
              ) : (
                <>
                  Sign in
                  <FiArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-4">
            <SocialAuth />
          </div>
        </div>

        <AboutDeveloper />
      </div>
    </div>
  );
};

export default AdminLogin;
