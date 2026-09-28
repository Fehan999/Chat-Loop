import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { AI_CHAT_KEY, APP_NAME, MESSAGE_PAGE_SIZE } from "../../constants";
import callService from "../../firebase/callService";
import {
  chatIdFor,
  getOrCreateChat,
  listenToAnnouncement,
  listenToChats,
  listenToMessages,
  listenToUser,
  markMessagesAsRead,
  sendMessage,
} from "../../firebase/firestoreService";
import { listenToIncomingRequests } from "../../firebase/friendService";
import { reportUser } from "../../firebase/messageActions";
import { useLiveProfiles } from "../../hooks/useLiveProfiles";
import { useIsMobile, usePageVisible } from "../../hooks/useMediaQuery";
import { playNotificationSound, showDesktopNotification } from "../../utils/notify";
import { resolvePresence } from "../../utils/statusHelper";
import { avatarFor, displayName, formatUsername } from "../../utils/userDisplay";
import SplashScreen from "../common/SplashScreen";
import AddFriendPage from "./add_friend/AddFriendPage";
import AIChatArea from "./ai/AIChatArea";
import AnnouncementBanner from "./AnnouncementBanner";
import BannedScreen from "./BannedScreen";
import CallInterface from "./call/CallInterface";
import IncomingCallModal from "./call/IncomingCallModal";
import ChatArea from "./ChatArea";
import ReportUserModal from "./ReportUserModal";
import SettingsPanel from "./SettingsPanel";
import Sidebar from "./Sidebar";
import WelcomePlaceholder from "./WelcomePlaceholder";

const NO_MESSAGES = [];

