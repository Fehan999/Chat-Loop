import { FiAlertTriangle, FiMessageSquare, FiUserCheck, FiUsers } from "react-icons/fi";
import { formatRelativeTime } from "../../utils/dateUtils";
import { resolvePresence } from "../../utils/statusHelper";
import { avatarFor } from "../../utils/userDisplay";
import SignupsChart from "./SignupsChart";

// 1284 -> "1,284", 18934 -> "18.9K"
const compact = (value) => {
  if (value === null || value === undefined) return "—";
  if (value < 10000) return value.toLocaleString();
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(
    value
  );
};

const StatTile = ({ icon: Icon, label, value, hint }) => (
  <div className="card p-4">
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-500">{label}</p>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
        <Icon />
      </span>
    </div>
    <p className="mt-2 text-2xl font-semibold text-gray-900">{compact(value)}</p>
    {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
  </div>
);

const OverviewSection = ({ users, reports, counts, onOpen }) => {
  const online = users.filter((u) => resolvePresence(u).status === "online").length;
  const pending = reports.filter((r) => r.status === "pending");
  const newest = [...users]
    .filter((u) => u.createdAt)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={FiUsers} label="Total users" value={users.length} />
        <StatTile icon={FiUserCheck} label="Online now" value={online} />
        <StatTile
          icon={FiMessageSquare}
          label="Messages sent"
          value={counts.messages}
          hint={
            counts.conversations !== null ? `across ${compact(counts.conversations)} chats` : null
          }
        />
        <StatTile icon={FiAlertTriangle} label="Open reports" value={pending.length} />
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
                  <p className="truncate text-xs text-gray-400">{user.email}</p>
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
          <h3 className="text-sm font-semibold text-gray-900">Waiting for review</h3>
          <button
            onClick={() => onOpen("reports")}
            className="text-xs font-medium text-indigo-500 hover:text-indigo-600"
          >
            Open reports
          </button>
        </div>
        {pending.length === 0 ? (
          <p className="text-sm text-gray-400">Nothing to review. Nice.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {pending.slice(0, 4).map((report) => (
              <li key={report.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {report.type === "user" ? "User" : "Message"}
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
