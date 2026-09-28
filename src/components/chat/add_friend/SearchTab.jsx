import { getDocs } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { FiSearch, FiUsers } from "react-icons/fi";
import { usersCollection } from "../../../firebase/firestoreService";
import EmptyState from "./EmptyState";
import LoadingState from "./LoadingState";
import UserCard from "./UserCard";

// the user list is small enough to load once and filter in memory,
// which also lets people search by any part of a name
const SearchTab = ({ currentUserId, relationFor, handlers }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getDocs(usersCollection)
      .then((snapshot) => {
        if (cancelled) return;
        setAllUsers(
          snapshot.docs
            .filter((d) => d.id !== currentUserId && d.data().email && !d.data().banned)
            .map((d) => ({ id: d.id, ...d.data() }))
        );
      })
      .catch((error) => console.error("Error loading users:", error))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(searchTerm.trim()), 200);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const results = useMemo(() => {
    if (debounced.length < 2) return [];
    const term = debounced.toLowerCase().replace(/^@/, "");
    if (/^\d{4}$/.test(term)) return allUsers.filter((u) => u.uniqueId === term);
    return allUsers
      .filter(
        (u) =>
          u.name?.toLowerCase().includes(term) ||
          u.username?.toLowerCase().includes(term) ||
          u.email?.toLowerCase() === term
      )
      .slice(0, 30);
  }, [allUsers, debounced]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, username, email or 4-digit ID"
          className="input-field bg-white py-3.5 pl-11 shadow-sm"
          autoFocus
        />
      </div>

      {loading ? (
        <LoadingState />
      ) : debounced.length < 2 ? (
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50">
            <FiUsers className="text-2xl text-indigo-400" />
          </div>
          <h3 className="font-medium text-gray-900">Find your people</h3>
          <p className="mx-auto mt-1 max-w-xs text-sm text-gray-400">
            Type at least two letters, or someone&apos;s 4-digit ID from their profile.
          </p>
          <p className="mt-4 text-xs text-indigo-400">{allUsers.length} people on ChatLoop</p>
        </div>
      ) : results.length === 0 ? (
        <EmptyState searchTerm={debounced} />
      ) : (
        <div className="space-y-2">
          <p className="px-1 text-xs text-gray-400">
            {results.length} result{results.length === 1 ? "" : "s"}
          </p>
          {results.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              variant="search"
              relation={relationFor(user.id)}
              searchTerm={debounced.replace(/^@/, "")}
              handlers={handlers}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchTab;
