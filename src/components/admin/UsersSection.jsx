import { AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiLock,
  FiRotateCcw,
  FiSearch,
  FiSlash,
} from "react-icons/fi";
import { formatDate, formatRelativeTime } from "../../utils/dateUtils";
import { adminPresence, getStatusDotClass } from "../../utils/statusHelper";
import { maskEmail } from "../../firebase/adminService";
import { avatarFor, formatUsername } from "../../utils/userDisplay";
import FormField from "../auth/FormField";
import Modal from "../common/Modal";
import Toggle from "../common/Toggle";

const PAGE_SIZE = 12;
const FILTERS = [
  { id: "all", label: "All" },
  { id: "online", label: "Online" },
  { id: "banned", label: "Banned" },
];

// details + edit form. the guest can open it to look around, saving is admin only
const EditUserModal = ({ user, canEdit, lockedMessage, onSave, onUnsuspend, onClose }) => {
  const [form, setForm] = useState({
    name: user.name || "",
    bio: user.bio || "",
    location: user.location || "",
    banned: !!user.banned,
    banReason: user.banReason || "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const ok = await onSave(user, form);
    setSaving(false);
    if (ok) onClose();
  };

  const unsuspend = async () => {
    setSaving(true);
    const ok = await onUnsuspend(user);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal title="User details" onClose={onClose} maxWidth="max-w-lg">
      <div className="mb-5 flex items-center gap-3">
        <img src={avatarFor(user)} alt="" className="h-14 w-14 rounded-full object-cover" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-900">{user.name}</p>
          <p className="truncate text-sm text-gray-500">
            {canEdit ? user.email : maskEmail(user.email)}
          </p>
          <p className="text-xs text-gray-400">
            {formatUsername(user.username)} · ID {user.uniqueId || "----"}
          </p>
        </div>
      </div>

      {user.banned && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-red-100 bg-red-50 p-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1 text-sm">
            <p className="flex items-center gap-1.5 font-medium text-red-700">
              <FiSlash /> Suspended
              {user.bannedAt && (
                <span className="font-normal text-red-500">
                  · {formatRelativeTime(user.bannedAt)}
                </span>
              )}
            </p>
            {user.banReason && <p className="mt-0.5 text-red-600">{user.banReason}</p>}
          </div>
          <button
            onClick={unsuspend}
            disabled={saving}
            className="btn-secondary whitespace-nowrap bg-white px-3 py-2 text-emerald-700 hover:bg-emerald-50"
          >
            {canEdit ? <FiRotateCcw /> : <FiLock />} Unsuspend
          </button>
        </div>
      )}

      <fieldset disabled={!canEdit} className="space-y-3">
        <label className="block text-xs font-medium text-gray-500">
          Name
          <FormField
            className="mt-1"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="block text-xs font-medium text-gray-500">
          Bio
          <textarea
            rows={2}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            className="input-field mt-1 resize-none"
          />
        </label>
        <label className="block text-xs font-medium text-gray-500">
          Location
          <FormField
            className="mt-1"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </label>

        <div className="rounded-xl border border-red-100 bg-red-50/50 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Suspend account</p>
              <p className="text-xs text-gray-500">
                They&apos;ll see a suspended screen next time they open the app.
              </p>
            </div>
            <Toggle
              label="Suspend account"
              checked={form.banned}
              disabled={!canEdit}
              onChange={(banned) => setForm({ ...form, banned })}
            />
          </div>
          {form.banned && (
            <FormField
              className="mt-3"
              placeholder="Reason shown to the user"
              value={form.banReason}
              onChange={(e) => setForm({ ...form, banReason: e.target.value })}
            />
          )}
        </div>
      </fieldset>

      {!canEdit && (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
          <FiLock /> {lockedMessage}
        </p>
      )}

      <div className="mt-5 flex gap-3">
        <button onClick={onClose} className="btn-secondary flex-1 py-2.5">
          Close
        </button>
        <button onClick={save} disabled={saving} className="btn-primary flex-1 py-2.5">
          {canEdit ? (
            saving ? (
              "Saving..."
            ) : (
              "Save changes"
            )
          ) : (
            <>
              <FiLock /> Read only
            </>
          )}
        </button>
      </div>
    </Modal>
  );
};

