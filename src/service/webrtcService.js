import callService from "../firebase/callService";

const ICE_SERVERS = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

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

  const start = async () => {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: isVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    });

    if (closed) {
      localStream.getTracks().forEach((track) => track.stop());
      return;
    }
    onLocalStream?.(localStream);

    pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
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

    pc.onconnectionstatechange = () => onConnectionChange?.(pc.connectionState);

    unsubscribeSignals = callService.listenForCallSignals(callId, userId, (signal) => {
      queue = queue
        .then(() => handleSignal(signal))
        .catch((error) => console.error("Error handling call signal:", error));
    });

    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await callService.sendCallSignal(callId, userId, "offer", plainDescription(offer));
    }
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
