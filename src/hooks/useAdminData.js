import { useEffect, useMemo, useState } from "react";
import {
  fetchCounts,
  listenToAllUsers,
  listenToAnnouncementDoc,
  listenToReports,
} from "../firebase/adminService";
import { buildDemoData } from "../components/admin/demoData";

// the admin panel reads from here. in demo mode nothing touches firestore,
// so visitors never see real people's data
export const useAdminData = (live) => {
  const demo = useMemo(() => (live ? null : buildDemoData()), [live]);

  const [users, setUsers] = useState(null);
  const [reports, setReports] = useState(null);
  const [counts, setCounts] = useState(null);
  const [announcement, setAnnouncement] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!live) return undefined;
    const unsubscribers = [
      listenToAllUsers(setUsers),
      listenToReports(setReports),
      listenToAnnouncementDoc(setAnnouncement),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [live]);

  useEffect(() => {
    if (!live) return;
    fetchCounts()
      .then(setCounts)
      .catch((error) => {
        console.error("Couldn't load counts:", error);
        setCounts({ conversations: null, messages: null });
      });
  }, [live, refreshKey]);

  if (!live) {
    return { ...demo, loading: false, refresh: () => {} };
  }

  return {
    users: users || [],
    reports: reports || [],
    counts: counts || { conversations: null, messages: null },
    announcement: announcement || { text: "", active: false },
    loading: users === null || reports === null,
    refresh: () => setRefreshKey((key) => key + 1),
  };
};
