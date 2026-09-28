import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiX,
  FiCamera,
  FiUser,
  FiMail,
  FiAtSign,
  FiPhone,
  FiMapPin,
  FiEdit2,
  FiSave,
  FiLock,
  FiLogOut,
  FiCircle,
  FiCheckCircle,
  FiAlertCircle,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import {
  getAuth,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { supabase, uploadProfileImage } from "../../utils/supabase";
import {
  updateUserProfile,
  updateUserStatus,
} from "../../firebase/firestoreService";

const SettingsPanel = ({ user, onClose, onUpdate, onLogout }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(
    user.avatar ||
      user.photoURL ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        user.name || "User"
      )}&background=6366f1&color=fff`
  );
  const [formData, setFormData] = useState({
    name: user.name || "",
    username: user.username || "",
    bio: user.bio || "",
    phone: user.phone || "",
    location: user.location || "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });
  const [activeStatus, setActiveStatus] = useState(user.status === "online");

  const fileInputRef = useRef(null);
  const auth = getAuth();

  const showMessage = (type, text) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage({ type: "", text: "" }), 3000);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showMessage("error", "Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showMessage("error", "Image must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const publicUrl = await uploadProfileImage(file, user.uid);

      if (publicUrl) {
        setAvatarUrl(publicUrl);
        await updateUserProfile(user.uid, {
          avatar: publicUrl,
          photoURL: publicUrl,
          updatedAt: new Date().toISOString(),
        });

        showMessage("success", "Profile picture updated!");
        onUpdate({ ...formData, avatar: publicUrl });
      } else {
        throw new Error("Upload failed");
      }
    } catch (err) {
      console.error("Avatar upload error:", err);
      showMessage("error", "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsUploading(true);
    try {
      await updateUserProfile(user.uid, {
        name: formData.name,
        bio: formData.bio,
        phone: formData.phone,
        location: formData.location,
        avatar: avatarUrl,
        photoURL: avatarUrl,
        updatedAt: new Date().toISOString(),
      });

      showMessage("success", "Profile updated successfully!");
      onUpdate({ ...formData, avatar: avatarUrl });
      setIsEditing(false);
    } catch (err) {
      console.error("Save error:", err);
      showMessage("error", err.message || "Failed to update profile");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword) {
      showMessage("error", "Please enter your current password");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage("error", "New passwords do not match");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      showMessage("error", "Password must be at least 6 characters");
      return;
    }

    setIsUploading(true);
    try {
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.email) {
        const credential = EmailAuthProvider.credential(
          currentUser.email,
          passwordData.currentPassword
        );
        await reauthenticateWithCredential(currentUser, credential);

        await updatePassword(currentUser, passwordData.newPassword);

        showMessage("success", "Password updated successfully!");
        setIsChangingPassword(false);
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        throw new Error("No user logged in");
      }
    } catch (err) {
      console.error("Password error:", err);
      if (err.code === "auth/wrong-password") {
        showMessage("error", "Current password is incorrect");
      } else if (err.code === "auth/requires-recent-login") {
        showMessage(
          "error",
          "Please log out and log in again to change password"
        );
      } else {
        showMessage("error", err.message || "Failed to update password");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleActiveStatusToggle = async () => {
    const newStatus = !activeStatus;
    setActiveStatus(newStatus);
    try {
      await updateUserStatus(user.uid, newStatus ? "online" : "offline");
      showMessage("success", `You are now ${newStatus ? "online" : "offline"}`);
      onUpdate({ ...formData, status: newStatus ? "online" : "offline" });
    } catch (err) {
      console.error("Status error:", err);
      setActiveStatus(!newStatus);
      showMessage("error", "Failed to update status");
    }
  };

  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Prevent click inside panel from closing
  const handlePanelClick = (e) => {
    e.stopPropagation();
  };

  return (
    <>
      {/* Backdrop - click outside closes */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 z-50"
      />

      {/* Full Screen Settings Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 25 }}
        onClick={handlePanelClick}
        className="fixed inset-0 bg-white z-50 overflow-y-auto"
      >
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FiX className="text-xl text-gray-600" />
            </button>
          </div>

          {/* Status Message */}
          <AnimatePresence>
            {statusMessage.text && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                  statusMessage.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {statusMessage.type === "success" ? (
                  <FiCheckCircle />
                ) : (
                  <FiAlertCircle />
                )}
                {statusMessage.text}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sidebar - Profile Summary */}
            <div className="md:col-span-1">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 text-center sticky top-6 border border-indigo-100">
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <img
                    src={avatarUrl}
                    alt={formData.name}
                    className="w-32 h-32 rounded-full object-cover ring-4 ring-indigo-300"
                  />
                  <button
                    onClick={handleAvatarClick}
                    disabled={isUploading}
                    className="absolute bottom-0 right-0 w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center border-2 border-white hover:bg-indigo-600 transition-colors disabled:opacity-50 shadow-lg"
                  >
                    {isUploading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <FiCamera className="text-white text-sm" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {formData.name}
                </h3>
                <p className="text-indigo-600">
                  @
                  {formData.username ||
                    formData.name?.toLowerCase().replace(/\s/g, "")}
                </p>
                <div className="mt-4 pt-4 border-t border-indigo-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Status</span>
                    <button
                      onClick={handleActiveStatusToggle}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        activeStatus
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      <FiCircle className="w-2 h-2 fill-current" />
                      {activeStatus ? "Active" : "Offline"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="md:col-span-2 space-y-6">
              {/* Edit Profile Section */}
              <div className="bg-white rounded-2xl border border-indigo-100 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-indigo-100 flex justify-between items-center bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Profile Information
                  </h3>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <FiEdit2 size={14} />
                    {isEditing ? "Cancel" : "Edit"}
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <InfoItem
                    icon={<FiUser className="text-indigo-500" />}
                    label="Full Name"
                    value={formData.name}
                    isEditing={isEditing}
                    onChange={(val) => setFormData({ ...formData, name: val })}
                  />

                  {/* Username - Read Only */}
                  <div className="flex items-start gap-3">
                    <div className="text-indigo-500 mt-1">
                      <FiAtSign />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-400">Username</p>
                      <p className="text-sm text-gray-900 mt-1">
                        @
                        {formData.username ||
                          formData.name?.toLowerCase().replace(/\s/g, "")}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Username cannot be changed
                      </p>
                    </div>
                  </div>

                  {/* Email - Read Only */}
                  <div className="flex items-start gap-3">
                    <div className="text-indigo-500 mt-1">
                      <FiMail />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-400">Email</p>
                      <p className="text-sm text-gray-900 mt-1">{user.email}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Email cannot be changed
                      </p>
                    </div>
                  </div>

                  <InfoItem
                    icon={<FiPhone className="text-indigo-500" />}
                    label="Phone"
                    value={formData.phone}
                    isEditing={isEditing}
                    onChange={(val) => setFormData({ ...formData, phone: val })}
                    type="tel"
                  />
                  <InfoItem
                    icon={<FiMapPin className="text-indigo-500" />}
                    label="Location"
                    value={formData.location}
                    isEditing={isEditing}
                    onChange={(val) =>
                      setFormData({ ...formData, location: val })
                    }
                  />
                  <InfoItem
                    icon={<FiUser className="text-indigo-500" />}
                    label="Bio"
                    value={formData.bio || "No bio yet"}
                    isEditing={isEditing}
                    onChange={(val) => setFormData({ ...formData, bio: val })}
                    multiline
                  />

                  {isEditing && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={handleSave}
                      disabled={isUploading}
                      className="w-full mt-4 py-2.5 bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
                    >
                      <FiSave />
                      Save Changes
                    </motion.button>
                  )}
                </div>
              </div>

              {/* Password Change Section */}
              <div className="bg-white rounded-2xl border border-indigo-100 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-indigo-100 flex justify-between items-center bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Security
                  </h3>
                  <button
                    onClick={() => setIsChangingPassword(!isChangingPassword)}
                    className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <FiLock size={14} />
                    {isChangingPassword ? "Cancel" : "Change Password"}
                  </button>
                </div>
                <div className="p-6">
                  {isChangingPassword ? (
                    <div className="space-y-4">
                      {/* Current Password */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            type={showCurrentPassword ? "text" : "password"}
                            placeholder="Enter current password"
                            value={passwordData.currentPassword}
                            onChange={(e) =>
                              setPasswordData({
                                ...passwordData,
                                currentPassword: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-10"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowCurrentPassword(!showCurrentPassword)
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showCurrentPassword ? (
                              <FiEyeOff size={18} />
                            ) : (
                              <FiEye size={18} />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* New Password */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            placeholder="Enter new password (min 6 characters)"
                            value={passwordData.newPassword}
                            onChange={(e) =>
                              setPasswordData({
                                ...passwordData,
                                newPassword: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showNewPassword ? (
                              <FiEyeOff size={18} />
                            ) : (
                              <FiEye size={18} />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Confirm Password */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm new password"
                            value={passwordData.confirmPassword}
                            onChange={(e) =>
                              setPasswordData({
                                ...passwordData,
                                confirmPassword: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-10"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showConfirmPassword ? (
                              <FiEyeOff size={18} />
                            ) : (
                              <FiEye size={18} />
                            )}
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={handlePasswordChange}
                        disabled={isUploading}
                        className="w-full py-2 bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-600 transition-all disabled:opacity-50 shadow-md"
                      >
                        Update Password
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">
                      Change your password to keep your account secure.
                    </p>
                  )}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-white rounded-2xl border border-red-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-red-200 bg-gradient-to-r from-red-50/50 to-rose-50/50">
                  <h3 className="text-lg font-semibold text-red-600">
                    Danger Zone
                  </h3>
                </div>
                <div className="p-6">
                  <button
                    onClick={onLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-sm"
                  >
                    <FiLogOut />
                    Log Out
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    Logging out will end your current session.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

const InfoItem = ({
  icon,
  label,
  value,
  isEditing,
  onChange,
  type = "text",
  multiline = false,
}) => {
  return (
    <div className="flex items-start gap-3">
      <div className="text-indigo-500 mt-1">{icon}</div>
      <div className="flex-1">
        <p className="text-xs text-gray-400">{label}</p>
        {isEditing ? (
          multiline ? (
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              rows={2}
              className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          ) : (
            <input
              type={type}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )
        ) : (
          <p className="text-sm text-gray-900 mt-1 break-words">
            {value || "Not set"}
          </p>
        )}
      </div>
    </div>
  );
};

export default SettingsPanel;
