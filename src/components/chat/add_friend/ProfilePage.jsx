import { useEffect, useState } from "react";
import {
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiClock,
  FiMapPin,
  FiMessageCircle,
  FiUserPlus,
  FiX,
} from "react-icons/fi";
import { getUserData, listenToUser } from "../../../firebase/firestoreService";
import { formatMonthYear } from "../../../utils/dateUtils";
import { getStatusText, resolvePresence } from "../../../utils/statusHelper";
import { avatarFor, formatUsername } from "../../../utils/userDisplay";

// full profile of someone from search or the request lists
const ProfilePage = ({ userId, currentUserId, relation, handlers, onBack }) => {
  const [user, setUser] = useState(undefined);
  const [mutualFriends, setMutualFriends] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => listenToUser(userId, setUser), [userId]);

  // mutual friends are just the overlap of both friend lists
  const theirFriends = user?.friends;
  useEffect(() => {
    if (!theirFriends?.length) {
      setMutualFriends([]);
      return;
    }
    let cancelled = false;
    getUserData(currentUserId).then(async (me) => {
      const mutualIds = (me?.friends || []).filter((id) => theirFriends.includes(id)).slice(0, 8);
      const people = await Promise.all(mutualIds.map(getUserData));
      if (!cancelled) setMutualFriends(people.filter(Boolean));
    });
    return () => {
      cancelled = true;
    };
  }, [currentUserId, theirFriends]);

  const run = (fn) => async () => {
    setBusy(true);
    await fn(userId);
    setBusy(false);
  };

  if (user === undefined) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-gray-50">
        <p className="text-gray-500">This profile doesn&apos;t exist anymore.</p>
        <button onClick={onBack} className="btn-secondary px-4 py-2">
          Go back
        </button>
      </div>
    );
  }

  const presence = resolvePresence(user);

  const actions = {
    friend: (
      <button onClick={() => handlers.message(userId)} className="btn-primary flex-1">
        <FiMessageCircle /> Message
      </button>
    ),
    sent: (
      <>
        <button disabled className="btn-secondary flex-1">
          <FiClock /> Request sent
        </button>
        <button onClick={run(handlers.cancel)} disabled={busy} className="btn-secondary">
          <FiX /> Cancel
        </button>
      </>
    ),
    received: (
      <>
        <button onClick={run(handlers.accept)} disabled={busy} className="btn-primary flex-1">
          <FiCheck /> Accept request
        </button>
        <button onClick={run(handlers.decline)} disabled={busy} className="btn-secondary">
          Decline
        </button>
      </>
    ),
    none: (
      <button onClick={run(handlers.send)} disabled={busy} className="btn-primary flex-1">
        <FiUserPlus /> Add friend
      </button>
    ),
  };

  return (
    <div className="thin-scroll h-full overflow-y-auto bg-gray-50">
      <div className="h-36 bg-gradient-to-br from-indigo-500 to-violet-600">
        <button
          onClick={onBack}
          className="m-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          aria-label="Back"
        >
          <FiArrowLeft className="text-xl" />
        </button>
      </div>

      <div className="mx-auto -mt-14 max-w-xl px-4 pb-10">
        <div className="card p-6 text-center">
          <div className="relative mx-auto -mt-16 mb-3 w-fit">
            <img
              src={avatarFor(user)}
              alt=""
              className="h-28 w-28 rounded-full object-cover ring-4 ring-white"
            />
            {presence.status === "online" && (
              <span className="absolute bottom-2 right-2 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
          <p className="text-gray-500">{formatUsername(user.username)}</p>
          <p className="mt-1 text-xs text-gray-400">
            {getStatusText(presence.status, presence.lastSeen)}
          </p>

          <div className="mt-4 flex justify-center gap-2 text-xs">
            {user.uniqueId && (
              <span className="rounded-full bg-indigo-50 px-3 py-1 font-medium text-indigo-600">
                ID {user.uniqueId}
              </span>
            )}
            <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">
              {user.friends?.length || 0} friends
            </span>
          </div>

          <div className="mt-6 flex gap-3">{actions[relation] || actions.none}</div>
        </div>

        {(user.bio || user.location || user.createdAt) && (
          <div className="card mt-4 space-y-3 p-5 text-sm">
            {user.bio && <p className="text-gray-700">{user.bio}</p>}
            {user.location && (
              <p className="flex items-center gap-2 text-gray-600">
                <FiMapPin className="text-gray-400" /> {user.location}
              </p>
            )}
            {user.createdAt && (
              <p className="flex items-center gap-2 text-gray-600">
                <FiCalendar className="text-gray-400" /> Joined {formatMonthYear(user.createdAt)}
              </p>
            )}
          </div>
        )}

        {mutualFriends.length > 0 && (
          <div className="card mt-4 p-5">
            <p className="mb-3 text-sm font-semibold text-gray-900">
              {mutualFriends.length} mutual friend{mutualFriends.length === 1 ? "" : "s"}
            </p>
            <div className="flex flex-wrap gap-3">
              {mutualFriends.map((friend) => (
                <div key={friend.id} className="flex items-center gap-2">
                  <img
                    src={avatarFor(friend)}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                  <span className="text-sm text-gray-700">{friend.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
