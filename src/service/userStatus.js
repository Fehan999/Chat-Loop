import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase/config";
import { updateUserStatus } from "../firebase/firestoreService";

// refreshes lastSeen every couple of minutes so other clients can tell
// a live "online" apart from a tab that crashed
const HEARTBEAT_MS = 2 * 60 * 1000;

const startPresence = (uid) => {
  let current = null;

  const setStatus = (status, force = false) => {
    if (status === current && !force) return;
    current = status;
    updateUserStatus(uid, status);
  };

  const visibleStatus = () => (document.hidden ? "away" : "online");
  const onVisibilityChange = () => setStatus(visibleStatus());
  const onPageHide = () => updateUserStatus(uid, "offline");

  setStatus("online");
  const heartbeat = setInterval(() => setStatus(visibleStatus(), true), HEARTBEAT_MS);
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pagehide", onPageHide);

  return () => {
    clearInterval(heartbeat);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pagehide", onPageHide);
  };
};

// call once from App. returns a cleanup for the effect
export const initializeUserStatus = () => {
  let stopPresence = null;

  const unsubscribe = onAuthStateChanged(auth, (user) => {
    stopPresence?.();
    stopPresence = user ? startPresence(user.uid) : null;
  });

  return () => {
    unsubscribe();
    stopPresence?.();
  };
};

// marks the user offline before the session goes away, otherwise the
// write would be rejected once we're signed out
export const logout = async () => {
  const uid = auth.currentUser?.uid;
  if (uid) await updateUserStatus(uid, "offline");
  await signOut(auth);
};
