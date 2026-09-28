// components/chat/call/IncomingCallModal.jsx
import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { FiPhone, FiPhoneOff, FiVideo } from "react-icons/fi";

const IncomingCallModal = ({ call, onAccept, onReject }) => {
  const audioRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Play ringtone
    const playRingtone = async () => {
      try {
        if (audioRef.current) {
          audioRef.current.loop = true;
          audioRef.current.volume = 0.5;
          await audioRef.current.play();
        }
      } catch (error) {
        console.log("Ringtone play failed:", error);
        // Fallback to Web Audio
        playFallbackRingtone();
      }
    };

    const playFallbackRingtone = () => {
      try {
        const audioContext = new (window.AudioContext ||
          window.webkitAudioContext)();

        const playBeep = () => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          const now = audioContext.currentTime;
          oscillator.frequency.value = 800;
          gainNode.gain.value = 0.3;
          oscillator.start(now);
          gainNode.gain.exponentialRampToValueAtTime(0.00001, now + 1);
          oscillator.stop(now + 1);
        };

        playBeep();
        timeoutRef.current = setInterval(playBeep, 2000);

        if (audioContext.state === "suspended") {
          audioContext.resume();
        }
      } catch (e) {
        console.log("Fallback ringtone failed:", e);
      }
    };

    playRingtone();

    // Auto reject after 30 seconds
    const autoRejectTimeout = setTimeout(() => {
      console.log("Auto rejecting call due to timeout");
      onReject(call.id);
    }, 30000);

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
      }
      clearTimeout(autoRejectTimeout);
    };
  }, [call.id, onReject]);

  const handleAccept = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (timeoutRef.current) {
      clearInterval(timeoutRef.current);
    }
    onAccept(call);
  };

  const handleReject = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (timeoutRef.current) {
      clearInterval(timeoutRef.current);
    }
    onReject(call.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
    >
      <audio ref={audioRef} src="/ringtone.mp3" preload="auto" />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-6 max-w-sm mx-4 text-center"
      >
        <div className="relative mb-4">
          <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
            {call.isVideo ? (
              <FiVideo className="text-indigo-500 text-4xl" />
            ) : (
              <FiPhone className="text-indigo-500 text-4xl" />
            )}
          </div>
          <div className="absolute -top-2 -right-2">
            <div className="w-4 h-4 bg-green-500 rounded-full animate-ping"></div>
          </div>
        </div>

        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Incoming {call.isVideo ? "Video" : "Audio"} Call
        </h3>

        <p className="text-gray-600 mb-2">
          From{" "}
          <span className="font-semibold">{call.callerName || "Unknown"}</span>
        </p>

        <p className="text-sm text-gray-400 mb-6">
          {call.isVideo
            ? "Video call is waiting..."
            : "Audio call is waiting..."}
        </p>

        <div className="flex gap-4">
          <button
            onClick={handleReject}
            className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
          >
            <FiPhoneOff />
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
          >
            {call.isVideo ? <FiVideo /> : <FiPhone />}
            Accept
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Ringing...</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default IncomingCallModal;
