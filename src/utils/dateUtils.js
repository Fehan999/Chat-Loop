// timestamps come back as firestore Timestamps, ISO strings or plain Dates
// depending on where they were written, so everything goes through here first
export const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const pad = (n) => n.toString().padStart(2, "0");

// 83 -> "1:23", used by voice notes and calls
export const formatDuration = (seconds) => {
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours > 0 ? `${hours}:${pad(mins)}:${pad(secs)}` : `${mins}:${pad(secs)}`;
};

export const isToday = (value) => {
  const date = toDate(value);
  return !!date && date.toDateString() === new Date().toDateString();
};

export const isYesterday = (value) => {
  const date = toDate(value);
  if (!date) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
};

export const formatTime = (value) => {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export const formatDate = (value) => {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const formatMonthYear = (value) => {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleDateString([], { month: "long", year: "numeric" });
};

// sidebar style: time for today, "Yesterday", weekday for this week, then a date
export const formatChatListTime = (value) => {
  const date = toDate(value);
  if (!date || date.getTime() === 0) return "";
  if (isToday(date)) return formatTime(date);
  if (isYesterday(date)) return "Yesterday";
  const daysAgo = (Date.now() - date.getTime()) / 86400000;
  if (daysAgo < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
};

export const formatRelativeTime = (value) => {
  const date = toDate(value);
  if (!date) return "";
  const diffSecs = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  const mins = Math.floor(diffSecs / 60);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (diffSecs < 60) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(date);
};

export const getDateGroupHeader = (value) => {
  if (isToday(value)) return "Today";
  if (isYesterday(value)) return "Yesterday";
  return formatDate(value);
};
