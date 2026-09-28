// firebase/callService.js
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./config";

class CallService {
  constructor() {
    this.callListeners = new Map();
    this.activeCallListener = null;
  }

  async initiateCall(chatId, callerId, calleeId, isVideo = true) {
    try {
      // First, clean up any stale calls
      await this.cleanupStaleCalls(chatId);

      // Check if caller is already on a call
      const callerActiveCall = await this.checkUserActiveCall(callerId);
      if (callerActiveCall) {
        await this.cleanupCall(callerActiveCall.id);
        throw new Error("You are already on a call");
      }

      // Check if callee is already on a call
      const calleeActiveCall = await this.checkUserActiveCall(calleeId);
      if (calleeActiveCall) {
        await this.cleanupCall(calleeActiveCall.id);
        throw new Error("User is already on a call");
      }

      // Check if there's already an active call in this chat
      const activeCall = await this.checkActiveCall(chatId);
      if (activeCall) {
        await this.cleanupCall(activeCall.id);
        throw new Error("There is already an active call in this chat");
      }

      const callId = `${chatId}_${Date.now()}`;
      const callRef = doc(db, "calls", callId);

      // Get user names
      const callerDoc = await getDoc(doc(db, "users", callerId));
      const calleeDoc = await getDoc(doc(db, "users", calleeId));
      const callerName = callerDoc.exists() ? callerDoc.data().name : "User";
      const calleeName = calleeDoc.exists() ? calleeDoc.data().name : "User";

      const callData = {
        id: callId,
        chatId,
        callerId,
        calleeId,
        isVideo,
        status: "calling",
        startedAt: serverTimestamp(),
        ringingAt: null,
        connectedAt: null,
        endedAt: null,
        duration: 0,
        callerName,
        calleeName,
      };

      await setDoc(callRef, callData);

      // Auto cleanup after 60 seconds if not answered
      setTimeout(async () => {
        const callSnapshot = await getDoc(callRef);
        if (callSnapshot.exists()) {
          const call = callSnapshot.data();
          if (call.status === "calling") {
            console.log("Auto-missing call due to timeout:", callId);
            await this.missCall(callId);
            await this.addCallMessage(chatId, {
              callerId,
              calleeId,
              callerName,
              calleeName,
              isVideo,
              status: "missed",
              duration: 0,
              endedAt: new Date(),
            });
          }
        }
      }, 60000); // 60 seconds timeout

      return callId;
    } catch (error) {
      console.error("Error initiating call:", error);
      throw error;
    }
  }

  async checkUserActiveCall(userId) {
    try {
      const callsRef = collection(db, "calls");
      const q = query(
        callsRef,
        where("callerId", "==", userId),
        where("status", "in", ["calling", "connecting", "active"]),
        orderBy("startedAt", "desc"),
        limit(1)
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      }

      // Check as callee
      const q2 = query(
        callsRef,
        where("calleeId", "==", userId),
        where("status", "in", ["calling", "connecting", "active"]),
        orderBy("startedAt", "desc"),
        limit(1)
      );

      const snapshot2 = await getDocs(q2);
      if (!snapshot2.empty) {
        return { id: snapshot2.docs[0].id, ...snapshot2.docs[0].data() };
      }

      return null;
    } catch (error) {
      console.error("Error checking user active call:", error);
      return null;
    }
  }

  async checkActiveCall(chatId) {
    try {
      const callsRef = collection(db, "calls");
      const q = query(
        callsRef,
        where("chatId", "==", chatId),
        where("status", "in", ["calling", "connecting", "active"]),
        orderBy("startedAt", "desc"),
        limit(1)
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      }
      return null;
    } catch (error) {
      console.error("Error checking active call:", error);
      return null;
    }
  }

  async acceptCall(callId) {
    try {
      const callRef = doc(db, "calls", callId);
      await updateDoc(callRef, {
        status: "connecting",
        acceptedAt: serverTimestamp(),
      });

      setTimeout(async () => {
        await updateDoc(callRef, {
          status: "active",
          connectedAt: serverTimestamp(),
        });
      }, 1000);
    } catch (error) {
      console.error("Error accepting call:", error);
      throw error;
    }
  }

  async rejectCall(callId) {
    try {
      const callRef = doc(db, "calls", callId);
      const callSnapshot = await getDoc(callRef);
      const callData = callSnapshot.data();

      await updateDoc(callRef, {
        status: "rejected",
        endedAt: serverTimestamp(),
      });

      // Add rejection message to chat
      if (callData) {
        await this.addCallMessage(callData.chatId, {
          callerId: callData.callerId,
          calleeId: callData.calleeId,
          callerName: callData.callerName,
          calleeName: callData.calleeName,
          isVideo: callData.isVideo,
          status: "rejected",
          duration: 0,
          endedAt: new Date(),
        });
      }

      setTimeout(async () => {
        try {
          await deleteDoc(callRef);
        } catch (e) {
          console.log("Call already deleted");
        }
      }, 10000);
    } catch (error) {
      console.error("Error rejecting call:", error);
      throw error;
    }
  }

  async missCall(callId) {
    try {
      const callRef = doc(db, "calls", callId);
      await updateDoc(callRef, {
        status: "missed",
        endedAt: serverTimestamp(),
      });

      setTimeout(async () => {
        try {
          await deleteDoc(callRef);
        } catch (e) {
          console.log("Call already deleted");
        }
      }, 10000);
    } catch (error) {
      console.error("Error missing call:", error);
      throw error;
    }
  }

