import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./config";
import { getUserData, getUserDoc } from "./firestoreService";

// the friends array on each user doc is the source of truth for who is a
// friend. friendRequests only tracks the request itself

const requestsCollection = collection(db, "friendRequests");

const findRequests = (senderId, receiverId, status) =>
  getDocs(
    query(
      requestsCollection,
      where("senderId", "==", senderId),
      where("receiverId", "==", receiverId),
      where("status", "==", status)
    )
  );

// listens to pending requests in one direction and attaches the other
// person's profile so the cards can render straight away
const listenToPending = (field, userId, otherField, callback) => {
  const q = query(requestsCollection, where(field, "==", userId), where("status", "==", "pending"));

  return onSnapshot(
    q,
    async (snapshot) => {
      const requests = await Promise.all(
        snapshot.docs.map(async (d) => {
          const data = d.data();
          const profile = await getUserData(data[otherField]);
          if (!profile) return null;
          return {
            id: d.id,
            userId: data[otherField],
            name: profile.name,
            username: profile.username,
            uniqueId: profile.uniqueId,
            avatar: profile.avatar,
            status: profile.status,
            createdAt: data.createdAt,
          };
        })
      );
      callback(requests.filter(Boolean));
    },
    (error) => {
      console.error("Friend request listener failed:", error);
      callback([]);
    }
  );
};

export const listenToIncomingRequests = (userId, callback) =>
  listenToPending("receiverId", userId, "senderId", callback);

export const listenToSentRequests = (userId, callback) =>
  listenToPending("senderId", userId, "receiverId", callback);

// accepting sets both friend lists and closes the request in one batch
export const acceptFriendRequest = async (currentUserId, senderId) => {
  const pending = await findRequests(senderId, currentUserId, "pending");
  if (pending.empty) return false;

  const batch = writeBatch(db);
  pending.docs.forEach((d) =>
    batch.update(d.ref, { status: "accepted", updatedAt: serverTimestamp() })
  );
  batch.update(getUserDoc(currentUserId), { friends: arrayUnion(senderId) });
  batch.update(getUserDoc(senderId), { friends: arrayUnion(currentUserId) });
  await batch.commit();
  return true;
};

// returns "sent", "accepted" (they had already asked us) or "friends"
export const sendFriendRequest = async (currentUserId, receiverId, friendIds = []) => {
  if (friendIds.includes(receiverId)) return "friends";

  const theirRequest = await findRequests(receiverId, currentUserId, "pending");
  if (!theirRequest.empty) {
    await acceptFriendRequest(currentUserId, receiverId);
    return "accepted";
  }

  // fixed id means sending again just overwrites the old declined/cancelled one
  await setDoc(doc(requestsCollection, `${currentUserId}_${receiverId}`), {
    senderId: currentUserId,
    receiverId,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return "sent";
};

const closeRequests = async (senderId, receiverId, status) => {
  const pending = await findRequests(senderId, receiverId, "pending");
  if (pending.empty) return false;
  const batch = writeBatch(db);
  pending.docs.forEach((d) => batch.update(d.ref, { status, updatedAt: serverTimestamp() }));
  await batch.commit();
  return true;
};

export const declineFriendRequest = (currentUserId, senderId) =>
  closeRequests(senderId, currentUserId, "declined");

export const cancelFriendRequest = (currentUserId, receiverId) =>
  closeRequests(currentUserId, receiverId, "cancelled");

// removes the friendship on both sides and marks the old accepted
// request as removed so it can't come back
export const removeFriend = async (currentUserId, friendId) => {
  const [mine, theirs] = await Promise.all([
    findRequests(currentUserId, friendId, "accepted"),
    findRequests(friendId, currentUserId, "accepted"),
  ]);

  const batch = writeBatch(db);
  batch.update(getUserDoc(currentUserId), { friends: arrayRemove(friendId) });
  batch.update(getUserDoc(friendId), { friends: arrayRemove(currentUserId) });
  [...mine.docs, ...theirs.docs].forEach((d) =>
    batch.update(d.ref, { status: "removed", updatedAt: serverTimestamp() })
  );
  await batch.commit();
  return true;
};
