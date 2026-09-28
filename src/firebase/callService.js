import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { formatDuration, toDate } from "../utils/dateUtils";
import { db } from "./config";

// how long a call rings before it counts as missed
export const RING_TIMEOUT_MS = 45 * 1000;

const LIVE_STATUSES = ["calling", "active"];
const callsCollection = collection(db, "calls");
const callDoc = (callId) => doc(db, "calls", callId);

// a "calling" doc older than the ring timeout, or an "active" one older
// than a few hours, is leftover from a closed tab and shouldn't block anyone
const isStale = (call) => {
  const startedAt = toDate(call.startedAt);
  if (!startedAt) return false;
  const age = Date.now() - startedAt.getTime();
  if (call.status === "calling") return age > RING_TIMEOUT_MS * 2;
  return age > 4 * 60 * 60 * 1000;
};

const callMessageText = (status, isVideo, duration) => {
  const kind = isVideo ? "Video" : "Audio";
  if (status === "missed") return `📞 Missed ${kind.toLowerCase()} call`;
  if (status === "rejected") return `📞 ${kind} call declined`;
  if (duration > 0) return `📞 ${kind} call • ${formatDuration(duration)}`;
  return `📞 ${kind} call ended`;
};

// drops a call summary bubble into the chat and bumps the sidebar preview
const addCallMessage = async (call, status, duration = 0) => {
  try {
    const text = callMessageText(status, call.isVideo, duration);
    const batch = writeBatch(db);

    batch.set(doc(collection(db, "messages", call.chatId, "messages")), {
      text,
      type: "call",
      senderId: call.callerId,
      senderName: call.callerName || "User",
      timestamp: serverTimestamp(),
      read: false,
      callData: { status, duration, isVideo: !!call.isVideo },
    });

    const chatUpdate = {
      lastMessage: text,
      lastMessageTime: serverTimestamp(),
      lastMessageSender: call.callerId,
    };
    if (status === "missed") chatUpdate[`unreadCounts.${call.calleeId}`] = increment(1);
    batch.update(doc(db, "chats", call.chatId), chatUpdate);

    await batch.commit();
  } catch (error) {
    console.error("Error adding call message:", error);
  }
};

// moves the call to a final state only if it is still in one of `from`.
// both people can hang up at the same moment, the transaction makes sure
// only one of them writes the summary message
const finishCall = async (callId, from, to, duration = 0) => {
  try {
    const call = await runTransaction(db, async (tx) => {
      const snap = await tx.get(callDoc(callId));
      if (!snap.exists() || !from.includes(snap.data().status)) return null;
      tx.update(callDoc(callId), { status: to, endedAt: serverTimestamp(), duration });
      return snap.data();
    });
    if (call) await addCallMessage(call, to, duration);
    return !!call;
  } catch (error) {
    console.error(`Error moving call to ${to}:`, error);
    return false;
  }
};

class CallService {
  async initiateCall({ chatId, caller, callee, isVideo }) {
    const busy = await this.checkUserActiveCall(callee.id);
    if (busy) throw new Error(`${callee.name || "They"} is on another call right now`);

    const callId = `${chatId}_${Date.now()}`;
    await setDoc(callDoc(callId), {
      id: callId,
      chatId,
      callerId: caller.id,
      calleeId: callee.id,
      callerName: caller.name || "User",
      callerAvatar: caller.avatar || "",
      calleeName: callee.name || "User",
      isVideo,
      status: "calling",
      startedAt: serverTimestamp(),
      connectedAt: null,
      endedAt: null,
      duration: 0,
    });

    // nobody picked up
    setTimeout(() => this.missCall(callId), RING_TIMEOUT_MS);
    return callId;
  }

  // two small queries instead of one with orderBy, so no composite index is needed
  async checkUserActiveCall(userId) {
    try {
      const [asCaller, asCallee] = await Promise.all([
        getDocs(
          query(
            callsCollection,
            where("callerId", "==", userId),
            where("status", "in", LIVE_STATUSES)
          )
        ),
        getDocs(
          query(
            callsCollection,
            where("calleeId", "==", userId),
            where("status", "in", LIVE_STATUSES)
          )
        ),
      ]);

      const live = [...asCaller.docs, ...asCallee.docs]
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((call) => {
          if (!isStale(call)) return true;
          finishCall(call.id, LIVE_STATUSES, call.status === "calling" ? "missed" : "ended");
          return false;
        });

      return live[0] || null;
    } catch (error) {
      console.error("Error checking active call:", error);
      return null;
    }
  }

  acceptCall(callId) {
    return updateDoc(callDoc(callId), {
      status: "active",
      connectedAt: serverTimestamp(),
    });
  }

  rejectCall(callId) {
    return finishCall(callId, ["calling"], "rejected");
  }

  // also used when the caller hangs up before anyone answers
  missCall(callId) {
    return finishCall(callId, ["calling"], "missed");
  }

  endCall(callId, duration = 0) {
    return finishCall(callId, ["active"], "ended", duration);
  }

  sendCallSignal(callId, from, type, data) {
    return addDoc(collection(db, "calls", callId, "signals"), {
      from,
      type,
      data,
      timestamp: serverTimestamp(),
    });
  }

  // skips our own signals, both sides write to the same subcollection
  listenForCallSignals(callId, userId, callback) {
    const q = query(collection(db, "calls", callId, "signals"), orderBy("timestamp"));
    return onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type !== "added") return;
          const signal = change.doc.data();
          if (!signal.from || signal.from === userId) return;
          callback(signal);
        });
      },
      (error) => console.error("Signal listener failed:", error)
    );
  }

  listenForCall(callId, callback) {
    return onSnapshot(
      callDoc(callId),
      (snap) => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null),
      (error) => console.error("Call listener failed:", error)
    );
  }

  listenForIncomingCalls(userId, callback) {
    const q = query(
      callsCollection,
      where("calleeId", "==", userId),
      where("status", "==", "calling")
    );

    return onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type !== "added") return;
          const call = { id: change.doc.id, ...change.doc.data() };
          if (!isStale(call)) callback(call);
        });
      },
      (error) => console.error("Incoming call listener failed:", error)
    );
  }
}

export default new CallService();
