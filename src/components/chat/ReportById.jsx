import { useState } from "react";
import toast from "react-hot-toast";
import { FiFlag, FiHash, FiSearch } from "react-icons/fi";
import { findUsersByUniqueId } from "../../firebase/firestoreService";
import { avatarFor, displayName, formatUsername } from "../../utils/userDisplay";

// for reporting someone you don't have a chat with. find them by their 4 digit
// id and the whole account goes to the team for review
const ReportById = ({ currentUserId, onReport }) => {
  const [id, setId] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const search = async (e) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(id.trim())) {
      toast.error("IDs are 4 digits, like 1234.");
      return;
    }
    setSearching(true);
    try {
      setResults(await findUsersByUniqueId(id, currentUserId));
    } catch (error) {
      console.error(error);
      toast.error("Couldn't search right now, try again.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        Someone bothering you outside your chats? Enter their ID and our team will review the
        account. To report something they said, use Report in that chat instead.
      </p>
      <form onSubmit={search} className="flex gap-2">
        <div className="relative flex-1">
          <FiHash className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={id}
            onChange={(e) => {
              setId(e.target.value.replace(/\D/g, "").slice(0, 4));
              setResults(null);
            }}
            inputMode="numeric"
            placeholder="4 digit ID"
            aria-label="User ID"
            className="input-field py-2.5 pl-10 tabular-nums"
          />
        </div>
        <button type="submit" disabled={searching} className="btn-secondary px-4 py-2">
          <FiSearch /> {searching ? "..." : "Find"}
        </button>
      </form>

      {results && results.length === 0 && (
        <p className="rounded-xl bg-gray-50 p-3 text-center text-sm text-gray-500">
          No one has that ID.
        </p>
      )}

      {results?.map((person) => (
        <div
          key={person.id}
          className="flex items-center gap-3 rounded-xl border border-gray-100 p-3"
        >
          <img src={avatarFor(person)} alt="" className="h-10 w-10 rounded-full object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{displayName(person)}</p>
            <p className="truncate text-xs text-gray-500">
              {formatUsername(person.username)} · ID {person.uniqueId}
            </p>
          </div>
          <button
            onClick={() =>
              onReport({
                userId: person.id,
                name: displayName(person),
                avatar: avatarFor(person),
                profile: person,
              })
            }
            className="btn-secondary px-3 py-2 text-red-600 hover:bg-red-50"
          >
            <FiFlag /> Report
          </button>
        </div>
      ))}
    </div>
  );
};

export default ReportById;
