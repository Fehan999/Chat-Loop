import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";
import { updateUserStatus } from "../firebase/firestoreService";

let statusInterval = null;
let currentUser = null;
let lastStatus = null;
let heartbeatCount = 0;

export const initializeUserStatus = () => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      lastStatus = "online";
      heartbeatCount = 0;

      console.log(
        `[Status] User ${user.uid} logged in, setting status to online`
      );

      // Set user as online immediately
      await updateUserStatus(user.uid, "online");

      // Update status every 45 seconds (optimized interval)
      if (statusInterval) clearInterval(statusInterval);
      statusInterval = setInterval(async () => {
        if (currentUser) {
          heartbeatCount++;

          // Check if user is actually active
          const isActive = document.hasFocus() && !document.hidden;
          const newStatus = isActive ? "online" : "away";

          // Only update if status changed or every 3rd heartbeat (2.25 minutes)
          if (newStatus !== lastStatus || heartbeatCount >= 3) {
            await updateUserStatus(currentUser.uid, newStatus);
            lastStatus = newStatus;
            heartbeatCount = 0;
            console.log(
              `[Status] Heartbeat: User ${currentUser.uid} status updated to ${newStatus}`
            );
          }
        }
      }, 45000); // 45 seconds

      // Handle page/tab close - set offline
      const handleBeforeUnload = async () => {
        if (currentUser) {
          console.log(
            `[Status] User ${currentUser.uid} closing tab, setting offline`
          );
          await updateUserStatus(currentUser.uid, "offline");
        }
      };

      window.addEventListener("beforeunload", handleBeforeUnload);

      // Handle visibility change (tab switch)
      const handleVisibilityChange = async () => {
        if (currentUser) {
          if (document.hidden) {
            console.log(
              `[Status] User ${currentUser.uid} switched tabs, setting away`
            );
            await updateUserStatus(currentUser.uid, "away");
            lastStatus = "away";
          } else {
            console.log(
              `[Status] User ${currentUser.uid} returned to tab, setting online`
            );
            await updateUserStatus(currentUser.uid, "online");
            lastStatus = "online";
            heartbeatCount = 0;
          }
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);

      // Handle user activity (mouse movement, clicks, typing)
      let activityTimeout;
      const resetActivity = async () => {
        if (currentUser && document.hasFocus() && !document.hidden) {
          if (lastStatus !== "online") {
            await updateUserStatus(currentUser.uid, "online");
            lastStatus = "online";
            console.log(
              `[Status] User ${currentUser.uid} active again, setting online`
            );
          }
          heartbeatCount = 0;
        }
      };

      const activityEvents = ["mousedown", "keydown", "scroll", "touchstart"];
      activityEvents.forEach((event) => {
        window.addEventListener(event, () => {
          clearTimeout(activityTimeout);
          activityTimeout = setTimeout(resetActivity, 1000);
        });
      });

      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
        activityEvents.forEach((event) => {
          window.removeEventListener(event, resetActivity);
        });
        clearTimeout(activityTimeout);
      };
    } else if (statusInterval) {
      clearInterval(statusInterval);
      statusInterval = null;
      currentUser = null;
      lastStatus = null;
      heartbeatCount = 0;
    }
  });
};

export const cleanupUserStatus = () => {
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
};
