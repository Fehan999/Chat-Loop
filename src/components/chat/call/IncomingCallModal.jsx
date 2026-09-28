import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { FiPhone, FiPhoneOff, FiVideo } from "react-icons/fi";
import callService, { RING_TIMEOUT_MS } from "../../../firebase/callService";
import { avatarFor } from "../../../utils/userDisplay";

// rings until answered, declined, or the caller gives up
const IncomingCallModal = ({ call, onAccept, onReject, onDismiss }) => {
  const audioRef = useRef(null);
  // parent passes a new function every render, keep the latest without re-running the effect
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    const dismiss = () => dismissRef.current();
    const audio = audioRef.current;
    if (audio) {
      audio.volume = 0.6;
      audio.play().catch(() => {
        // autoplay blocked until the user interacts with the page, the modal still shows
      });
    }

    const unsubscribe = callService.listenForCall(call.id, (data) => {
      if (!data || data.status !== "calling") dismiss();
    });
    const timeout = setTimeout(dismiss, RING_TIMEOUT_MS + 5000);

    return () => {
      audio?.pause();
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [call.id]);

  const Icon = call.isVideo ? FiVideo : FiPhone;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[75] flex items-end justify-center bg-gray-900/60 p-4 backdrop-blur-sm sm:items-center"
    >
      <audio ref={audioRef} src="/ringtone.mp3" loop preload="auto" />

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl"
      >
        <div className="relative mx-auto mb-4 h-24 w-24">
          <span className="absolute inset-0 animate-ping rounded-full bg-indigo-200" />
          <img
            src={call.callerAvatar || avatarFor({ name: call.callerName })}
            alt=""
            className="relative h-24 w-24 rounded-full object-cover ring-4 ring-white"
          />
        </div>
        <h3 className="relative text-xl font-semibold text-gray-900">{call.callerName || "Someone"}</h3>
        <p className="relative mt-1 flex items-center justify-center gap-1.5 text-sm text-gray-500">
          <Icon /> Incoming {call.isVideo ? "video" : "voice"} call
        </p>

        <div className="mt-8 flex justify-center gap-10">
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => onReject(call)}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30 transition hover:bg-red-600"
              aria-label="Decline"
            >
              <FiPhoneOff className="text-xl" />
            </button>
            <span className="text-xs text-gray-500">Decline</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => onAccept(call)}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600"
              aria-label="Accept"
            >
              <Icon className="text-xl" />
            </button>
            <span className="text-xs text-gray-500">Accept</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default IncomingCallModal;
