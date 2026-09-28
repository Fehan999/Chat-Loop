import { useState } from "react";
import { FiInfo, FiX } from "react-icons/fi";
import { toDate } from "../../utils/dateUtils";

const DISMISS_KEY = "chatloop:announcement-dismissed";

const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
};

// set from the admin panel. dismissing hides this version only, a new
// announcement shows up again
const AnnouncementBanner = ({ announcement }) => {
  const [dismissed, setDismissed] = useState(readDismissed);
  if (!announcement?.active || !announcement.text?.trim()) return null;

  const version = String(toDate(announcement.updatedAt)?.getTime() || announcement.text);
  if (dismissed === version) return null;

  const dismiss = () => {
    setDismissed(version);
    try {
      localStorage.setItem(DISMISS_KEY, version);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-sm text-white">
      <FiInfo className="flex-shrink-0" />
      <p className="min-w-0 flex-1">{announcement.text}</p>
      <button onClick={dismiss} className="rounded-full p-1 hover:bg-white/15" aria-label="Dismiss">
        <FiX />
      </button>
    </div>
  );
};

export default AnnouncementBanner;
