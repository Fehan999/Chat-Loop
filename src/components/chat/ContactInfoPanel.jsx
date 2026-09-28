import { motion } from "framer-motion";
import { FiCalendar, FiFlag, FiMapPin, FiTrash2, FiX } from "react-icons/fi";
import { formatMonthYear } from "../../utils/dateUtils";
import { getStatusText } from "../../utils/statusHelper";

// right hand panel with the other person's profile and the photos you've shared
const ContactInfoPanel = ({
  chat,
  messages,
  onClose,
  onReport,
  onDeleteConversation,
  isMobile,
}) => {
  const profile = chat.profile || {};
  const photos = messages
    .filter((m) => !m.deleted)
    .flatMap((m) => (m.attachments || []).filter((f) => f.type?.startsWith("image/")))
    .reverse()
    .slice(0, 9);

  return (
    <motion.aside
      initial={isMobile ? { x: "100%" } : { opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={isMobile ? { x: "100%" } : { opacity: 0, x: 24 }}
      transition={{ type: "spring", damping: 30, stiffness: 320 }}
      className={`thin-scroll flex flex-col overflow-y-auto border-l border-gray-100 bg-white ${
        isMobile ? "fixed inset-0 z-40" : "w-80 flex-shrink-0"
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Contact info</h3>
        <button onClick={onClose} className="icon-btn" aria-label="Close">
          <FiX />
        </button>
      </div>

      <div className="flex flex-col items-center px-6 pb-6 text-center">
        <img
          src={chat.avatar}
          alt=""
          className="h-24 w-24 rounded-full object-cover ring-4 ring-indigo-50"
        />
        <h4 className="mt-3 text-lg font-semibold text-gray-900">{chat.name}</h4>
        <p className="text-sm text-gray-500">{chat.username}</p>
        {chat.suspended ? (
          <p className="mt-1 text-xs font-medium text-red-500">Account suspended</p>
        ) : (
          <p
            className={`mt-1 text-xs ${chat.status === "online" ? "text-emerald-600" : "text-gray-400"}`}
          >
            {getStatusText(chat.status, chat.lastSeen)}
          </p>
        )}
        {profile.uniqueId && (
          <span className="mt-3 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600">
            ID {profile.uniqueId}
          </span>
        )}
      </div>

      <div className="space-y-4 border-t border-gray-100 px-5 py-5 text-sm">
        {profile.bio && <p className="text-gray-700">{profile.bio}</p>}
        {profile.location && (
          <p className="flex items-center gap-2 text-gray-600">
            <FiMapPin className="text-gray-400" /> {profile.location}
          </p>
        )}
        {profile.createdAt && (
          <p className="flex items-center gap-2 text-gray-600">
            <FiCalendar className="text-gray-400" /> Joined {formatMonthYear(profile.createdAt)}
          </p>
        )}
      </div>

      {photos.length > 0 && (
        <div className="border-t border-gray-100 px-5 py-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Shared photos
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {photos.map((photo) => (
              <a key={photo.url} href={photo.url} target="_blank" rel="noopener noreferrer">
                <img
                  src={photo.url}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full rounded-lg object-cover"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto space-y-1 border-t border-gray-100 p-3">
        <button
          onClick={onReport}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          <FiFlag className="text-red-500" /> Report {chat.name.split(" ")[0]}
        </button>
        <button
          onClick={onDeleteConversation}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-600 hover:bg-red-50"
        >
          <FiTrash2 /> Delete conversation
        </button>
      </div>
    </motion.aside>
  );
};

export default ContactInfoPanel;
