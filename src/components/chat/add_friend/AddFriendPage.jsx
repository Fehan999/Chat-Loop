import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiArrowLeft, FiInbox, FiSearch, FiSend, FiUsers } from "react-icons/fi";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  listenToSentRequests,
  removeFriend,
  sendFriendRequest,
} from "../../../firebase/friendService";
import FriendsTab from "./FriendsTab";
import ProfilePage from "./ProfilePage";
import ReceivedRequestsTab from "./ReceivedRequestsTab";
import SearchTab from "./SearchTab";
import SentRequestsTab from "./SentRequestsTab";

// friends, requests and search in one full screen panel. incoming requests
// come from the dashboard (it already listens for the badge), sent ones are
// listened to here
const AddFriendPage = ({ currentUserId, friendIds, incomingRequests, onBack, onOpenChat }) => {
  const [activeTab, setActiveTab] = useState(incomingRequests.length ? "received" : "search");
  const [sentRequests, setSentRequests] = useState([]);
  const [sentLoaded, setSentLoaded] = useState(false);
  const [profileUserId, setProfileUserId] = useState(null);

  useEffect(
    () =>
      listenToSentRequests(currentUserId, (requests) => {
        setSentRequests(requests);
        setSentLoaded(true);
      }),
    [currentUserId]
  );

  // every action goes through here so errors are handled the same way
  const run = async (action, successMessage) => {
    try {
      const result = await action();
      if (successMessage) toast.success(successMessage);
      return result;
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong, please try again.");
      return null;
    }
  };

  const handlers = {
    send: async (userId) => {
      const result = await run(() => sendFriendRequest(currentUserId, userId, friendIds));
      if (result === "sent") toast.success("Friend request sent");
      if (result === "accepted") toast.success("You're now friends!");
      if (result === "friends") toast("You're already friends.");
    },
    accept: (userId) => run(() => acceptFriendRequest(currentUserId, userId), "Request accepted"),
    decline: (userId) => run(() => declineFriendRequest(currentUserId, userId), "Request declined"),
    cancel: (userId) => run(() => cancelFriendRequest(currentUserId, userId), "Request cancelled"),
    remove: (userId) => run(() => removeFriend(currentUserId, userId), "Friend removed"),
    viewProfile: (userId) => setProfileUserId(userId),
    message: (userId) => onOpenChat(userId),
  };

  const relationFor = (userId) => {
    if (friendIds.includes(userId)) return "friend";
    if (sentRequests.some((r) => r.userId === userId)) return "sent";
    if (incomingRequests.some((r) => r.userId === userId)) return "received";
    return "none";
  };

  const tabs = [
    { id: "search", label: "Discover", icon: FiSearch, count: 0 },
    { id: "friends", label: "Friends", icon: FiUsers, count: 0 },
    { id: "received", label: "Requests", icon: FiInbox, count: incomingRequests.length },
    { id: "sent", label: "Sent", icon: FiSend, count: 0 },
  ];

  if (profileUserId) {
    return (
      <ProfilePage
        userId={profileUserId}
        currentUserId={currentUserId}
        relation={relationFor(profileUserId)}
        handlers={handlers}
        onBack={() => setProfileUserId(null)}
      />
    );
  }

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <header className="border-b border-gray-100 bg-white px-4 pt-4">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button onClick={onBack} className="icon-btn -ml-2" aria-label="Back">
            <FiArrowLeft className="text-xl" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Friends</h1>
            <p className="text-xs text-gray-400">Find people and manage requests</p>
          </div>
        </div>

        <nav className="mx-auto mt-3 flex max-w-2xl gap-1">
          {tabs.map(({ id, label, icon: Icon, count }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`relative flex flex-1 items-center justify-center gap-1.5 px-2 py-3 text-sm font-medium transition-colors ${
                  active ? "text-indigo-600" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="hidden sm:block" />
                {label}
                {count > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                    {count}
                  </span>
                )}
                {active && (
                  <motion.span
                    layoutId="friends-tab"
                    className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-indigo-500"
                  />
                )}
              </button>
            );
          })}
        </nav>
      </header>

      <div className="thin-scroll flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === "search" && (
                <SearchTab
                  currentUserId={currentUserId}
                  relationFor={relationFor}
                  handlers={handlers}
                />
              )}
              {activeTab === "friends" && <FriendsTab friendIds={friendIds} handlers={handlers} />}
              {activeTab === "received" && (
                <ReceivedRequestsTab requests={incomingRequests} handlers={handlers} />
              )}
              {activeTab === "sent" && (
                <SentRequestsTab
                  requests={sentRequests}
                  loading={!sentLoaded}
                  handlers={handlers}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default AddFriendPage;
