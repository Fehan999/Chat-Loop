import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FiBell, FiX } from "react-icons/fi";
import { APP_NAME } from "../../constants";
import { markAnnouncementSeen } from "../../firebase/firestoreService";
import { announcementVersion } from "../../utils/announcement";
import { formatRelativeTime } from "../../utils/dateUtils";
import { playNotificationSound, showDesktopNotification } from "../../utils/notify";

const SEEN_KEY = "chatloop:announcement-seen";

const readSeen = () => {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
};

const saveSeen = (version) => {
  try {
    localStorage.setItem(SEEN_KEY, version);
  } catch {
    // private mode, the copy on the user doc still covers it
  }
};

// the admin's announcement drops in like a phone notification. it counts as seen
// the moment it shows, so each person gets it once (saved on their profile too,
// so it doesn't come back on another device)
const AnnouncementPopup = ({ announcement, seenVersion, userId }) => {
  const [shown, setShown] = useState(null);

  useEffect(() => {
    if (!announcement?.active || !announcement.text?.trim()) return;
    const version = announcementVersion(announcement);
    if (seenVersion === version || readSeen() === version) return;

    saveSeen(version);
    markAnnouncementSeen(userId, version);
    setShown({ ...announcement, version });
    playNotificationSound();
    showDesktopNotification(announcement.title?.trim() || APP_NAME, announcement.text.trim());
  }, [announcement, seenVersion, userId]);

  const close = () => setShown(null);

  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          key={shown.version}
          role="status"
          aria-live="polite"
          initial={{ y: -140, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -140, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.7, bottom: 0.05 }}
          onDragEnd={(_, info) => {
            if (info.offset.y < -40 || info.velocity.y < -300) close();
          }}
          className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[70] touch-pan-x sm:left-auto sm:right-5 sm:top-5 sm:w-[380px]"
        >
          <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/95 shadow-2xl shadow-indigo-950/20 ring-1 ring-black/5 backdrop-blur-xl">
            <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-600" />
            <div className="flex gap-3 p-4">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30">
                <FiBell />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  <span className="text-indigo-500">{APP_NAME}</span>
                  <span>·</span>
                  <span className="normal-case tracking-normal">
                    {formatRelativeTime(shown.updatedAt) || "now"}
                  </span>
                </div>
                <p className="mt-0.5 font-semibold text-gray-900">
                  {shown.title?.trim() || "Announcement"}
                </p>
                <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-gray-600">
                  {shown.text.trim()}
                </p>
                <button
                  onClick={close}
                  className="mt-3 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-600 transition hover:bg-indigo-100"
                >
                  Got it
                </button>
              </div>
              <button
                onClick={close}
                className="-mr-1 -mt-1 h-8 w-8 flex-shrink-0 rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                aria-label="Dismiss"
              >
                <FiX className="mx-auto" />
              </button>
            </div>
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-gray-200 sm:hidden" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AnnouncementPopup;
