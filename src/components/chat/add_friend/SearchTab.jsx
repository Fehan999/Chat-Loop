// SearchTab.jsx - Updated to exclude friends
import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { FiSearch, FiUsers } from "react-icons/fi";
import UserCard from "./UserCard";
import LoadingState from "./LoadingState";
import EmptyState from "./EmptyState";

const SearchTab = ({
  currentUserId,
  onViewProfile,
  onSendRequest,
  friends = [],
  sentRequests = [],
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // Memoize friend IDs and sent request IDs
  const friendIds = useMemo(() => new Set(friends), [friends]);
  const sentRequestIds = useMemo(
    () => new Set(sentRequests.map((req) => req.userId)),
    [sentRequests]
  );

  // Load all users - excluding friends
  useEffect(() => {
    const loadUsers = async () => {
      if (!currentUserId) return;

      setLoading(true);
      try {
        const usersRef = collection(db, "users");
        const querySnapshot = await getDocs(usersRef);

        const loadedUsers = [];
        for (const docSnapshot of querySnapshot.docs) {
          const userData = docSnapshot.data();
          // Exclude current user and existing friends
          if (
            docSnapshot.id !== currentUserId &&
            !friendIds.has(docSnapshot.id)
          ) {
            loadedUsers.push({
              id: docSnapshot.id,
              ...userData,
              friendStatus: sentRequestIds.has(docSnapshot.id)
                ? "request_sent"
                : "none",
            });
          }
        }

        setAllUsers(loadedUsers);
      } catch (error) {
        console.error("Error loading users:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  // Update friend status without reloading all users
  useEffect(() => {
    if (allUsers.length === 0) return;

    setAllUsers((prevUsers) =>
      prevUsers.map((user) => ({
        ...user,
        friendStatus: sentRequestIds.has(user.id) ? "request_sent" : "none",
      }))
    );
  }, [friendIds, sentRequestIds, allUsers.length]);

  // Search function
  useEffect(() => {
    if (searchTerm.length < 2) {
      setUsers([]);
      return;
    }

    setSearching(true);

    const timer = setTimeout(() => {
      const searchLower = searchTerm.toLowerCase();
      const isIdSearch = /^\d{4}$/.test(searchTerm);

      const filtered = allUsers.filter((user) => {
        if (isIdSearch) {
          return user.uniqueId === searchTerm;
        }

        return (
          user.name?.toLowerCase().includes(searchLower) ||
          user.username?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower) ||
          user.uniqueId?.includes(searchTerm)
        );
      });

      setUsers(filtered);
      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, allUsers]);

  return (
    <div className="space-y-4">
      <div className="sticky top-0 bg-gradient-to-b from-gray-50 to-white pt-2 pb-4 z-10">
        <div className="relative">
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
          <input
            type="text"
            placeholder="Search by name, username, email, or 4-digit ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all shadow-sm"
            autoFocus
          />
          {searching && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {searchTerm.length === 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
            <FiUsers className="text-indigo-400" />
            <span>Try searching by name or 4-digit ID</span>
          </div>
        )}
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <div className="space-y-3 pb-4">
          {searchTerm.length > 0 && (
            <p className="text-xs text-gray-400 px-1">
              {searching
                ? "Searching..."
                : users.length === 0
                ? "No users found"
                : `Found ${users.length} user${users.length !== 1 ? "s" : ""}`}
            </p>
          )}

          {users.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <UserCard
                user={user}
                searchTerm={searchTerm}
                onViewProfile={() => onViewProfile(user)}
                onSendRequest={() => onSendRequest(user.id)}
                variant="search"
                friendStatus={user.friendStatus}
              />
            </motion.div>
          ))}

          {searchTerm.length >= 2 && users.length === 0 && !searching && (
            <EmptyState searchTerm={searchTerm} />
          )}

          {searchTerm.length < 2 && searchTerm.length > 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm">
                Type at least 2 characters to search
              </p>
            </div>
          )}

          {searchTerm.length === 0 && allUsers.length > 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiUsers className="text-3xl text-indigo-400" />
              </div>
              <h3 className="text-gray-900 font-medium mb-2">
                Discover New Friends
              </h3>
              <p className="text-gray-400 text-sm max-w-xs mx-auto">
                Search for friends by name, username, or their unique 4-digit ID
              </p>
              <p className="text-xs text-indigo-400 mt-4">
                {allUsers.length} people available to connect
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchTab;