const UsersSection = ({ users, canEdit, lockedMessage, onSaveUser, onUnsuspend }) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users
      .filter((u) => {
        if (filter === "online" && adminPresence(u).status !== "online") return false;
        if (filter === "banned" && !u.banned) return false;
        if (!term) return true;
        // the guest only sees masked emails, so it can't search by them either
        const fields = [u.name, u.username, u.uniqueId, canEdit ? u.email : null];
        return fields.some((v) => v?.toLowerCase().includes(term));
      })
      .sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
  }, [users, search, filter, canEdit]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder={
              canEdit ? "Search name, email, username or ID" : "Search name, username or ID"
            }
            className="input-field py-2.5 pl-10"
          />
        </div>
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setFilter(item.id);
                setPage(0);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                filter === item.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* phones get a simple list, the table needs more width than a phone has */}
      <ul className="divide-y divide-gray-100 sm:hidden">
        {rows.map((user) => {
          const presence = adminPresence(user);
          return (
            <li key={user.id} className="flex items-center gap-3 px-4 py-3">
              <div className="relative flex-shrink-0">
                <img src={avatarFor(user)} alt="" className="h-10 w-10 rounded-full object-cover" />
                <span
                  className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${getStatusDotClass(presence.status)}`}
                />
              </div>
              <button onClick={() => setEditing(user)} className="min-w-0 flex-1 text-left">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium text-gray-900">
                  <span className="truncate">{user.name}</span>
                  {user.banned && <FiSlash className="flex-shrink-0 text-red-500" size={12} />}
                </p>
                <p className="truncate text-xs text-gray-400">
                  {canEdit ? user.email : maskEmail(user.email)}
                </p>
                <p className="text-xs text-gray-400">
                  ID {user.uniqueId || "—"} · {user.friends?.length || 0} friends
                </p>
              </button>
              {user.banned ? (
                <button
                  onClick={() => onUnsuspend(user)}
                  className="flex-shrink-0 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700"
                >
                  Unsuspend
                </button>
              ) : (
                <button
                  onClick={() => setEditing(user)}
                  className="icon-btn flex-shrink-0"
                  aria-label="View / edit"
                >
                  <FiEdit2 />
                </button>
              )}
            </li>
          );
        })}
        {rows.length === 0 && (
          <li className="px-4 py-10 text-center text-sm text-gray-400">No users match that.</li>
        )}
      </ul>

      <div className="thin-scroll hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Friends</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((user) => {
              const presence = adminPresence(user);
              return (
                <tr key={user.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={avatarFor(user)}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate font-medium text-gray-900">
                          {user.name}
                          {user.banned && (
                            <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">
                              <FiSlash size={10} /> Banned
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-gray-400">
                          {canEdit ? user.email : maskEmail(user.email)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-gray-600">{user.uniqueId || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 text-gray-600">
                      <span
                        className={`h-2 w-2 rounded-full ${getStatusDotClass(presence.status)}`}
                      />
                      {presence.status === "offline" && presence.lastSeen
                        ? formatRelativeTime(presence.lastSeen)
                        : presence.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-gray-600">
                    {user.friends?.length || 0}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(user.createdAt) || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {user.banned && (
                      <button
                        onClick={() => onUnsuspend(user)}
                        className="mr-1 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                        title="Unsuspend"
                      >
                        {canEdit ? <FiRotateCcw /> : <FiLock />} Unsuspend
                      </button>
                    )}
                    <button
                      onClick={() => setEditing(user)}
                      className="icon-btn"
                      title="View / edit"
                    >
                      <FiEdit2 />
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                  No users match that.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-500">
        <span>
          {filtered.length} user{filtered.length === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage === 0}
            className="icon-btn"
          >
            <FiChevronLeft />
          </button>
          <span className="tabular-nums">
            {currentPage + 1} / {pageCount}
          </span>
          <button
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage >= pageCount - 1}
            className="icon-btn"
          >
            <FiChevronRight />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {editing && (
          <EditUserModal
            user={editing}
            canEdit={canEdit}
            lockedMessage={lockedMessage}
            onSave={onSaveUser}
            onUnsuspend={onUnsuspend}
            onClose={() => setEditing(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default UsersSection;
