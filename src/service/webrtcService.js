// service/webrtcService.js
class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.callListeners = new Set();
    this.pendingIceCandidates = [];

    this.configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: "turn:openrelay.metered.ca:80",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
      ],
    };
  }

  async initializeCall(isVideo = true) {
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: isVideo,
    });

    this.createPeerConnection();

    this.localStream.getTracks().forEach((track) => {
      this.peerConnection.addTrack(track, this.localStream);
    });

    return this.localStream;
  }

  createPeerConnection() {
    this.peerConnection = new RTCPeerConnection(this.configuration);

    // ICE
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.notifyListeners("iceCandidate", event.candidate);
      }
    };

    // REMOTE STREAM
    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      this.notifyListeners("remoteStream", this.remoteStream);
    };

    // CONNECTION STATE
    this.peerConnection.onconnectionstatechange = () => {
      console.log("Connection:", this.peerConnection.connectionState);
    };
  }

  async createOffer() {
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  async handleOffer(offer) {
    if (!this.peerConnection) this.createPeerConnection();

    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(offer)
    );

    // Add queued ICE
    for (const c of this.pendingIceCandidates) {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(c));
    }
    this.pendingIceCandidates = [];

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    return answer;
  }

  async handleAnswer(answer) {
    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(answer)
    );
  }

  async handleIceCandidate(candidate) {
    if (!this.peerConnection.remoteDescription) {
      this.pendingIceCandidates.push(candidate);
      return;
    }

    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  endCall() {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.peerConnection?.close();
  }

  addListener(cb) {
    this.callListeners.add(cb);
  }

  notifyListeners(event, data) {
    this.callListeners.forEach((cb) => cb(event, data));
  }
}

export default new WebRTCService();
