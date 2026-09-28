// utils/dateUtils.js

/**
 * Format duration in seconds to MM:SS format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string (e.g., "05:23")
 */
export const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return "00:00";

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

/**
 * Format date to relative time (e.g., "2 minutes ago", "yesterday")
 * @param {Date|Timestamp} date - Date to format
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (date) => {
  if (!date) return "";

  const dateObj = date.toDate ? date.toDate() : new Date(date);
  const now = new Date();
  const diffMs = now - dateObj;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return "just now";
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  } else if (diffDays === 1) {
    return "yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return dateObj.toLocaleDateString();
  }
};

/**
 * Format date to time string (HH:MM AM/PM)
 * @param {Date|Timestamp} date - Date to format
 * @returns {string} Formatted time string
 */
export const formatTime = (date) => {
  if (!date) return "";

  const dateObj = date.toDate ? date.toDate() : new Date(date);
  return dateObj.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Format date to full date string (MMM DD, YYYY)
 * @param {Date|Timestamp} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return "";

  const dateObj = date.toDate ? date.toDate() : new Date(date);
  return dateObj.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

/**
 * Format date to datetime string (MMM DD, YYYY at HH:MM AM/PM)
 * @param {Date|Timestamp} date - Date to format
 * @returns {string} Formatted datetime string
 */
export const formatDateTime = (date) => {
  if (!date) return "";

  const dateObj = date.toDate ? date.toDate() : new Date(date);
  return `${formatDate(dateObj)} at ${formatTime(dateObj)}`;
};

/**
 * Get relative time for call duration display
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string with units
 */
export const formatCallDuration = (seconds) => {
  if (!seconds || seconds < 0) return "0:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }
};

/**
 * Get time ago string with more detail
 * @param {Date|Timestamp} date - Date to format
 * @returns {string} Detailed time ago string
 */
export const getTimeAgo = (date) => {
  if (!date) return "";

  const dateObj = date.toDate ? date.toDate() : new Date(date);
  const now = new Date();
  const diffMs = now - dateObj;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) {
    return `${diffSecs} second${diffSecs === 1 ? "" : "s"} ago`;
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  } else if (diffDays === 1) {
    return "yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffWeeks === 1) {
    return "last week";
  } else if (diffWeeks < 4) {
    return `${diffWeeks} weeks ago`;
  } else if (diffMonths === 1) {
    return "last month";
  } else if (diffMonths < 12) {
    return `${diffMonths} months ago`;
  } else if (diffYears === 1) {
    return "last year";
  } else {
    return `${diffYears} years ago`;
  }
};

/**
 * Check if a date is today
 * @param {Date|Timestamp} date - Date to check
 * @returns {boolean} True if date is today
 */
export const isToday = (date) => {
  if (!date) return false;

  const dateObj = date.toDate ? date.toDate() : new Date(date);
  const today = new Date();
  return dateObj.toDateString() === today.toDateString();
};

/**
 * Check if a date is yesterday
 * @param {Date|Timestamp} date - Date to check
 * @returns {boolean} True if date is yesterday
 */
export const isYesterday = (date) => {
  if (!date) return false;

  const dateObj = date.toDate ? date.toDate() : new Date(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return dateObj.toDateString() === yesterday.toDateString();
};

/**
 * Get message timestamp display
 * @param {Date|Timestamp} timestamp - Message timestamp
 * @returns {string} Formatted timestamp for message display
 */
export const getMessageTimestamp = (timestamp) => {
  if (!timestamp) return "";

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

  if (isToday(date)) {
    return formatTime(date);
  } else if (isYesterday(date)) {
    return `Yesterday, ${formatTime(date)}`;
  } else {
    return formatDateTime(date);
  }
};

/**
 * Group messages by date
 * @param {Array} messages - Array of message objects
 * @returns {Object} Messages grouped by date
 */
export const groupMessagesByDate = (messages) => {
  const groups = {};

  messages.forEach((message) => {
    const date = message.timestamp?.toDate?.() || new Date(message.timestamp);
    const dateKey = date.toDateString();

    if (!groups[dateKey]) {
      groups[dateKey] = {
        date: date,
        messages: [],
      };
    }

    groups[dateKey].messages.push(message);
  });

  return groups;
};

/**
 * Get header for date group
 * @param {Date} date - Date to get header for
 * @returns {string} Date header string
 */
export const getDateGroupHeader = (date) => {
  if (isToday(date)) {
    return "Today";
  } else if (isYesterday(date)) {
    return "Yesterday";
  } else {
    return formatDate(date);
  }
};
