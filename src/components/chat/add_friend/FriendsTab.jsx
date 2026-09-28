import { useState } from "react";
import { FiSearch, FiUsers } from "react-icons/fi";
import { useLiveProfiles } from "../../../hooks/useLiveProfiles";
import LoadingState from "./LoadingState";
import UserCard from "./UserCard";

const FriendsTab = ({ friendIds, handlers }) => {
  const [filter, setFilter] = useState("");
  const profiles = useLiveProfiles(friendIds);
  const loaded = friendIds.every((id) => id in profiles);

  const friends = friendIds
    .map((id) => profiles[id] && { ...profiles[id], id })
    .filter(Boolean)
    .filter((f) => !filter || f.name?.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  if (friendIds.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50">
          <FiUsers className="text-2xl text-indigo-400" />
        </div>
        <h3 className="font-medium text-gray-900">No friends yet</h3>
        <p className="mt-1 text-sm text-gray-400">Head to Discover to find people you know.</p>
      </div>
    );
  }

  if (!loaded) return <LoadingState />;

  return (
    <div className="space-y-2">
      {friendIds.length > 6 && (
        <div className="relative mb-3">
          <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter friends"
            className="input-field bg-white pl-11"
          />
        </div>
      )}
      <p className="px-1 text-xs text-gray-400">
        {friendIds.length} friend{friendIds.length === 1 ? "" : "s"}
      </p>
      {friends.map((friend) => (
        <UserCard key={friend.id} user={friend} variant="friend" handlers={handlers} />
      ))}
    </div>
  );
};

export default FriendsTab;
