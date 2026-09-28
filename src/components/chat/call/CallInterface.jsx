// components/chat/call/CallInterface.jsx
import { motion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
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
import webrtcService from "../../../service/webrtcService";

const CallInterface = ({
  callId,
  chat,
  currentUser,
  isInitiator,
  onEndCall,
  isVideo: initialIsVideo,
}) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVideo, setIsVideo] = useState(initialIsVideo);
  const [isConnected, setIsConnected] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callStartTime = useRef(null);
  const durationInterval = useRef(null);
  const audioElementRef = useRef(null);

  // Initialize call
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        console.log("Initializing call, isInitiator:", isInitiator);

        const stream = await webrtcService.initializeCall(isVideo);
        if (isMounted) {
          setLocalStream(stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }

        if (isInitiator) {
          const offer = await webrtcService.createOffer();
          await callService.sendCallSignal(callId, {
            type: "offer",
            data: offer,
          });
          console.log("Offer sent");
        }
      } catch (error) {
        console.error("Failed to initialize call:", error);
        onEndCall();
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle WebRTC events
  useEffect(() => {
    const handleEvent = (event, data) => {
      console.log("WebRTC Event:", event);

      switch (event) {
        case "remoteStream":
          console.log("✅ Got remote stream!");
          setRemoteStream(data);

          // Create audio element for playback
          if (data) {
            if (audioElementRef.current) {
              audioElementRef.current.pause();
              audioElementRef.current.srcObject = null;
            }
            audioElementRef.current = new Audio();
            audioElementRef.current.srcObject = data;
            audioElementRef.current.autoplay = true;
            audioElementRef.current.play().catch((e) => {
              console.log("Auto-play blocked, waiting for user interaction");
              // Create a one-time user interaction listener
              const playAudio = () => {
                if (audioElementRef.current) {
                  audioElementRef.current
                    .play()
                    .catch((e) => console.log("Play failed:", e));
                }
                document.removeEventListener("click", playAudio);
                document.removeEventListener("touchstart", playAudio);
              };
              document.addEventListener("click", playAudio);
              document.addEventListener("touchstart", playAudio);
            });
          }

          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = data;
          }
          setIsConnected(true);
          if (!callStartTime.current) {
            callStartTime.current = Date.now();
            durationInterval.current = setInterval(() => {
              if (callStartTime.current) {
                setCallDuration(
                  Math.floor((Date.now() - callStartTime.current) / 1000)
                );
              }
            }, 1000);
          }
          break;
        case "connectionState":
          console.log("Connection state:", data);
          if (data === "connected") {
            console.log("✅ Call connected!");
            setIsConnected(true);
            if (!callStartTime.current) {
              callStartTime.current = Date.now();
              durationInterval.current = setInterval(() => {
                if (callStartTime.current) {
                  setCallDuration(
                    Math.floor((Date.now() - callStartTime.current) / 1000)
                  );
                }
              }, 1000);
            }
          }
          break;
        case "audioToggled":
          setIsAudioMuted(data);
          break;
        case "videoToggled":
          setIsVideoMuted(data);
          break;
        case "screenShareStarted":
          setIsScreenSharing(true);
          break;
        case "screenShareStopped":
          setIsScreenSharing(false);
          break;
        case "callEnded":
          if (durationInterval.current) clearInterval(durationInterval.current);
          if (audioElementRef.current) {
            audioElementRef.current.pause();
            audioElementRef.current.srcObject = null;
          }
          onEndCall();
          break;
        default:
          break;
      }
    };

    webrtcService.addListener(handleEvent);
    return () => webrtcService.removeListener(handleEvent);
  }, [onEndCall]);

  // Handle signaling from Firestore
  useEffect(() => {
    const unsubscribe = callService.listenForCallSignals(
      callId,
      async (signal) => {
        console.log("Received signal:", signal.type);
        console.log(
          "Current signaling state:",
          webrtcService.peerConnection?.signalingState
        );

        try {
          switch (signal.type) {
            case "offer":
              console.log("Processing offer...");
              const answer = await webrtcService.handleOffer(signal.data);
              if (answer) {
                console.log("Sending answer back");
                await callService.sendCallSignal(callId, {
                  type: "answer",
                  data: answer,
                });
              }
              break;
            case "answer":
              console.log("Processing answer...");
              await webrtcService.handleAnswer(signal.data);
              console.log("Answer processed");
              break;
            case "ice-candidate":
              await webrtcService.handleIceCandidate(signal.data);
              break;
            default:
              break;
          }
        } catch (error) {
          console.error("Error handling signal:", error);
        }
      }
    );

    return () => unsubscribe();
  }, [callId]);

  // Listen for call end from Firestore
  useEffect(() => {
    const unsubscribe = callService.listenForCall(callId, (callData) => {
      if (
        callData &&
        (callData.status === "ended" ||
          callData.status === "rejected" ||
          callData.status === "missed")
      ) {
        console.log("Call ended by remote user");
        if (durationInterval.current) clearInterval(durationInterval.current);
        if (audioElementRef.current) {
          audioElementRef.current.pause();
          audioElementRef.current.srcObject = null;
        }
        webrtcService.endCall();
        onEndCall();
      }
    });
    return () => unsubscribe();
  }, [callId, onEndCall]);

  // Update video refs
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const handleEndCall = async () => {
    console.log("Ending call");
    if (callStartTime.current) {
      const duration = Math.floor((Date.now() - callStartTime.current) / 1000);
      await callService.endCall(callId, duration);
    }
    if (durationInterval.current) clearInterval(durationInterval.current);
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.srcObject = null;
    }
    webrtcService.endCall();
    onEndCall();
  };
  useEffect(() => {
    // Function to force audio playback on user interaction
    const enableAudio = () => {
      if (audioElementRef.current) {
        audioElementRef.current
          .play()
          .catch((e) => console.log("Play failed:", e));
      }
      // Also try to resume any AudioContext
      if (window.AudioContext || window.webkitAudioContext) {
        const audioContext = new (window.AudioContext ||
          window.webkitAudioContext)();
        audioContext
          .resume()
          .then(() => {
            console.log("AudioContext resumed");
          })
          .catch((e) => console.log("AudioContext resume failed:", e));
      }
      // Remove listeners after first interaction
      document.removeEventListener("click", enableAudio);
      document.removeEventListener("touchstart", enableAudio);
    };

    // Add listeners for user interaction to enable audio
    document.addEventListener("click", enableAudio);
    document.addEventListener("touchstart", enableAudio);

    return () => {
      document.removeEventListener("click", enableAudio);
      document.removeEventListener("touchstart", enableAudio);
    };
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  if (isMinimized) {
    return (
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed bottom-4 right-4 w-80 bg-gray-900 rounded-2xl shadow-2xl z-50 overflow-hidden cursor-pointer"
        onClick={() => setIsMinimized(false)}
      >
        <div className="relative h-48">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center bg-black/50 rounded-lg px-3 py-2">
            <span className="text-white text-sm font-mono">
              {formatTime(callDuration)}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEndCall();
              }}
              className="p-1.5 bg-red-500 rounded-full"
            >
              <FiPhoneOff className="text-white text-sm" />
            </button>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(false);
            }}
            className="absolute top-2 right-2 p-1 bg-black/50 rounded-full"
          >
            <FiMaximize2 className="text-white text-xs" />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      id="call-container"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-gray-900 z-50 flex flex-col"
    >
      <div className="flex-1 relative bg-black">
        {!isConnected && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white text-lg">Connecting...</p>
              <p className="text-white/60 text-sm mt-2">Please wait</p>
            </div>
          </div>
        )}

        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {isVideo && (
          <div className="absolute bottom-4 right-4 w-40 h-56 bg-gray-800 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {isVideoMuted && (
              <div className="absolute bottom-2 left-2 bg-black/50 rounded-full p-1">
                <FiVideoOff className="text-white text-xs" />
              </div>
            )}
          </div>
        )}

        <div className="absolute top-4 left-4 bg-black/50 rounded-lg px-4 py-2">
          <p className="text-white font-semibold">{chat.name}</p>
          <p className="text-white/70 text-sm font-mono">
            {formatTime(callDuration)}
          </p>
          <p className="text-white/50 text-xs mt-1">
            {isConnected ? "Connected" : "Connecting..."}
          </p>
        </div>
      </div>

      <div className="bg-gray-800 px-6 py-4 flex justify-center gap-3">
        <button
          onClick={() => webrtcService.toggleAudio()}
          className={`p-4 rounded-full ${
            isAudioMuted ? "bg-red-500" : "bg-gray-600"
          }`}
        >
          {isAudioMuted ? (
            <FiMicOff className="text-white text-xl" />
          ) : (
            <FiMic className="text-white text-xl" />
          )}
        </button>

        {isVideo && (
          <button
            onClick={() => webrtcService.toggleVideo()}
            className={`p-4 rounded-full ${
              isVideoMuted ? "bg-red-500" : "bg-gray-600"
            }`}
          >
            {isVideoMuted ? (
              <FiVideoOff className="text-white text-xl" />
            ) : (
              <FiVideo className="text-white text-xl" />
            )}
          </button>
        )}

        <button onClick={handleEndCall} className="p-4 bg-red-500 rounded-full">
          <FiPhoneOff className="text-white text-xl" />
        </button>

        <button
          onClick={() => webrtcService.toggleScreenShare()}
          className={`p-4 rounded-full ${
            isScreenSharing ? "bg-green-500" : "bg-gray-600"
          }`}
        >
          <FiMonitor className="text-white text-xl" />
        </button>

        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-4 bg-gray-600 rounded-full"
        >
          <FiMaximize2 className="text-white text-xl" />
        </button>

        <button
          onClick={() => setIsMinimized(true)}
          className="p-4 bg-gray-600 rounded-full"
        >
          <FiMinimize2 className="text-white text-xl" />
        </button>
      </div>
    </motion.div>
  );
};

export default CallInterface;
