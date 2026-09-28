import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCamera,
  FiLock,
  FiMail,
  FiPhone,
  FiUser,
} from "react-icons/fi";
import { auth } from "../../firebase/config";
import { createUserProfile, updateUserProfile } from "../../firebase/firestoreService";
import { uploadProfileImage } from "../../utils/supabase";
import { avatarFor } from "../../utils/userDisplay";
import { authErrorMessage } from "./authErrors";
import FormField from "./FormField";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const STEPS = ["Your details", "Password", "Profile"];

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  bio: "",
  image: null,
};

const RegisterForm = ({ onStart }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Please pick an image file.");
    if (file.size > MAX_AVATAR_SIZE) return setError("Image should be under 5 MB.");

    setError("");
    setPreview(URL.createObjectURL(file));
    setFormData((prev) => ({ ...prev, image: file }));
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.firstName.trim()) return "First name is required.";
      if (!formData.lastName.trim()) return "Last name is required.";
      if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) return "Please enter a valid email.";
    }
    if (step === 2) {
      if (formData.password.length < 6) return "Password must be at least 6 characters.";
      if (formData.password !== formData.confirmPassword) return "Passwords don't match.";
    }
    return null;
  };

  const createAccount = async () => {
    setLoading(true);
    setError("");

    try {
      const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`;
      const { user } = await createUserWithEmailAndPassword(
        auth,
        formData.email.trim(),
        formData.password
      );

      // profile doc first so the dashboard has a name right away,
      // the photo gets patched in once the upload finishes
      await Promise.all([
        updateProfile(user, { displayName: fullName }),
        createUserProfile({
          uid: user.uid,
          name: fullName,
          email: user.email,
          phone: formData.phone.trim(),
          bio: formData.bio.trim(),
        }),
      ]);

      if (formData.image) {
        const avatar = await uploadProfileImage(formData.image, user.uid);
        if (avatar) await updateUserProfile(user.uid, { avatar, photoURL: avatar });
      }

      toast.success("Welcome to ChatLoop!");
    } catch (err) {
      setError(authErrorMessage(err, "Couldn't create your account. Please try again."));
      if (err.code === "auth/email-already-in-use") setStep(1);
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const problem = validateStep();
    if (problem) return setError(problem);
    setError("");

    if (step < STEPS.length) {
      if (step === 1) onStart?.();
      setStep((s) => s + 1);
    } else {
      createAccount();
    }
  };

  const previewName = `${formData.firstName} ${formData.lastName}`.trim() || "New User";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <div className="mb-2 flex justify-between text-xs font-medium">
          {STEPS.map((label, i) => (
            <span key={label} className={i + 1 <= step ? "text-indigo-600" : "text-gray-400"}>
              {label}
            </span>
          ))}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
            animate={{ width: `${(step / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  icon={FiUser}
                  name="firstName"
                  placeholder="First name"
                  autoComplete="given-name"
                  value={formData.firstName}
                  onChange={handleChange}
                />
                <FormField
                  name="lastName"
                  placeholder="Last name"
                  autoComplete="family-name"
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>
              <FormField
                icon={FiMail}
                name="email"
                type="email"
                placeholder="Email address"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
              />
              <FormField
                icon={FiPhone}
                name="phone"
                type="tel"
                placeholder="Phone (optional)"
                autoComplete="tel"
                value={formData.phone}
                onChange={handleChange}
              />
            </>
          )}

          {step === 2 && (
            <>
              <FormField
                icon={FiLock}
                type="password"
                name="password"
                placeholder="Password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
              />
              <FormField
                icon={FiLock}
                type="password"
                name="confirmPassword"
                placeholder="Confirm password"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              <p className="text-xs text-gray-400">At least 6 characters.</p>
            </>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2">
                <label className="group relative cursor-pointer">
                  <img
                    src={preview || avatarFor({ name: previewName })}
                    alt="Profile preview"
                    className="h-24 w-24 rounded-full object-cover ring-4 ring-indigo-100"
                  />
                  <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-indigo-500 text-white shadow group-hover:bg-indigo-600">
                    <FiCamera size={14} />
                  </span>
                  <input type="file" accept="image/*" hidden onChange={handleImage} />
                </label>
                <p className="text-xs text-gray-400">Optional, up to 5 MB</p>
              </div>
              <textarea
                name="bio"
                placeholder="A line or two about you (optional)"
                value={formData.bio}
                onChange={handleChange}
                rows={3}
                maxLength={160}
                className="input-field resize-none"
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center gap-3 pt-2">
        {step > 1 && (
          <button
            type="button"
            onClick={() => {
              setError("");
              setStep((s) => s - 1);
            }}
            disabled={loading}
            className="btn-secondary"
          >
            <FiArrowLeft /> Back
          </button>
        )}
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Creating account...
            </>
          ) : step < STEPS.length ? (
            <>
              Continue <FiArrowRight />
            </>
          ) : (
            "Create account"
          )}
        </button>
      </div>
    </form>
  );
};

export default RegisterForm;
