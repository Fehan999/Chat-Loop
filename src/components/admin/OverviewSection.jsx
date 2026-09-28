import {
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiHeart,
  FiMessageCircle,
  FiMessageSquare,
  FiSlash,
  FiUserCheck,
  FiUserPlus,
  FiUsers,
} from "react-icons/fi";
import { maskEmail } from "../../firebase/adminService";
import { formatRelativeTime } from "../../utils/dateUtils";
import { adminPresence } from "../../utils/statusHelper";
import { avatarFor } from "../../utils/userDisplay";
import SignupsChart from "./SignupsChart";

const DAY_MS = 24 * 60 * 60 * 1000;

// 1284 -> "1,284", 18934 -> "18.9K"
const compact = (value) => {
  if (value === null || value === undefined) return "—";
  if (value < 10000) return value.toLocaleString();
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(
    value
  );
};

const StatTile = ({ icon: Icon, label, value, hint, tone = "indigo" }) => (
  <div className="card p-4">
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm text-gray-500">{label}</p>
      <span
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
          tone === "red"
            ? "bg-red-50 text-red-500"
            : tone === "amber"
              ? "bg-amber-50 text-amber-600"
              : tone === "emerald"
                ? "bg-emerald-50 text-emerald-600"
                : "bg-indigo-50 text-indigo-500"
        }`}
      >
        <Icon />
      </span>
    </div>
    <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-900">{compact(value)}</p>
    {hint && <p className="mt-0.5 truncate text-xs text-gray-400">{hint}</p>}
  </div>
);

// everything here is worked out from the live users/reports listeners, plus the
// chat and message counts from firestore's count queries
const buildStats = (users, reports) => {
  const now = Date.now();
  const within = (date, ms) => !!date && now - date.getTime() < ms;

  let online = 0;
  let activeToday = 0;
  let newToday = 0;
  let newThisWeek = 0;
  let suspended = 0;
  let friendLinks = 0;

  users.forEach((user) => {
    const { status, lastSeen } = adminPresence(user);
    if (status === "online") online += 1;
    if (status !== "offline" || within(lastSeen, DAY_MS)) activeToday += 1;
    if (within(user.createdAt, DAY_MS)) newToday += 1;
    if (within(user.createdAt, 7 * DAY_MS)) newThisWeek += 1;
    if (user.banned) suspended += 1;
    friendLinks += user.friends?.length || 0;
  });

  const statusOf = (r) => r.status || "pending";
  return {
    online,
    activeToday,
    newToday,
    newThisWeek,
    suspended,
    // every friendship is stored on both people
    friendships: Math.round(friendLinks / 2),
    pending: reports.filter((r) => statusOf(r) === "pending"),
    resolved: reports.filter((r) => statusOf(r) === "resolved").length,
    reportsThisWeek: reports.filter((r) => within(r.createdAt, 7 * DAY_MS)).length,
  };
};

const OverviewSection = ({ users, reports, counts, canEdit, onOpen }) => {
  const stats = buildStats(users, reports);
  const newest = [...users]
    .filter((u) => u.createdAt)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);
  const countsHint = counts.updatedAt
    ? `counted ${formatRelativeTime(counts.updatedAt)}`
    : "waiting for the first count";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={FiUsers}
          label="Total users"
          value={users.length}
          hint={`${stats.newThisWeek} joined this week`}
        />
        <StatTile
          icon={FiUserCheck}
          label="Online now"
          value={stats.online}
          tone="emerald"
          hint={`${stats.activeToday} active in the last 24h`}
        />
        <StatTile
          icon={FiMessageSquare}
          label="Messages sent"
          value={counts.messages}
          hint={counts.aiMessages ? `+${compact(counts.aiMessages)} with ChatLoop AI` : countsHint}
        />
        <StatTile
          icon={FiMessageCircle}
          label="Conversations"
          value={counts.conversations}
          hint={countsHint}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={FiUserPlus}
          label="New today"
          value={stats.newToday}
          hint="sign-ups in the last 24h"
        />
        <StatTile
          icon={FiHeart}
          label="Friendships"
          value={stats.friendships}
          hint="accepted friend requests"
        />
        <StatTile
          icon={FiAlertTriangle}
          label="Open reports"
          value={stats.pending.length}
          tone="amber"
          hint={`${stats.reportsThisWeek} reported this week`}
        />
        <StatTile
          icon={FiSlash}
          label="Suspended"
          value={stats.suspended}
          tone="red"
          hint={`${stats.resolved} report${stats.resolved === 1 ? "" : "s"} resolved`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="card p-5 lg:col-span-3">
          <SignupsChart users={users} />
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Newest members</h3>
            <button
              onClick={() => onOpen("users")}
              className="text-xs font-medium text-indigo-500 hover:text-indigo-600"
            >
              View all
            </button>
          </div>
          <ul className="space-y-3">
            {newest.map((user) => (
              <li key={user.id} className="flex items-center gap-3">
                <img src={avatarFor(user)} alt="" className="h-9 w-9 rounded-full object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="truncate text-xs text-gray-400">
                    {canEdit ? user.email : maskEmail(user.email)}
                  </p>
                </div>
                <span className="text-xs text-gray-400">{formatRelativeTime(user.createdAt)}</span>
              </li>
            ))}
            {newest.length === 0 && <li className="text-sm text-gray-400">No one yet.</li>}
          </ul>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <FiActivity className="text-indigo-500" /> Waiting for review
          </h3>
          <button
            onClick={() => onOpen("reports")}
            className="text-xs font-medium text-indigo-500 hover:text-indigo-600"
          >
            Open reports
          </button>
        </div>
        {stats.pending.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-gray-400">
            <FiCheckCircle className="text-emerald-500" /> Nothing to review.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {stats.pending.slice(0, 5).map((report) => (
              <li key={report.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {report.type === "user" ? (report.messageId ? "User" : "Account") : "Message"}
                </span>
                <span className="min-w-0 flex-1 truncate text-gray-700">{report.reason}</span>
                <span className="text-xs text-gray-400">
                  {formatRelativeTime(report.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default OverviewSection;
