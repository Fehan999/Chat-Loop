import callService from "../firebase/callService";

// stun finds the public address, turn relays the audio/video when two networks can't
// reach each other directly (mobile data, strict wifi). set your own turn server in .env
// for calls that connect everywhere, the public one below is only a fallback
const env = import.meta.env;
const TURN_SERVERS = env.VITE_TURN_URLS
  ? [
      {
        urls: env.VITE_TURN_URLS.split(",").map((url) => url.trim()),
        username: env.VITE_TURN_USERNAME,
        credential: env.VITE_TURN_CREDENTIAL,
      },
    ]
  : [
      {
        urls: [
          "turn:openrelay.metered.ca:80",
          "turn:openrelay.metered.ca:443",
          "turn:openrelay.metered.ca:443?transport=tcp",
        ],
        username: "openrelayproject",
        credential: "openrelayproject",
      },
    ];

const ICE_SERVERS = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ...TURN_SERVERS,
];

// how long to wait for an ice restart before giving up on the call
const RECONNECT_GRACE_MS = 15 * 1000;

// firestore can't store class instances, so descriptions go over as plain objects
const plainDescription = (description) => ({
  type: description.type,
  sdp: description.sdp,
});

// one session per call. it owns the peer connection, the local media and the
// signal listener, and close() tears all of it down
export const createCallSession = ({
  callId,
  userId,
  isVideo,
  isInitiator,
  onLocalStream,
  onRemoteStream,
  onConnectionChange,
}) => {
  let pc = null;
  let localStream = null;
  let screenTrack = null;
  let unsubscribeSignals = null;
  let closed = false;
  let restarting = false;
  let restartTimer = null;
  const pendingIce = [];

  // signals are handled one at a time, otherwise an ice candidate can land
  // while the offer is still being applied
  let queue = Promise.resolve();

  const flushIce = async () => {
    while (pendingIce.length) {
      try {
        await pc.addIceCandidate(pendingIce.shift());
      } catch (error) {
        console.warn("Dropped an ice candidate:", error);
      }
    }
  };

  const handleSignal = async ({ type, data }) => {
    if (closed || !pc) return;

    if (type === "offer") {
      await pc.setRemoteDescription(data);
      await flushIce();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await callService.sendCallSignal(callId, userId, "answer", plainDescription(answer));
    } else if (type === "answer") {
      if (pc.signalingState !== "have-local-offer") return;
      await pc.setRemoteDescription(data);
      await flushIce();
    } else if (type === "ice-candidate") {
      if (pc.remoteDescription) await pc.addIceCandidate(data);
      else pendingIce.push(data);
    }
  };

  const sendOffer = async (options) => {
    const offer = await pc.createOffer(options);
    await pc.setLocalDescription(offer);
    await callService.sendCallSignal(callId, userId, "offer", plainDescription(offer));
  };

  // a network switch (wifi -> mobile data) makes the connection fail. the caller
  // restarts ice once, and both sides wait a bit before calling it lost
  const handleConnectionState = () => {
    if (!pc) return;
    const state = pc.connectionState;

    if (state === "connected") {
      clearTimeout(restartTimer);
      restarting = false;
    }

    if (state === "failed" && !restarting) {
      restarting = true;
      onConnectionChange?.("reconnecting");
      if (isInitiator) {
        sendOffer({ iceRestart: true }).catch((error) =>
          console.error("Ice restart failed:", error)
        );
      }
      restartTimer = setTimeout(() => {
        if (pc && pc.connectionState !== "connected") onConnectionChange?.("failed");
      }, RECONNECT_GRACE_MS);
      return;
    }

    if (state !== "failed") onConnectionChange?.(state);
  };

  const start = async () => {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: isVideo
        ? { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }
        : false,
    });

    if (closed) {
      localStream.getTracks().forEach((track) => track.stop());
      return;
    }
    onLocalStream?.(localStream);

    // a small candidate pool starts gathering before the offer, so calls connect sooner
    pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, iceCandidatePoolSize: 4 });
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        callService.sendCallSignal(callId, userId, "ice-candidate", event.candidate.toJSON());
      }
    };

    const fallbackRemote = new MediaStream();
    pc.ontrack = (event) => {
      if (event.streams[0]) {
        onRemoteStream?.(event.streams[0]);
      } else {
        fallbackRemote.addTrack(event.track);
        onRemoteStream?.(fallbackRemote);
      }
    };

    pc.onconnectionstatechange = handleConnectionState;

    unsubscribeSignals = callService.listenForCallSignals(callId, userId, (signal) => {
      queue = queue
        .then(() => handleSignal(signal))
        .catch((error) => console.error("Error handling call signal:", error));
    });

    if (isInitiator) await sendOffer();
  };

  // each toggle returns the new "is off" state for the button
  const toggleAudio = () => {
    const track = localStream?.getAudioTracks()[0];
    if (!track) return false;
    track.enabled = !track.enabled;
    return !track.enabled;
  };

  const toggleVideo = () => {
    const track = localStream?.getVideoTracks()[0];
    if (!track) return false;
    track.enabled = !track.enabled;
    return !track.enabled;
  };

  const videoSender = () => pc?.getSenders().find((s) => s.track?.kind === "video");

  const stopScreenShare = async () => {
    if (!screenTrack) return false;
    screenTrack.stop();
    screenTrack = null;
    const cameraTrack = localStream?.getVideoTracks()[0];
    if (cameraTrack) await videoSender()?.replaceTrack(cameraTrack);
    onLocalStream?.(localStream);
    return false;
  };

  // swaps the camera track for the screen without renegotiating
  const startScreenShare = async (onStopped) => {
    const sender = videoSender();
    if (!sender || !navigator.mediaDevices.getDisplayMedia) return false;

    const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
    screenTrack = display.getVideoTracks()[0];
    await sender.replaceTrack(screenTrack);
    onLocalStream?.(display);

    screenTrack.onended = async () => {
      await stopScreenShare();
      onStopped?.();
    };
    return true;
  };

  const close = () => {
    closed = true;
    clearTimeout(restartTimer);
    unsubscribeSignals?.();
    screenTrack?.stop();
    localStream?.getTracks().forEach((track) => track.stop());
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
    }
    pc = null;
  };

  return { start, toggleAudio, toggleVideo, startScreenShare, stopScreenShare, close };
};
