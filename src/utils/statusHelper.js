import { formatRelativeTime, toDate } from "./dateUtils";

// if a tab gets killed without the "offline" write going through, the heartbeat
// stops. after this long we stop trusting the stored status
const STALE_AFTER_MS = 5 * 60 * 1000;

// turns a raw user doc into what other people are allowed to see
export const resolvePresence = (profile) => {
  if (!profile || profile.showActiveStatus === false) {
    return { status: "offline", lastSeen: null };
  }

  const lastSeen = toDate(profile.lastSeen);
  let status = profile.status || "offline";
  const isStale = lastSeen && Date.now() - lastSeen.getTime() > STALE_AFTER_MS;
  if (status !== "offline" && isStale) status = "offline";

  return { status, lastSeen };
};

// the admin panel shows real presence, even for people who hide it from friends
export const adminPresence = (profile) =>
  resolvePresence(profile ? { ...profile, showActiveStatus: true } : profile);

export const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return "a while ago";
  return formatRelativeTime(lastSeen);
};

export const getStatusText = (status, lastSeen) => {
  if (status === "online") return "Active now";
  if (status === "away") return "Away";
  if (lastSeen) return `Last seen ${formatLastSeen(lastSeen)}`;
  return "Offline";
};

export const getExactTime = (lastSeen) => {
  const date = toDate(lastSeen);
  return date ? date.toLocaleString() : "Never";
};

export const getStatusDotClass = (status) => {
  switch (status) {
    case "online":
      return "bg-emerald-500";
    case "away":
      return "bg-amber-400";
    default:
      return "bg-gray-300";
  }
};