const ChatDashboard = ({ user }) => {
  const uid = user.uid;
  const isMobile = useIsMobile();
  const pageVisible = usePageVisible();

  const [userData, setUserData] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [chats, setChats] = useState([]);
  const [chatsLoaded, setChatsLoaded] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [announcement, setAnnouncement] = useState(null);

  // conversations are keyed by the other person's uid (or the ai key),
  // which also works for friends we haven't messaged yet
  const [selectedKey, setSelectedKey] = useState(null);
  const [messageState, setMessageState] = useState({ chatId: null, list: NO_MESSAGES });
  const [paging, setPaging] = useState({ chatId: null, limit: MESSAGE_PAGE_SIZE });

  const [panel, setPanel] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);

  const me = useMemo(
    () => ({ id: uid, name: displayName(userData || user), avatar: avatarFor(userData || user) }),
    [uid, userData, user]
  );

  // own profile, live so admin edits, bans and friend changes show up instantly
  useEffect(
    () =>
      listenToUser(uid, (data) => {
        setUserData(data);
        setProfileLoaded(true);
      }),
    [uid]
  );

  useEffect(() => listenToAnnouncement(setAnnouncement), []);

  const friendIds = useMemo(() => userData?.friends || [], [userData?.friends]);
  const otherIds = useMemo(
    () => [...chats.map((chat) => chat.otherUserId), ...friendIds],
    [chats, friendIds]
  );
  const profiles = useLiveProfiles(otherIds);

  // everything the sidebar needs, one row per person
  const sidebarChats = useMemo(() => {
    const chatByUser = new Map();
    chats.forEach((chat) => chat.otherUserId && chatByUser.set(chat.otherUserId, chat));
    const ids = new Set([...chatByUser.keys(), ...friendIds]);

    const rows = [];
    ids.forEach((otherId) => {
      const profile = profiles[otherId];
      if (!profile) return;

      const chat = chatByUser.get(otherId);
      const { status, lastSeen } = resolvePresence(profile);
      rows.push({
        key: otherId,
        userId: otherId,
        chatId: chat?.id || chatIdFor(uid, otherId),
        exists: !!chat,
        profile,
        name: displayName(profile),
        username: formatUsername(profile.username),
        avatar: avatarFor(profile),
        status,
        lastSeen,
        lastMessage: chat?.lastMessage || "",
        lastMessageMine: chat?.lastMessageSender === uid,
        lastMessageTime: chat?.lastMessage ? chat.lastMessageTime : null,
        unreadCount: chat?.unreadCounts?.[uid] || 0,
        isFriend: friendIds.includes(otherId),
      });
    });

    const timeOf = (row) => row.lastMessageTime?.getTime() || 0;
    return rows.sort((a, b) => timeOf(b) - timeOf(a) || a.name.localeCompare(b.name));
  }, [chats, friendIds, profiles, uid]);

  const selectedChat =
    selectedKey && selectedKey !== AI_CHAT_KEY
      ? sidebarChats.find((row) => row.key === selectedKey) || null
      : null;
  const activeChatId = selectedChat?.exists ? selectedChat.chatId : null;

  // refs so long lived listeners always see the latest values
  const latest = useRef({});
  latest.current = { selectedKey, sidebarChats, pageVisible, activeCall };

  const notifyIncomingMessage = useCallback((chat) => {
    if (!chat.lastMessage) return;
    const { selectedKey: openKey, sidebarChats: rows, pageVisible: visible } = latest.current;
    if (openKey === chat.otherUserId && visible) return;

    playNotificationSound();
    const row = rows.find((r) => r.key === chat.otherUserId);
    showDesktopNotification(row?.name || APP_NAME, chat.lastMessage, row?.avatar);
  }, []);

  // the chat docs carry the last message, so new-message sounds come from here
  // instead of a listener on every conversation's messages
  const lastMessageTimes = useRef(null);
  useEffect(() => {
    lastMessageTimes.current = null;
    return listenToChats(uid, (list) => {
      const previous = lastMessageTimes.current;
      const next = {};
      list.forEach((chat) => {
        const time = chat.lastMessageTime?.getTime() || 0;
        next[chat.id] = time;
        const isNewer = previous && time > (previous[chat.id] ?? 0);
        if (isNewer && chat.lastMessageSender && chat.lastMessageSender !== uid) {
          notifyIncomingMessage(chat);
        }
      });
      lastMessageTimes.current = next;
      setChats(list);
      setChatsLoaded(true);
    });
  }, [uid, notifyIncomingMessage]);

  const knownRequestIds = useRef(null);
  useEffect(() => {
    knownRequestIds.current = null;
    return listenToIncomingRequests(uid, (requests) => {
      const known = knownRequestIds.current;
      if (known) {
        requests
          .filter((request) => !known.has(request.id))
          .forEach((request) => {
            playNotificationSound();
            toast(`${request.name} sent you a friend request`, { icon: "👋" });
          });
      }
      knownRequestIds.current = new Set(requests.map((request) => request.id));
      setIncomingRequests(requests);
    });
  }, [uid]);

  // paging belongs to one chat, switching conversations starts from the latest page again
  const messageLimit = paging.chatId === activeChatId ? paging.limit : MESSAGE_PAGE_SIZE;

  useEffect(() => {
    if (!activeChatId) return undefined;
    return listenToMessages(
      activeChatId,
      (list) => setMessageState({ chatId: activeChatId, list }),
      messageLimit
    );
  }, [activeChatId, messageLimit]);

  // never show the previous chat's messages while the next one loads
  const messages = messageState.chatId === activeChatId ? messageState.list : NO_MESSAGES;
  const messagesLoading = !!activeChatId && messageState.chatId !== activeChatId;

  // read receipts only go out while the chat is open and the tab is in front
  const selectedUnread = selectedChat?.unreadCount || 0;
  useEffect(() => {
    if (!activeChatId || !pageVisible) return;
    const hasUnread = messages.some((m) => !m.read && m.senderId !== uid && !m.pending);
    if (hasUnread || selectedUnread > 0) markMessagesAsRead(activeChatId, uid, messages);
  }, [activeChatId, messages, pageVisible, selectedUnread, uid]);

  const totalUnread = sidebarChats.reduce((sum, row) => sum + row.unreadCount, 0);
  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) ${APP_NAME}` : APP_NAME;
    return () => {
      document.title = APP_NAME;
    };
  }, [totalUnread]);

  const openConversation = useCallback(
    async (key) => {
      setSelectedKey(key);
      setPanel(null);
      if (key === AI_CHAT_KEY) return;
      const row = latest.current.sidebarChats.find((r) => r.key === key);
      if (!row?.exists) await getOrCreateChat(uid, key);
    },
    [uid]
  );

  const handleSendMessage = async (text, attachments = []) => {
    if (!selectedChat) return false;
    if (!selectedChat.exists) await getOrCreateChat(uid, selectedChat.userId);

    const ok = await sendMessage(
      selectedChat.chatId,
      {
        text: text.trim(),
        senderId: uid,
        senderName: me.name,
        senderAvatar: me.avatar,
        attachments,
      },
      selectedChat.userId
    );
    if (!ok) toast.error("Message didn't send. Check your connection and try again.");
    return ok;
  };

  const startCall = async (isVideo) => {
    if (!selectedChat) return;
    if (activeCall) {
      toast("You're already on a call.");
      return;
    }
    try {
      if (!selectedChat.exists) await getOrCreateChat(uid, selectedChat.userId);
      const callId = await callService.initiateCall({
        chatId: selectedChat.chatId,
        caller: me,
        callee: { id: selectedChat.userId, name: selectedChat.name },
        isVideo,
      });
      setActiveCall({
        id: callId,
        isVideo,
        isInitiator: true,
        peer: { id: selectedChat.userId, name: selectedChat.name, avatar: selectedChat.avatar },
      });
    } catch (error) {
      toast.error(error.message || "Couldn't start the call.");
    }
  };

  useEffect(
    () =>
      callService.listenForIncomingCalls(uid, (call) => {
        if (latest.current.activeCall) return;
        setIncomingCall((current) => current || call);
      }),
    [uid]
  );

  const acceptIncomingCall = async (call) => {
    setIncomingCall(null);
    try {
      await callService.acceptCall(call.id);
      const caller = profiles[call.callerId];
      setActiveCall({
        id: call.id,
        isVideo: call.isVideo,
        isInitiator: false,
        peer: {
          id: call.callerId,
          name: call.callerName,
          avatar: caller
            ? avatarFor(caller)
            : call.callerAvatar || avatarFor({ name: call.callerName }),
        },
      });
      setSelectedKey(call.callerId);
    } catch {
      toast.error("Couldn't join the call.");
    }
  };

  const declineIncomingCall = (call) => {
    setIncomingCall(null);
    callService.rejectCall(call.id);
  };

  const submitUserReport = async ({ reason, details }) => {
    const ok = await reportUser(reportTarget, uid, reason, details);
    if (ok) toast.success("Thanks, we'll take a look.");
    else toast.error("Couldn't send the report.");
    setReportTarget(null);
  };

  if (!profileLoaded || !chatsLoaded) return <SplashScreen label="Loading your chats..." />;
  if (userData?.banned) return <BannedScreen reason={userData.banReason} />;

  const showingConversation = selectedKey === AI_CHAT_KEY || !!selectedChat;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-gray-50">
      <AnnouncementBanner announcement={announcement} />

      <div className="flex min-h-0 flex-1">
        <div
          className={`${
            isMobile ? (showingConversation ? "hidden" : "w-full") : "w-[340px] xl:w-[380px]"
          } h-full flex-shrink-0 border-r border-gray-100`}
        >
          <Sidebar
            chats={sidebarChats}
            selectedKey={selectedKey}
            onSelectChat={openConversation}
            onOpenFriends={() => setPanel("friends")}
            onOpenSettings={() => setPanel("settings")}
            requestCount={incomingRequests.length}
            me={{ ...me, username: formatUsername(userData?.username) }}
          />
        </div>

        <main className={`min-w-0 flex-1 ${isMobile && !showingConversation ? "hidden" : "flex"}`}>
          {selectedKey === AI_CHAT_KEY ? (
            <AIChatArea me={me} onBack={isMobile ? () => setSelectedKey(null) : null} />
          ) : selectedChat ? (
            <ChatArea
              key={selectedChat.key}
              chat={selectedChat}
              messages={messages}
              loading={messagesLoading}
              hasMore={messages.length >= messageLimit}
              onLoadMore={() =>
                setPaging({ chatId: activeChatId, limit: messageLimit + MESSAGE_PAGE_SIZE })
              }
              onSendMessage={handleSendMessage}
              onReportUser={setReportTarget}
              onStartCall={startCall}
              callInProgress={!!activeCall}
              onBack={isMobile ? () => setSelectedKey(null) : null}
              currentUser={user}
            />
          ) : (
            <WelcomePlaceholder
              name={me.name}
              onFindFriends={() => setPanel("friends")}
              onOpenAI={() => openConversation(AI_CHAT_KEY)}
            />
          )}
        </main>
      </div>

      <AnimatePresence>
        {panel === "settings" && userData && (
          <SettingsPanel user={{ ...userData, uid, email: user.email }} onClose={() => setPanel(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {panel === "friends" && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed inset-0 z-40 bg-white"
          >
            <AddFriendPage
              currentUserId={uid}
              friendIds={friendIds}
              incomingRequests={incomingRequests}
              onBack={() => setPanel(null)}
              onOpenChat={openConversation}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <ReportUserModal
        isOpen={!!reportTarget}
        user={reportTarget}
        onClose={() => setReportTarget(null)}
        onSubmit={submitUserReport}
      />

      <AnimatePresence>
        {incomingCall && (
          <IncomingCallModal
            call={incomingCall}
            onAccept={acceptIncomingCall}
            onReject={declineIncomingCall}
            onDismiss={() => setIncomingCall(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeCall && (
          <CallInterface
            call={activeCall}
            currentUserId={uid}
            onClose={() => setActiveCall(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatDashboard;
