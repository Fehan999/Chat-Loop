import { useState } from "react";
import { FiCheck, FiLock, FiMessageSquare, FiSlash, FiTrash2, FiUser, FiX } from "react-icons/fi";
import { formatRelativeTime } from "../../utils/dateUtils";

const TABS = [
  { id: "pending", label: "Pending" },
  { id: "resolved", label: "Resolved" },
  { id: "dismissed", label: "Dismissed" },
  { id: "all", label: "All" },
];

const STATUS_STYLE = {
  pending: "bg-amber-50 text-amber-700",
  resolved: "bg-emerald-50 text-emerald-700",
  dismissed: "bg-gray-100 text-gray-500",
};

const ReportsSection = ({ reports, users, canEdit, actions }) => {
  const [tab, setTab] = useState("pending");
  const [busy, setBusy] = useState(null);
  const nameOf = (id) => users.find((u) => u.id === id)?.name;

  const visible = reports.filter((r) => tab === "all" || (r.status || "pending") === tab);

  const run = (key, fn) => async () => {
    setBusy(key);
    await fn();
    setBusy(null);
  };

  const lockIcon = !canEdit && <FiLock className="text-xs" />;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-sm">
        {TABS.map((item) => {
          const count =
            item.id === "all"
              ? reports.length
              : reports.filter((r) => (r.status || "pending") === item.id).length;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                tab === item.id
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {item.label}
              <span className="rounded-full bg-white px-1.5 text-xs tabular-nums text-gray-500">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 && (
        <div className="card p-10 text-center text-sm text-gray-400">No reports here.</div>
      )}

      {visible.map((report) => {
        const status = report.status || "pending";
        const reportedName =
          report.reportedUserName || nameOf(report.reportedUserId) || "Unknown user";
        const reporterName = nameOf(report.reportedBy) || "someone";
        const reportedUser = users.find((u) => u.id === report.reportedUserId);

        return (
          <div key={report.id} className="card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600">
                {report.type === "user" ? <FiUser /> : <FiMessageSquare />}
                {report.type === "user" ? "User" : "Message"}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLE[status] || STATUS_STYLE.pending}`}
              >
                {status}
              </span>
              <span className="ml-auto text-xs text-gray-400">
                {formatRelativeTime(report.createdAt)}
              </span>
            </div>

            <p className="mt-3 font-medium text-gray-900">{report.reason}</p>
            <p className="mt-1 text-sm text-gray-500">
              <span className="font-medium text-gray-700">{reportedName}</span> reported by{" "}
              {reporterName}
            </p>
            {report.messageText && (
              <blockquote className="mt-3 rounded-xl border-l-4 border-indigo-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {report.messageText}
              </blockquote>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {status === "pending" && (
                <>
                  <button
                    onClick={run(`${report.id}-resolve`, () =>
                      actions.setStatus(report, "resolved")
                    )}
                    disabled={!!busy}
                    className="btn-primary px-3 py-2"
                  >
                    {lockIcon || <FiCheck />} Mark resolved
                  </button>
                  <button
                    onClick={run(`${report.id}-dismiss`, () =>
                      actions.setStatus(report, "dismissed")
                    )}
                    disabled={!!busy}
                    className="btn-secondary px-3 py-2"
                  >
                    {lockIcon || <FiX />} Dismiss
                  </button>
                </>
              )}
              {status !== "pending" && (
                <button
                  onClick={run(`${report.id}-reopen`, () => actions.setStatus(report, "pending"))}
                  disabled={!!busy}
                  className="btn-secondary px-3 py-2"
                >
                  {lockIcon} Reopen
                </button>
              )}
              {report.type === "message" && report.chatId && report.messageId && (
                <button
                  onClick={run(`${report.id}-remove`, () => actions.removeMessage(report))}
                  disabled={!!busy}
                  className="btn-secondary px-3 py-2 text-red-600 hover:bg-red-50"
                >
                  {lockIcon || <FiTrash2 />} Remove message
                </button>
              )}
              {reportedUser && !reportedUser.banned && (
                <button
                  onClick={run(`${report.id}-ban`, () =>
                    actions.banUser(reportedUser, report.reason)
                  )}
                  disabled={!!busy}
                  className="btn-secondary px-3 py-2 text-red-600 hover:bg-red-50"
                >
                  {lockIcon || <FiSlash />} Suspend user
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ReportsSection;
