import { useEffect, useState } from "react";
import {
  fetchCounts,
  listenToAllUsers,
  listenToAnnouncementDoc,
  listenToReports,
  listenToStatsDoc,
  saveStats,
} from "../firebase/adminService";

const RECOUNT_MS = 5 * 60 * 1000;
const EMPTY_COUNTS = { conversations: null, messages: null, updatedAt: null };

// live data for the admin panel. counting chats and messages needs access to private
// chats, so only the admin runs those queries and saves the result to appConfig/stats.
// the guest login reads that saved copy
export const useAdminData = ({ enabled, withCounts }) => {
  const [users, setUsers] = useState(null);
  const [reports, setReports] = useState(null);
  const [liveCounts, setLiveCounts] = useState(null);
  const [savedCounts, setSavedCounts] = useState(null);
  const [announcement, setAnnouncement] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    const unsubscribers = [
      listenToAllUsers(setUsers),
      listenToReports(setReports),
      listenToAnnouncementDoc(setAnnouncement),
      listenToStatsDoc(setSavedCounts),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !withCounts) return;
    fetchCounts()
      .then((counts) => {
        setLiveCounts({ ...counts, updatedAt: new Date() });
        saveStats(counts).catch((error) => console.error("Couldn't save stats:", error));
      })
      .catch((error) => console.error("Couldn't load counts:", error));
  }, [enabled, withCounts, refreshKey]);

  // counts aren't live listeners (that would mean reading every message), so re-count now and then
  useEffect(() => {
    if (!enabled || !withCounts) return undefined;
    const timer = setInterval(() => setRefreshKey((key) => key + 1), RECOUNT_MS);
    return () => clearInterval(timer);
  }, [enabled, withCounts]);

  return {
    users: users || [],
    reports: reports || [],
    counts: liveCounts || savedCounts || EMPTY_COUNTS,
    announcement: announcement || { title: "", text: "", active: false },
    loading: enabled && (users === null || reports === null),
    refresh: () => setRefreshKey((key) => key + 1),
  };
};
