import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  FiMaximize2,
  FiMic,
  FiMicOff,
  FiMinimize2,
  FiMonitor,
  FiPhoneOff,
  FiVideo,
  FiVideoOff,
} from "react-icons/fi";
import callService from "../../../firebase/callService";
import { createCallSession } from "../../../service/webrtcService";
import { formatDuration } from "../../../utils/dateUtils";

const END_MESSAGES = {
  rejected: "Call declined",
  missed: "No answer",
  ended: "Call ended",
};

// hanging up while the call doc is still being written would leave the other
// phone ringing, so status changes wait for that write first
const afterReady = (ready, fn) =>
  Promise.resolve(ready)
    .catch(() => {})
    .then(fn);

// stays mounted for the whole call, minimising only changes the layout so
// the media elements (and the audio) keep playing
const CallInterface = ({ call, currentUserId, onClose }) => {
  const [callStatus, setCallStatus] = useState(call.isInitiator ? "calling" : "active");
  const [connection, setConnection] = useState("new");
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const sessionRef = useRef(null);
  const connectedAtRef = useRef(null);
  const closedRef = useRef(false);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  // single exit path so the tracks always get stopped
  const finish = useRef(null);
  finish.current = (message) => {
    if (closedRef.current) return;
    closedRef.current = true;
    sessionRef.current?.close();
    if (message) toast(message, { icon: "📞" });
    onClose();
  };

  useEffect(() => {
    const session = createCallSession({
      callId: call.id,
      userId: currentUserId,
      isVideo: call.isVideo,
      isInitiator: call.isInitiator,
      onLocalStream: setLocalStream,
      onRemoteStream: setRemoteStream,
      onConnectionChange: (state) => {
        setConnection(state);
        if (state === "connected" && !connectedAtRef.current) connectedAtRef.current = Date.now();
        if (state === "failed") {
          callService.endCall(call.id, 0);
          finish.current("Connection lost");
        }
      },
    });
    sessionRef.current = session;

    session.start().catch((error) => {
      console.error("Call setup failed:", error);
      const denied = error.name === "NotAllowedError";
      afterReady(call.ready, () => {
        callService.missCall(call.id);
        callService.endCall(call.id, 0);
      });
      finish.current(
        denied ? "Camera or microphone access was blocked" : "Couldn't start the call"
      );
    });

    // the call doc is written while this screen is already up (see startCall)
    Promise.resolve(call.ready).catch((error) => {
      console.error("Call couldn't start:", error);
      finish.current(error?.message || "Couldn't start the call");
    });

    const unsubscribe = callService.listenForCall(call.id, (data) => {
      if (!data) return;
      setCallStatus(data.status);
      if (END_MESSAGES[data.status]) finish.current(END_MESSAGES[data.status]);
    });

    return () => {
      unsubscribe();
      session.close();
    };
  }, [call.id, call.isInitiator, call.isVideo, call.ready, currentUserId]);

  const connected = connection === "connected";
  const showRemoteVideo = call.isVideo && !!remoteStream && connected;

  // the video element only exists once we're connected, so this re-runs then
  useEffect(() => {
    const audio = remoteAudioRef.current;
    if (audio && audio.srcObject !== remoteStream) {
      audio.srcObject = remoteStream;
      // autoplay alone is flaky on ios safari, an explicit play() after a tap works
      if (remoteStream) audio.play().catch(() => {});
    }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream, minimized, showRemoteVideo]);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream, minimized]);

  useEffect(() => {
    if (connection !== "connected") return undefined;
    const timer = setInterval(
      () => setSeconds(Math.floor((Date.now() - connectedAtRef.current) / 1000)),
      1000
    );
    return () => clearInterval(timer);
  }, [connection]);

  // the screen closes right away, the call doc is updated behind it
  const hangUp = () => {
    const ringing = callStatus === "calling";
    const duration = connectedAtRef.current
      ? Math.floor((Date.now() - connectedAtRef.current) / 1000)
      : 0;
    finish.current();
    afterReady(call.ready, () =>
      ringing ? callService.missCall(call.id) : callService.endCall(call.id, duration)
    );
  };

  const toggleScreenShare = async () => {
    const session = sessionRef.current;
    try {
      if (sharing) {
        setSharing(await session.stopScreenShare());
      } else {
        setSharing(await session.startScreenShare(() => setSharing(false)));
      }
    } catch {
      setSharing(false);
    }
  };

  const statusLabel =
    callStatus === "calling"
      ? "Ringing..."
      : connected
        ? formatDuration(seconds)
        : connection === "disconnected" || connection === "reconnecting"
          ? "Reconnecting..."
          : "Connecting...";
  const canShareScreen = call.isVideo && !!navigator.mediaDevices?.getDisplayMedia;

  const controlClass = (active) =>
    `flex h-12 w-12 items-center justify-center rounded-full transition ${
      active ? "bg-white text-gray-900" : "bg-white/15 text-white hover:bg-white/25"
    }`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={
        minimized
          ? "fixed bottom-4 right-4 z-[70] w-72 overflow-hidden rounded-2xl bg-gray-900 shadow-2xl"
          : "fixed inset-0 z-[70] flex flex-col bg-gradient-to-b from-gray-900 to-indigo-950"
      }
    >
      <audio ref={remoteAudioRef} autoPlay className="hidden" />

      <div className={`relative ${minimized ? "h-40" : "flex-1"} overflow-hidden`}>
        {showRemoteVideo ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full bg-black object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center text-white">
            <div className="relative">
              {callStatus === "calling" && (
                <span className="absolute inset-0 animate-ping rounded-full bg-indigo-400/30" />
              )}
              <img
                src={call.peer.avatar}
                alt=""
                className={`relative rounded-full object-cover ring-4 ring-white/10 ${
                  minimized ? "h-16 w-16" : "h-28 w-28"
                }`}
              />
            </div>
            {!minimized && <h2 className="mt-5 text-2xl font-semibold">{call.peer.name}</h2>}
            <p className={`${minimized ? "mt-2 text-sm" : "mt-1"} font-mono text-indigo-200`}>
              {statusLabel}
            </p>
          </div>
        )}

        {showRemoteVideo && (
          <div className="absolute left-4 top-4 rounded-xl bg-black/40 px-3 py-2 text-white backdrop-blur">
            <p className="text-sm font-semibold">{call.peer.name}</p>
            <p className="font-mono text-xs text-white/70">{statusLabel}</p>
          </div>
        )}

        {call.isVideo && localStream && !minimized && (
          <div className="absolute bottom-4 right-4 h-44 w-32 overflow-hidden rounded-2xl border border-white/20 bg-gray-800 shadow-xl sm:h-52 sm:w-40">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full object-cover ${sharing ? "" : "-scale-x-100"}`}
            />
            {cameraOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white/60">
                <FiVideoOff className="text-2xl" />
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setMinimized((v) => !v)}
          className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50"
          aria-label={minimized ? "Expand call" : "Minimise call"}
        >
          {minimized ? <FiMaximize2 size={14} /> : <FiMinimize2 size={16} />}
        </button>
      </div>

      <div
        className={`flex items-center justify-center gap-3 ${minimized ? "py-3" : "pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-6"}`}
      >
        <button
          onClick={() => setMuted(sessionRef.current?.toggleAudio() ?? false)}
          className={controlClass(muted)}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <FiMicOff className="text-lg" /> : <FiMic className="text-lg" />}
        </button>

        {call.isVideo && (
          <button
            onClick={() => setCameraOff(sessionRef.current?.toggleVideo() ?? false)}
            className={controlClass(cameraOff)}
            aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}
          >
            {cameraOff ? <FiVideoOff className="text-lg" /> : <FiVideo className="text-lg" />}
          </button>
        )}

        {canShareScreen && !minimized && (
          <button
            onClick={toggleScreenShare}
            className={`${controlClass(sharing)} hidden sm:flex`}
            aria-label={sharing ? "Stop sharing" : "Share screen"}
          >
            <FiMonitor className="text-lg" />
          </button>
        )}

        <button
          onClick={hangUp}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30 transition hover:bg-red-600"
          aria-label="Hang up"
        >
          <FiPhoneOff className="text-xl" />
        </button>
      </div>
    </motion.div>
  );
};

export default CallInterface;
