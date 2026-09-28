import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  FiBell,
  FiCamera,
  FiCopy,
  FiEye,
  FiLock,
  FiLogOut,
  FiUser,
  FiVolume2,
  FiX,
} from "react-icons/fi";
import { auth } from "../../firebase/config";
import { updateUserProfile } from "../../firebase/firestoreService";
import { logout } from "../../service/userStatus";
import { formatMonthYear } from "../../utils/dateUtils";
import {
  canUseDesktopNotifications,
  getPrefs,
  playNotificationSound,
  requestDesktopPermission,
  savePrefs,
} from "../../utils/notify";
import { uploadProfileImage } from "../../utils/supabase";
import { avatarFor, formatUsername } from "../../utils/userDisplay";
import FormField from "../auth/FormField";
import Toggle from "../common/Toggle";

const Section = ({ icon: Icon, title, action, children }) => (
  <section className="card overflow-hidden">
    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
        <Icon className="text-indigo-500" /> {title}
      </h3>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </section>
);

const SettingRow = ({ title, description, children }) => (
  <div className="flex items-center justify-between gap-4 py-2">
    <div>
      <p className="text-sm font-medium text-gray-800">{title}</p>
      {description && <p className="text-xs text-gray-500">{description}</p>}
    </div>
    {children}
  </div>
);