  async endCall(callId, duration = 0) {
    try {
      const callRef = doc(db, "calls", callId);
      const callSnapshot = await getDoc(callRef);
      const callData = callSnapshot.data();

      if (callData) {
        await updateDoc(callRef, {
          status: "ended",
          endedAt: serverTimestamp(),
          duration,
        });

        // Only add message once
        await this.addCallMessage(callData.chatId, {
          callerId: callData.callerId,
          calleeId: callData.calleeId,
          callerName: callData.callerName,
          calleeName: callData.calleeName,
          isVideo: callData.isVideo,
          status: "ended",
          duration,
          endedAt: new Date(),
          connectedAt: callData.connectedAt,
        });
      }

      setTimeout(async () => {
        try {
          await deleteDoc(callRef);
        } catch (e) {
          console.log("Call already deleted");
        }
      }, 3600000);
    } catch (error) {
      console.error("Error ending call:", error);
      throw error;
    }
  }

  async addCallMessage(chatId, callData) {
    try {
      if (!chatId) {
        console.error("No chatId provided for call message");
        return;
      }

      if (!callData.callerId) {
        console.error("No callerId in callData:", callData);
        return;
      }

      const messagesRef = collection(db, "chats", chatId, "messages");

      let messageText = "";
      if (callData.status === "ended" && callData.duration > 0) {
        const durationText = this.formatCallDuration(callData.duration);
        messageText = `📞 ${
          callData.isVideo ? "Video" : "Audio"
        } call • ${durationText}`;
      } else if (callData.status === "missed") {
        messageText = `📞 Missed ${callData.isVideo ? "video" : "audio"} call`;
      } else if (callData.status === "rejected") {
        messageText = `📞 ${
          callData.isVideo ? "Video" : "Audio"
        } call rejected`;
      } else if (callData.status === "ended") {
        messageText = `📞 ${callData.isVideo ? "Video" : "Audio"} call ended`;
      } else {
        messageText = `📞 ${callData.isVideo ? "Video" : "Audio"} call`;
      }

      const messageData = {
        text: messageText,
        senderId: callData.callerId,
        senderName: callData.callerName || "User",
        timestamp: serverTimestamp(),
        type: "call",
        callData: {
          duration: callData.duration || 0,
          status: callData.status,
          isVideo: callData.isVideo || false,
          endedAt: callData.endedAt ? serverTimestamp() : null,
          connectedAt: callData.connectedAt || null,
        },
      };

      await addDoc(messagesRef, messageData);
      console.log("Call message added successfully");
    } catch (error) {
      console.error("Error adding call message:", error);
    }
  }

  formatCallDuration(seconds) {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  async cleanupStaleCalls(chatId) {
    try {
      const callsRef = collection(db, "calls");
      const q = query(
        callsRef,
        where("chatId", "==", chatId),
        where("status", "in", ["calling", "connecting"]),
        orderBy("startedAt", "desc")
      );

      const snapshot = await getDocs(q);
      const now = new Date();

      for (const docSnap of snapshot.docs) {
        const call = docSnap.data();
        const startedAt =
          call.startedAt?.toDate?.() || new Date(call.startedAt);
        const ageMinutes = (now - startedAt) / 1000 / 60;

        if (ageMinutes > 2) {
          console.log("Cleaning up stale call:", docSnap.id);
          await this.missCall(docSnap.id);
        }
      }
    } catch (error) {
      console.error("Error cleaning up stale calls:", error);
    }
  }

  async cleanupCall(callId) {
    try {
      const callRef = doc(db, "calls", callId);
      const callSnapshot = await getDoc(callRef);

      if (callSnapshot.exists()) {
        const call = callSnapshot.data();
        if (call.status !== "active" && call.status !== "ended") {
          await this.missCall(callId);
        }
      }
    } catch (error) {
      console.error("Error cleaning up call:", error);
    }
  }

  async sendCallSignal(callId, signalData) {
    try {
      const signalsRef = collection(db, "calls", callId, "signals");
      await addDoc(signalsRef, {
        ...signalData,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error sending call signal:", error);
      throw error;
    }
  }

  listenForCall(callId, callback) {
    const callRef = doc(db, "calls", callId);
    const unsubscribe = onSnapshot(
      callRef,
      (snapshot) => {
        if (snapshot.exists()) {
          callback({ id: snapshot.id, ...snapshot.data() });
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error("Error listening to call:", error);
        callback(null, error);
      }
    );

    this.callListeners.set(callId, unsubscribe);
    return unsubscribe;
  }

  listenForCallSignals(callId, callback) {
    const signalsRef = collection(db, "calls", callId, "signals");
    const q = query(signalsRef, orderBy("timestamp"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            callback({ id: change.doc.id, ...change.doc.data() });
          }
        });
      },
      (error) => {
        console.error("Error listening to signals:", error);
      }
    );

    return unsubscribe;
  }

  listenForIncomingCalls(userId, callback) {
    const callsRef = collection(db, "calls");
    const q = query(
      callsRef,
      where("calleeId", "==", userId),
      where("status", "==", "calling"),
      orderBy("startedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const callData = { id: change.doc.id, ...change.doc.data() };
            console.log("Incoming call detected:", callData);
            callback(callData);
          }
        });
      },
      (error) => {
        console.error("Error listening to incoming calls:", error);
      }
    );

    return unsubscribe;
  }

  cleanup(callId) {
    const listener = this.callListeners.get(callId);
    if (listener) {
      listener();
      this.callListeners.delete(callId);
    }
  }
}

export default new CallService();
