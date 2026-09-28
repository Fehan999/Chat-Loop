import { useEffect, useRef, useState } from "react";
import { listenToUser } from "../firebase/firestoreService";

// keeps one snapshot listener per user id and adds/removes them as the list
// changes. firestore shares one connection, so this is cheaper than
// refetching every profile whenever a chat updates
export const useLiveProfiles = (userIds) => {
  const [profiles, setProfiles] = useState({});
  const listeners = useRef(new Map());
  const key = [...new Set(userIds.filter(Boolean))].sort().join(",");

  useEffect(() => {
    const wanted = new Set(key ? key.split(",") : []);
    const active = listeners.current;

    active.forEach((unsubscribe, id) => {
      if (!wanted.has(id)) {
        unsubscribe();
        active.delete(id);
      }
    });

    wanted.forEach((id) => {
      if (active.has(id)) return;
      const unsubscribe = listenToUser(id, (profile) =>
        setProfiles((prev) => ({ ...prev, [id]: profile }))
      );
      active.set(id, unsubscribe);
    });
  }, [key]);

  useEffect(() => {
    const active = listeners.current;
    return () => {
      active.forEach((unsubscribe) => unsubscribe());
      active.clear();
    };
  }, []);

  return profiles;
};
