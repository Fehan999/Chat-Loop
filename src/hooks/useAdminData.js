import { useEffect, useState } from "react";
import {
  fetchCounts,
  listenToAllUsers,
  listenToAnnouncementDoc,
  listenToReports,
} from "../firebase/adminService";

const EMPTY_COUNTS = { conversations: null, messages: null };

// live data for the admin panel. the guest login gets the same users, reports and
// announcement as the owner, but not the chat/message counts (those need access to private chats)
export const useAdminData = ({ enabled, withCounts }) => {
  const [users, setUsers] = useState(null);
  const [reports, setReports] = useState(null);
  const [counts, setCounts] = useState(null);
  const [announcement, setAnnouncement] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    const unsubscribers = [
      listenToAllUsers(setUsers),
      listenToReports(setReports),
      listenToAnnouncementDoc(setAnnouncement),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !withCounts) return;
    fetchCounts()
      .then(setCounts)
      .catch((error) => {
        console.error("Couldn't load counts:", error);
        setCounts(EMPTY_COUNTS);
      });
  }, [enabled, withCounts, refreshKey]);

  return {
    users: users || [],
    reports: reports || [],
    counts: counts || EMPTY_COUNTS,
    announcement: announcement || { text: "", active: false },
    loading: enabled && (users === null || reports === null),
    refresh: () => setRefreshKey((key) => key + 1),
  };
};
