// pages/Settings.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiLock,
  FiCamera,
  FiMoon,
  FiSun,
  FiPower,
  FiSave,
  FiX,
  FiCheck,
  FiAlertCircle,
  FiEdit2,
  FiLogOut,
  FiTrash2,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "../firebase/config";
import {
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut,
} from "firebase/auth";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { uploadProfileImage } from "../utils/supabase";
import { updateUserProfile, getUserData } from "../firebase/firestoreService";
import { useAuth } from "../contexts/AuthContext";

const SettingsPage = () => {
  const { currentUser, userData, setUserData } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const fileInputRef = useRef(null);

  // Profile state
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    bio: "",
  });
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Preferences state
  const [preferences, setPreferences] = useState({
    darkMode: localStorage.getItem("theme") === "dark",
    activeStatus: true,
    readReceipts: true,
    notifications: true,
    soundEffects: true,
  });

  useEffect(() => {
    if (userData) {
      setProfileData({
        name: userData.name || "",
        email: currentUser?.email || "",
        phone: userData.phone || "",
        bio: userData.bio || "",
      });
    }
  }, [userData, currentUser]);

  useEffect(() => {
    // Apply theme on mount and when darkMode changes
    if (preferences.darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [preferences.darkMode]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showMessage("error", "Image size should be less than 2MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        showMessage("error", "Please upload an image file");
        return;
      }
      setProfileImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const updateProfileImage = async () => {
    if (!profileImage) return null;

    try {
      const url = await uploadProfileImage(profileImage, currentUser.uid);
      if (url) {
        await updateUserProfile(currentUser.uid, { avatar: url });
        setUserData({ ...userData, avatar: url });
        showMessage("success", "Profile picture updated!");
        return url;
      }
    } catch (error) {
      console.error("Image upload error:", error);
      showMessage("error", "Failed to update profile picture");
    }
    return null;
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update profile image if changed
      let newAvatar = userData?.avatar;
      if (profileImage) {
        const uploadedUrl = await updateProfileImage();
        if (uploadedUrl) newAvatar = uploadedUrl;
      }

      // Update user data
      const updates = {
        name: profileData.name,
        phone: profileData.phone,
        bio: profileData.bio,
        avatar: newAvatar,
        updatedAt: new Date().toISOString(),
      };

      await updateUserProfile(currentUser.uid, updates);
      setUserData({ ...userData, ...updates });
      setProfileImage(null);
      showMessage("success", "Profile updated successfully!");
    } catch (error) {
      console.error("Update error:", error);
      showMessage("error", error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage("error", "New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showMessage("error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(
        user.email,
        passwordData.currentPassword
      );

      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordData.newPassword);

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      showMessage("success", "Password changed successfully!");
    } catch (error) {
      console.error("Password change error:", error);
      if (error.code === "auth/wrong-password") {
        showMessage("error", "Current password is incorrect");
      } else {
        showMessage("error", error.message || "Failed to change password");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      try {
        await signOut(auth);
        showMessage("success", "Signed out successfully");
        // Redirect will be handled by auth state change
      } catch (error) {
        console.error("Sign out error:", error);
        showMessage("error", "Failed to sign out");
      }
    }
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: FiUser },
    { id: "security", label: "Security", icon: FiLock },
    { id: "preferences", label: "Preferences", icon: FiSun },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
        </div>
      </div>

      {/* Message Toast */}
      <AnimatePresence>
        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
              message.type === "success"
                ? "bg-green-500 text-white"
                : "bg-red-500 text-white"
            }`}
          >
            {message.type === "success" ? <FiCheck /> : <FiAlertCircle />}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Tabs - Horizontal scroll on mobile */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 hide-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-amber-500 text-white shadow-lg"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Profile Image Section */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Profile Picture
                </h2>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative group">
                    <img
                      src={
                        imagePreview ||
                        userData?.avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          profileData.name
                        )}&background=amber&color=fff&size=128&bold=true`
                      }
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover border-4 border-amber-200 dark:border-amber-800"
                    />
                    <button
                      onClick={() => fileInputRef.current.click()}
                      className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <FiCamera className="w-6 h-6 text-white" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageChange}
                      className="hidden"
                    />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Click the image to change your profile picture
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Max size 2MB. Recommended: Square image
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile Info Form */}
              <form
                onSubmit={handleUpdateProfile}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm space-y-5"
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Personal Information
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) =>
                        setProfileData({ ...profileData, name: e.target.value })
                      }
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={profileData.email}
                      disabled
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Email cannot be changed
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          phone: e.target.value,
                        })
                      }
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bio
                  </label>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) =>
                      setProfileData({ ...profileData, bio: e.target.value })
                    }
                    rows="3"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none dark:bg-gray-700 dark:text-white"
                    placeholder="Tell something about yourself..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FiSave />
                      Save Changes
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {activeTab === "security" && (
            <motion.div
              key="security"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Change Password */}
              <form
                onSubmit={handleChangePassword}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm space-y-5"
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Change Password
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          currentPassword: e.target.value,
                        })
                      }
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          newPassword: e.target.value,
                        })
                      }
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Minimum 6 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <FiLock />
                      Change Password
                    </>
                  )}
                </button>
              </form>

              {/* Sign Out */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Account Actions
                </h2>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-medium transition-all"
                >
                  <FiLogOut />
                  Sign Out
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === "preferences" && (
            <motion.div
              key="preferences"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Appearance
                </h2>

                {/* Dark Mode Toggle */}
                <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    {preferences.darkMode ? (
                      <FiMoon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    ) : (
                      <FiSun className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Dark Mode
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Switch between light and dark theme
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setPreferences({
                        ...preferences,
                        darkMode: !preferences.darkMode,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      preferences.darkMode ? "bg-amber-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        preferences.darkMode ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Active Status Toggle */}
                <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <FiPower className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Active Status
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Show when you're active
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setPreferences({
                        ...preferences,
                        activeStatus: !preferences.activeStatus,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      preferences.activeStatus ? "bg-amber-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        preferences.activeStatus
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Read Receipts Toggle */}
                <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <FiCheck className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Read Receipts
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Show when you've read messages
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setPreferences({
                        ...preferences,
                        readReceipts: !preferences.readReceipts,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      preferences.readReceipts ? "bg-amber-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        preferences.readReceipts
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Notifications Toggle */}
                <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <FiBell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Notifications
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Receive message notifications
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setPreferences({
                        ...preferences,
                        notifications: !preferences.notifications,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      preferences.notifications ? "bg-amber-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        preferences.notifications
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Sound Effects Toggle */}
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <FiVolume2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Sound Effects
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Play sounds for messages
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setPreferences({
                        ...preferences,
                        soundEffects: !preferences.soundEffects,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      preferences.soundEffects ? "bg-amber-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        preferences.soundEffects
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Save Preferences Button */}
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    await updateUserProfile(currentUser.uid, { preferences });
                    showMessage("success", "Preferences saved!");
                  } catch (error) {
                    showMessage("error", "Failed to save preferences");
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FiSave />
                    Save Preferences
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SettingsPage;