const SettingsPanel = ({ user, onClose }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: user.name || "",
    bio: user.bio || "",
    phone: user.phone || "",
    location: user.location || "",
  });
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [changingPassword, setChangingPassword] = useState(false);
  const [prefs, setPrefs] = useState(getPrefs);
  const fileInputRef = useRef(null);

  const usesPassword = auth.currentUser?.providerData.some((p) => p.providerId === "password");
  const showStatus = user.showActiveStatus !== false;

  useEffect(() => {
    const onKeyDown = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleAvatar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please pick an image.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image should be under 5 MB.");

    setUploading(true);
    const url = await uploadProfileImage(file, user.uid);
    if (url && (await updateUserProfile(user.uid, { avatar: url, photoURL: url }))) {
      toast.success("Profile photo updated");
    } else {
      toast.error("Upload failed, please try again.");
    }
    setUploading(false);
  };

  const saveProfile = async () => {
    if (!form.name.trim()) return toast.error("Name can't be empty.");
    setSaving(true);
    const ok = await updateUserProfile(user.uid, {
      name: form.name.trim(),
      bio: form.bio.trim(),
      phone: form.phone.trim(),
      location: form.location.trim(),
    });
    setSaving(false);
    if (ok) {
      toast.success("Profile saved");
      setEditing(false);
    } else {
      toast.error("Couldn't save your profile.");
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwords.next.length < 6) return toast.error("New password needs at least 6 characters.");
    if (passwords.next !== passwords.confirm) return toast.error("New passwords don't match.");

    setSaving(true);
    try {
      const current = auth.currentUser;
      const credential = EmailAuthProvider.credential(current.email, passwords.current);
      await reauthenticateWithCredential(current, credential);
      await updatePassword(current, passwords.next);
      toast.success("Password updated");
      setPasswords({ current: "", next: "", confirm: "" });
      setChangingPassword(false);
    } catch (err) {
      const wrong = ["auth/wrong-password", "auth/invalid-credential"].includes(err.code);
      toast.error(wrong ? "Current password is incorrect." : "Couldn't update the password.");
    } finally {
      setSaving(false);
    }
  };

  const updatePref = async (key, value) => {
    if (key === "desktop" && value && !(await requestDesktopPermission())) {
      toast.error("Notifications are blocked in your browser settings.");
      return;
    }
    setPrefs(savePrefs({ [key]: value }));
    if (key === "sound" && value) playNotificationSound();
  };

  const copyUsername = async () => {
    try {
      await navigator.clipboard.writeText(formatUsername(user.username));
      toast.success("Username copied");
    } catch {
      toast.error("Couldn't copy.");
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-gray-900/40"
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        className="thin-scroll fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto bg-gray-50 shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/90 px-5 py-4 backdrop-blur">
          <h2 className="text-lg font-bold text-gray-900">Settings</h2>
          <button onClick={onClose} className="icon-btn" aria-label="Close settings">
            <FiX className="text-xl" />
          </button>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="card flex items-center gap-4 p-5">
            <div className="relative flex-shrink-0">
              <img
                src={avatarFor(user)}
                alt=""
                className="h-20 w-20 rounded-full object-cover ring-4 ring-indigo-50"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-indigo-500 text-white shadow hover:bg-indigo-600 disabled:opacity-60"
                aria-label="Change photo"
              >
                {uploading ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <FiCamera size={14} />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleAvatar}
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-gray-900">{user.name}</p>
              <button
                onClick={copyUsername}
                className="flex items-center gap-1.5 text-sm text-indigo-500 hover:text-indigo-600"
              >
                {formatUsername(user.username)} <FiCopy size={12} />
              </button>
              <p className="mt-1 text-xs text-gray-400">
                ID {user.uniqueId || "----"}
                {user.createdAt && ` · Joined ${formatMonthYear(user.createdAt)}`}
              </p>
            </div>
          </div>

          <Section
            icon={FiUser}
            title="Profile"
            action={
              <button
                onClick={() => setEditing((v) => !v)}
                className="text-sm font-medium text-indigo-500 hover:text-indigo-600"
              >
                {editing ? "Cancel" : "Edit"}
              </button>
            }
          >
            {editing ? (
              <div className="space-y-3">
                <FormField
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <textarea
                  placeholder="Bio"
                  rows={3}
                  maxLength={160}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  className="input-field resize-none"
                />
                <FormField
                  type="tel"
                  placeholder="Phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
                <FormField
                  placeholder="Location"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
                <button onClick={saveProfile} disabled={saving} className="btn-primary w-full">
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            ) : (
              <dl className="space-y-3 text-sm">
                {[
                  ["Email", user.email],
                  ["Bio", user.bio],
                  ["Phone", user.phone],
                  ["Location", user.location],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-4">
                    <dt className="w-20 flex-shrink-0 text-gray-400">{label}</dt>
                    <dd className="min-w-0 break-words text-gray-800">
                      {value || <span className="text-gray-300">Not set</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </Section>

          <Section icon={FiEye} title="Privacy">
            <SettingRow
              title="Show when I'm online"
              description="If this is off, friends see you as offline and can't see your last seen time."
            >
              <Toggle
                label="Show online status"
                checked={showStatus}
                onChange={(value) => updateUserProfile(user.uid, { showActiveStatus: value })}
              />
            </SettingRow>
          </Section>

          <Section icon={FiBell} title="Notifications">
            <SettingRow
              title="Message sounds"
              description="Play a sound for new messages and requests."
            >
              <Toggle
                label="Message sounds"
                checked={prefs.sound}
                onChange={(v) => updatePref("sound", v)}
              />
            </SettingRow>
            {canUseDesktopNotifications() && (
              <SettingRow
                title="Desktop notifications"
                description="Show a notification when ChatLoop is in the background."
              >
                <Toggle
                  label="Desktop notifications"
                  checked={prefs.desktop}
                  onChange={(v) => updatePref("desktop", v)}
                />
              </SettingRow>
            )}
            <button
              onClick={playNotificationSound}
              className="mt-2 flex items-center gap-1.5 text-xs font-medium text-indigo-500 hover:text-indigo-600"
            >
              <FiVolume2 /> Test sound
            </button>
          </Section>

          <Section icon={FiLock} title="Security">
            {!usesPassword ? (
              <p className="text-sm text-gray-500">
                You signed in with Google or GitHub, so your password is managed there.
              </p>
            ) : changingPassword ? (
              <form onSubmit={changePassword} className="space-y-3">
                <FormField
                  type="password"
                  placeholder="Current password"
                  autoComplete="current-password"
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                />
                <FormField
                  type="password"
                  placeholder="New password"
                  autoComplete="new-password"
                  value={passwords.next}
                  onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
                />
                <FormField
                  type="password"
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setChangingPassword(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="btn-primary flex-1">
                    {saving ? "Updating..." : "Update password"}
                  </button>
                </div>
              </form>
            ) : (
              <SettingRow title="Password" description="Change the password you use to log in.">
                <button
                  onClick={() => setChangingPassword(true)}
                  className="btn-secondary px-4 py-2"
                >
                  Change
                </button>
              </SettingRow>
            )}
          </Section>

          <button onClick={logout} className="btn-secondary w-full text-red-600 hover:bg-red-50">
            <FiLogOut /> Log out
          </button>
        </div>
      </motion.div>
    </>
  );
};

export default SettingsPanel;
