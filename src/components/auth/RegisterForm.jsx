import { AnimatePresence, motion } from "framer-motion";
import React, { useState } from "react";
import {
  FiArrowLeft,
  FiArrowRight,
  FiLock,
  FiMail,
  FiPhone,
  FiUser,
  FiCheck,
} from "react-icons/fi";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { generateUniqueIdWithTimestamp } from "../../utils/generateUserId";
import { uploadProfileImage } from "../../utils/supabase";

const RegisterForm = ({ onStart }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    bio: "",
    image: null,
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (files) {
      const file = files[0];
      if (file.size > 8 * 1024 * 1024) {
        setError("Image size should be less than 8 MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file");
        return;
      }
      setPreview(URL.createObjectURL(file));
      setFormData({ ...formData, image: file });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.firstName.trim()) return "First name is required";
      if (!formData.lastName.trim()) return "Last name is required";
      if (!formData.email.trim()) return "Email is required";
      if (!formData.email.includes("@")) return "Invalid email format";
    }

    if (step === 2) {
      if (!formData.password) return "Password is required";
      if (formData.password.length < 6)
        return "Password must be at least 6 characters";
      if (formData.password !== formData.confirmPassword)
        return "Passwords do not match";
    }

    return null;
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    if (step === 1 && onStart) onStart();
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError("");
    setStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    const err = validateStep();
    if (err) return setError(err);

    setLoading(true);
    setError("");

    try {
      const fullName = `${formData.firstName} ${formData.lastName}`;

      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const userId = userCredential.user.uid;
      console.log("User created with UID:", userId);

      // 2. Update profile in Firebase Auth
      await updateProfile(userCredential.user, {
        displayName: fullName,
      });

      const uniqueId = generateUniqueIdWithTimestamp();
      let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        fullName
      )}&background=amber&color=fff&size=128&bold=true`;

      // 3. Upload image to Supabase (optional, don't block if fails)
      if (formData.image) {
        try {
          const uploaded = await uploadProfileImage(formData.image, userId);
          if (uploaded) {
            avatarUrl = uploaded;
            console.log("Image uploaded successfully");
          }
        } catch (uploadError) {
          console.error(
            "Image upload failed, using default avatar:",
            uploadError
          );
          // Continue with default avatar
        }
      }

      // 4. Create user document in Firestore (THIS IS CRITICAL)
      const userData = {
        uid: userId,
        name: fullName,
        email: formData.email,
        phone: formData.phone || "",
        bio: formData.bio || "",
        avatar: avatarUrl,
        uniqueId: uniqueId,
        username: `@${fullName.replace(/\s+/g, "").toLowerCase()}_${uniqueId}`,
        status: "online",
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log("Creating user document:", userData);

      await setDoc(doc(db, "users", userId), userData);
      console.log("User document created successfully");

      alert("Registration successful! Welcome aboard!");

      // Clear form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        bio: "",
        image: null,
      });
      setPreview(null);
    } catch (err) {
      console.error("Registration error:", err);

      // Handle specific Firebase errors
      switch (err.code) {
        case "auth/email-already-in-use":
          setError(
            "This email is already registered. Please use a different email or login."
          );
          break;
        case "auth/weak-password":
          setError("Password should be at least 6 characters");
          break;
        case "auth/invalid-email":
          setError("Invalid email address format");
          break;
        case "auth/network-request-failed":
          setError("Network error. Please check your connection.");
          break;
        default:
          setError(
            err.message || "Failed to create account. Please try again."
          );
      }
    } finally {
      setLoading(false);
    }
  };

  const variants = {
    initial: { opacity: 0, x: 80 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -80 },
  };

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
        <motion.div
          className="bg-gradient-to-r from-amber-500 to-orange-500 h-2"
          animate={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="space-y-4"
        >
          {step === 1 && (
            <>
              <Input
                icon={<FiUser />}
                name="firstName"
                value={formData.firstName}
                placeholder="First Name"
                onChange={handleChange}
              />
              <Input
                icon={<FiUser />}
                name="lastName"
                value={formData.lastName}
                placeholder="Last Name"
                onChange={handleChange}
              />
              <Input
                icon={<FiMail />}
                name="email"
                type="email"
                value={formData.email}
                placeholder="Email"
                onChange={handleChange}
              />
              <Input
                icon={<FiPhone />}
                name="phone"
                value={formData.phone}
                placeholder="Phone (optional)"
                onChange={handleChange}
              />
            </>
          )}

          {step === 2 && (
            <>
              <Input
                icon={<FiLock />}
                type="password"
                name="password"
                value={formData.password}
                placeholder="Password"
                onChange={handleChange}
              />
              <Input
                icon={<FiLock />}
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                placeholder="Confirm Password"
                onChange={handleChange}
              />
            </>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-3">
                <div className="relative group">
                  <img
                    src={
                      preview ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        `${formData.firstName} ${formData.lastName}`
                      )}&background=amber&color=fff&size=128&bold=true`
                    }
                    className="w-24 h-24 rounded-full object-cover border-4 border-amber-200 shadow-lg"
                    alt="Profile"
                  />
                  <label className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-all">
                    <span className="text-white text-xs font-medium">
                      Change Photo
                    </span>
                    <input
                      type="file"
                      hidden
                      onChange={handleChange}
                      name="image"
                      accept="image/*"
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-400">
                  Max size 2MB. Recommended: Square image
                </p>
              </div>

              <textarea
                name="bio"
                placeholder="Write your bio..."
                value={formData.bio}
                onChange={handleChange}
                className="w-full p-4 rounded-2xl border focus:ring-2 focus:ring-amber-300 focus:border-transparent resize-none"
                rows="3"
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between pt-4">
        {step > 1 && (
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <FiArrowLeft /> Back
          </button>
        )}

        {step < 3 && (
          <button
            onClick={handleNext}
            className="ml-auto bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-2 rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
          >
            Next <FiArrowRight />
          </button>
        )}

        {step === 3 && (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="ml-auto bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-2 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              "Finish"
            )}
          </button>
        )}
      </div>
    </div>
  );
};

const Input = ({ icon, ...props }) => (
  <div className="relative">
    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
      {icon}
    </div>
    <input
      {...props}
      className="w-full pl-10 p-3 border rounded-xl focus:ring-2 focus:ring-amber-300 focus:border-transparent transition-all"
    />
    {props.value && props.value.length > 0 && (
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
        <FiCheck />
      </div>
    )}
  </div>
);

export default RegisterForm;
