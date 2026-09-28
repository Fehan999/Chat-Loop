export const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return "Offline";

  const now = new Date();
  const diffMs = now - lastSeen;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
  }

  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  }

  if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  }

  if (diffWeeks < 4) {
    return `${diffWeeks} week${diffWeeks !== 1 ? "s" : ""} ago`;
  }

  if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths !== 1 ? "s" : ""} ago`;
  }

  return `${diffYears} year${diffYears !== 1 ? "s" : ""} ago`;
};

export const getStatusColor = (status) => {
  switch (status) {
    case "online":
      return "bg-green-500";
    case "away":
      return "bg-yellow-500";
    case "offline":
      return "bg-gray-400";
    default:
      return "bg-gray-400";
  }
};

export const getStatusText = (status, lastSeen) => {
  if (status === "online") return "Active now";
  if (status === "away") return "Away";
  if (lastSeen) return `Last seen ${formatLastSeen(lastSeen)}`;
  return "Offline";
};

export const getExactTime = (lastSeen) => {
  if (!lastSeen) return "Never";
  return lastSeen.toLocaleString();
};

export const getStatusDotClass = (status) => {
  switch (status) {
    case "online":
      return "bg-green-500 animate-pulse";
    case "away":
      return "bg-yellow-500";
    case "offline":
      return "bg-gray-400";
    default:
      return "bg-gray-400";
  }
};
