import { signInWithPopup } from "firebase/auth";
import { useState } from "react";
import { FaGithub } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { auth, githubProvider, googleProvider } from "../../firebase/config";
import { createUserProfile, getUserData } from "../../firebase/firestoreService";
import { authErrorMessage } from "./authErrors";

const PROVIDERS = [
  { name: "Google", provider: googleProvider, Icon: FcGoogle },
  { name: "GitHub", provider: githubProvider, Icon: FaGithub },
];

const SocialAuth = () => {
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState("");

  const handleSocialLogin = async ({ name, provider }) => {
    setLoading(name);
    setError("");

    try {
      const { user } = await signInWithPopup(auth, provider);

      // the presence heartbeat can create a bare doc before we get here,
      // so check for a real profile rather than just an existing doc
      const existing = await getUserData(user.uid);
      if (!existing?.email) {
        await createUserProfile({
          uid: user.uid,
          name: user.displayName || user.email?.split("@")[0] || name,
          email: user.email,
          avatar: user.photoURL || "",
        });
      }
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user" && err.code !== "auth/cancelled-popup-request") {
        setError(authErrorMessage(err, `Couldn't sign in with ${name}.`));
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      {error && (
        <div className="mb-3 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {PROVIDERS.map((item) => (
          <button
            key={item.name}
            type="button"
            onClick={() => handleSocialLogin(item)}
            disabled={!!loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            {loading === item.name ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-500" />
            ) : (
              <item.Icon className="text-lg" />
            )}
            {item.name}
          </button>
        ))}
      </div>
    </>
  );
};

export default SocialAuth;
