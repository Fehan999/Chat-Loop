// components/chat/VoiceRecorder.jsx
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import { FiMic, FiSend, FiTrash2 } from "react-icons/fi";

const VoiceRecorder = ({ onSendVoice, onCancel, onMinimize }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [waveform, setWaveform] = useState(Array(30).fill(0));
  const [isHolding, setIsHolding] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  const holdTimeoutRef = useRef(null);

  // Animate waveform
  const animateWaveform = () => {
    const newWaveform = waveform.map(() => {
      if (!isRecording) return 0;
      return Math.random() * 30 + 10;
    });
    setWaveform(newWaveform);
    animationRef.current = requestAnimationFrame(animateWaveform);
  };

  useEffect(() => {
    if (isRecording) {
      animateWaveform();
    } else {
      cancelAnimationFrame(animationRef.current);
      setWaveform(Array(30).fill(0));
    }
    return () => cancelAnimationFrame(animationRef.current);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(audioUrl);
        setShowPreview(true);

        const audio = new Audio(audioUrl);
        audio.onloadedmetadata = () => {
          audioBlob.duration = audio.duration;
        };
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setIsHolding(true);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Please allow microphone access to record voice messages");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      setIsHolding(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    }
  };

  const handleMouseDown = () => {
    if (showPreview) return;
    holdTimeoutRef.current = setTimeout(() => {
      startRecording();
    }, 200);
  };

  const handleMouseUp = () => {
    clearTimeout(holdTimeoutRef.current);
    if (isRecording && !showPreview) {
      stopRecording();
    } else if (!showPreview && !isRecording) {
      onCancel();
    }
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    if (showPreview) return;
    holdTimeoutRef.current = setTimeout(() => {
      startRecording();
    }, 200);
  };

  const handleTouchEnd = () => {
    clearTimeout(holdTimeoutRef.current);
    if (isRecording && !showPreview) {
      stopRecording();
    } else if (!showPreview && !isRecording) {
      onCancel();
    }
  };

  const sendVoiceMessage = async () => {
    if (audioBlob) {
      await onSendVoice(audioBlob, audioBlob.duration || recordingTime);
      cancelRecording();
    }
  };

  const cancelRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setShowPreview(false);
    setIsRecording(false);
    onCancel();
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
      <AnimatePresence mode="wait">
        {!showPreview ? (
          <motion.div
            key="recording"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isRecording && (
                  <>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-sm text-gray-600">
                        {formatTime(recordingTime)}
                      </span>
                    </div>
                    <div className="flex items-center gap-[2px] h-10">
                      {waveform.map((height, i) => (
                        <div
                          key={i}
                          className="w-1 bg-indigo-500 rounded-full transition-all duration-75"
                          style={{ height: `${height}px` }}
                        />
                      ))}
                    </div>
                  </>
                )}
                {!isRecording && (
                  <span className="text-sm text-gray-400">
                    Hold to record • Release to send
                  </span>
                )}
              </div>

              <button
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className={`w-14 h-14 rounded-full transition-all transform active:scale-95 ${
                  isRecording
                    ? "bg-red-500 shadow-lg scale-110"
                    : "bg-indigo-500 hover:bg-indigo-600 shadow-md"
                }`}
              >
                <FiMic className="w-6 h-6 text-white mx-auto" />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <button
                  onClick={cancelRecording}
                  className="w-10 h-10 rounded-full bg-gray-100 text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center"
                >
                  <FiTrash2 />
                </button>

                <div className="flex-1 bg-gray-100 rounded-full px-4 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Voice message •{" "}
                      {formatTime(audioBlob?.duration || recordingTime)}
                    </span>
                    <audio ref={audioRef} src={audioUrl} className="hidden" />
                  </div>
                  <div className="h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 transition-all"
                      style={{ width: `0%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={sendVoiceMessage}
                  className="w-10 h-10 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center justify-center"
                >
                  <FiSend />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VoiceRecorder;
