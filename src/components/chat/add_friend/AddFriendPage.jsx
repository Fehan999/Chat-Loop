// AddFriendPage.jsx - Fixed Active Tab Design
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import {
  FiArrowLeft,
  FiInbox,
  FiSearch,
  FiSend,
  FiUsers,
} from "react-icons/fi";
import { db } from "../../../firebase/config";
import FriendsTab from "./FriendsTab";
import ReceivedRequestsTab from "./ReceivedRequestsTab";
import SearchTab from "./SearchTab";
import SentRequestsTab from "./SentRequestsTab";
import ProfilePage from "./ProfilePage";

const AddFriendPage = ({ onBack, currentUserId }) => {
  const [showProfilePage, setShowProfilePage] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [activeTab, setActiveTab] = useState("search");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendsData, setFriendsData] = useState([]);
  const [loading, setLoading] = useState(false);

  const tabs = [
    {
      id: "search",
      label: "Discover",
      icon: FiSearch,
      count: null,
    },
    {
      id: "friends",
      label: "Friends",
      icon: FiUsers,
      count: friends.length,
    },
    {
      id: "received",
      label: "Requests",
      icon: FiInbox,
      count: receivedRequests.length,
    },
    {
      id: "sent",
      label: "Sent",
      icon: FiSend,
      count: sentRequests.length,
    },
  ];

  // Fetch friends data
  const fetchFriends = async () => {
    try {
      const userDoc = await getDoc(doc(db, "users", currentUserId));
      if (userDoc.exists()) {
        const friendIds = userDoc.data().friends || [];
        setFriends(friendIds);

        const friendDetails = [];
        for (const friendId of friendIds) {
          const friendDoc = await getDoc(doc(db, "users", friendId));
          if (friendDoc.exists()) {
            friendDetails.push({
              id: friendId,
              ...friendDoc.data(),
            });
          }
        }
        setFriendsData(friendDetails);
      }
    } catch (error) {
      console.error("Error fetching friends:", error);
    }
  };

  const fetchFriendRequests = async () => {
    setLoading(true);
    try {
      const sentRequestsQuery = query(
        collection(db, "friendRequests"),
        where("senderId", "==", currentUserId),
        where("status", "==", "pending")
      );
      const sentSnapshot = await getDocs(sentRequestsQuery);
      const sentRequestsData = [];

      for (const requestDoc of sentSnapshot.docs) {
        const data = requestDoc.data();
        const receiverDoc = await getDoc(doc(db, "users", data.receiverId));
        if (receiverDoc.exists()) {
          sentRequestsData.push({
            id: requestDoc.id,
            userId: data.receiverId,
            name: receiverDoc.data().name,
            username: receiverDoc.data().username,
            uniqueId: receiverDoc.data().uniqueId,
            avatar: receiverDoc.data().avatar,
            status: data.status,
            sentAt: data.createdAt,
          });
        }
      }
      setSentRequests(sentRequestsData);

      const receivedRequestsQuery = query(
        collection(db, "friendRequests"),
        where("receiverId", "==", currentUserId),
        where("status", "==", "pending")
      );
      const receivedSnapshot = await getDocs(receivedRequestsQuery);
      const receivedRequestsData = [];

      for (const requestDoc of receivedSnapshot.docs) {
        const data = requestDoc.data();
        const senderDoc = await getDoc(doc(db, "users", data.senderId));
        if (senderDoc.exists()) {
          receivedRequestsData.push({
            id: requestDoc.id,
            userId: data.senderId,
            name: senderDoc.data().name,
            username: senderDoc.data().username,
            uniqueId: senderDoc.data().uniqueId,
            avatar: senderDoc.data().avatar,
            status: data.status,
            receivedAt: data.createdAt,
          });
        }
      }
      setReceivedRequests(receivedRequestsData);
    } catch (error) {
      console.error("Error fetching friend requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUserId) {
      fetchFriends();
      fetchFriendRequests();
    }
  }, [currentUserId]);

  const handleRemoveFriend = async (friendId) => {
    try {
      await updateDoc(doc(db, "users", currentUserId), {
        friends: arrayRemove(friendId),
      });
      await updateDoc(doc(db, "users", friendId), {
        friends: arrayRemove(currentUserId),
      });
      await fetchFriends();
      alert("Friend removed successfully");
    } catch (error) {
      console.error("Error removing friend:", error);
      alert("Failed to remove friend. Please try again.");
    }
  };

  const handleSendRequest = async (receiverId) => {
    try {
      if (friends.includes(receiverId)) {
        alert("You are already friends!");
        return;
      }

      const existingRequest = await getDocs(
        query(
          collection(db, "friendRequests"),
          where("senderId", "==", currentUserId),
          where("receiverId", "==", receiverId),
          where("status", "==", "pending")
        )
      );

      if (!existingRequest.empty) {
        alert("Friend request already sent!");
        return;
      }

      const receivedRequest = await getDocs(
        query(
          collection(db, "friendRequests"),
          where("senderId", "==", receiverId),
          where("receiverId", "==", currentUserId),
          where("status", "==", "pending")
        )
      );

      if (!receivedRequest.empty) {
        await handleAcceptRequest(receiverId);
        return;
      }

      const requestId = `${currentUserId}_${receiverId}_${Date.now()}`;
      await setDoc(doc(db, "friendRequests", requestId), {
        senderId: currentUserId,
        receiverId: receiverId,
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      await fetchFriendRequests();
      alert("Friend request sent!");
    } catch (error) {
      console.error("Error sending friend request:", error);
      alert("Failed to send friend request. Please try again.");
    }
  };

  const handleAcceptRequest = async (senderId) => {
    try {
      const batch = writeBatch(db);

      const requestsQuery = query(
        collection(db, "friendRequests"),
        where("senderId", "==", senderId),
        where("receiverId", "==", currentUserId),
        where("status", "==", "pending")
      );

      const querySnapshot = await getDocs(requestsQuery);

      if (querySnapshot.empty) {
        alert("Request not found!");
        return;
      }

      const requestDoc = querySnapshot.docs[0];
      batch.update(requestDoc.ref, { status: "accepted" });

      batch.update(doc(db, "users", currentUserId), {
        friends: arrayUnion(senderId),
      });

      batch.update(doc(db, "users", senderId), {
        friends: arrayUnion(currentUserId),
      });

      await batch.commit();

      await fetchFriends();
      await fetchFriendRequests();

      alert("Friend request accepted!");
    } catch (error) {
      console.error("Error accepting friend request:", error);
      alert("Failed to accept friend request. Please try again.");
    }
  };

  const handleDeclineRequest = async (senderId) => {
    try {
      const requestsQuery = query(
        collection(db, "friendRequests"),
        where("senderId", "==", senderId),
        where("receiverId", "==", currentUserId),
        where("status", "==", "pending")
      );

      const querySnapshot = await getDocs(requestsQuery);

      if (querySnapshot.empty) {
        alert("Request not found!");
        return;
      }

      const requestDoc = querySnapshot.docs[0];
      await updateDoc(requestDoc.ref, { status: "declined" });

      await fetchFriendRequests();
      alert("Friend request declined.");
    } catch (error) {
      console.error("Error declining friend request:", error);
      alert("Failed to decline friend request. Please try again.");
    }
  };

  const handleCancelRequest = async (receiverId) => {
    try {
      const requestsQuery = query(
        collection(db, "friendRequests"),
        where("senderId", "==", currentUserId),
        where("receiverId", "==", receiverId),
        where("status", "==", "pending")
      );

      const querySnapshot = await getDocs(requestsQuery);

      if (querySnapshot.empty) {
        alert("Request not found!");
        return;
      }

      const requestDoc = querySnapshot.docs[0];
      await updateDoc(requestDoc.ref, { status: "cancelled" });

      await fetchFriendRequests();
      alert("Friend request cancelled.");
    } catch (error) {
      console.error("Error cancelling friend request:", error);
      alert("Failed to cancel friend request. Please try again.");
    }
  };
  if (showProfilePage) {
    return (
      <ProfilePage
        userId={selectedUserId}
        currentUserId={currentUserId}
        onBack={() => setShowProfilePage(false)}
        onSendRequest={handleSendRequest}
        onAcceptRequest={handleAcceptRequest}
        friends={friends}
        sentRequests={sentRequests}
      />
    );
  }

  const handleViewProfile = (user) => {
    setSelectedUserId(user.id);
    setShowProfilePage(true);
  };

  const getTabContent = () => {
    switch (activeTab) {
      case "search":
        return (
          <SearchTab
            currentUserId={currentUserId}
            onViewProfile={handleViewProfile}
            onSendRequest={handleSendRequest}
            friends={friends}
            sentRequests={sentRequests}
          />
        );
      case "friends":
        return (
          <FriendsTab
            currentUserId={currentUserId}
            friendsList={friends}
            friendsData={friendsData}
            onViewProfile={handleViewProfile}
            onRemoveFriend={handleRemoveFriend}
          />
        );
      case "received":
        return (
          <ReceivedRequestsTab
            requests={receivedRequests}
            loading={loading}
            onAccept={handleAcceptRequest}
            onDecline={handleDeclineRequest}
            onViewProfile={handleViewProfile}
          />
        );
      case "sent":
        return (
          <SentRequestsTab
            requests={sentRequests}
            loading={loading}
            onCancelRequest={handleCancelRequest}
            onViewProfile={handleViewProfile}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-gray-50 via-white to-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-gray-100 px-4 py-4 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FiArrowLeft className="text-xl text-gray-600" />
          </motion.button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Connect</h1>
            <p className="text-xs text-gray-400">Find & grow your network</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {getTabContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Tab Bar - Clean Design */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-30"
      >
        <div className="flex items-center justify-around px-4 py-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            const hasCount = tab.count > 0;

            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileTap={{ scale: 0.95 }}
                className="relative flex-1 flex flex-col items-center justify-center py-2 gap-1"
              >
                {/* Icon Container */}
                <div className="relative">
                  <motion.div
                    animate={isActive ? { y: -2 } : { y: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Icon
                      className={`text-2xl transition-all duration-200 ${
                        isActive
                          ? "text-indigo-600 drop-shadow-sm"
                          : "text-gray-400"
                      }`}
                    />
                  </motion.div>

                  {/* Notification Badge */}
                  {hasCount && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 min-w-[20px] h-5 flex items-center justify-center rounded-full text-[11px] font-bold text-white bg-gradient-to-r from-red-500 to-pink-500 shadow-md"
                    >
                      {tab.count > 99 ? "99+" : tab.count}
                    </motion.span>
                  )}
                </div>

                {/* Label */}
                <motion.span
                  animate={
                    isActive
                      ? { scale: 1, opacity: 1 }
                      : { scale: 0.95, opacity: 0.7 }
                  }
                  className={`text-xs font-medium transition-all ${
                    isActive ? "text-indigo-600" : "text-gray-400"
                  }`}
                >
                  {tab.label}
                </motion.span>

                {/* Active Indicator - Clean Dot */}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-indigo-600"
                    transition={{ type: "spring", duration: 0.3 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Safe Area for iPhone */}
        <div className="h-[env(safe-area-inset-bottom)] bg-white" />
      </motion.div>

      {/* User Profile Modal */}
      {/* <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={selectedUser}
        currentUserId={currentUserId}
        onSendRequest={handleSendRequest}
        friends={friends}
        sentRequests={sentRequests}
      /> */}
    </div>
  );
};

export default AddFriendPage;
