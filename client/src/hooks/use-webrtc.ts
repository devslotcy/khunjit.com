import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

/**
 * IMPORTANT: WebRTC Requirements
 *
 * 1. HTTPS: getUserMedia requires HTTPS in production (except localhost)
 *    - Safari and mobile browsers are strict about this
 *    - If users report "camera not working", check HTTPS first
 *
 * 2. TURN Server: STUN-only works for ~80% of connections
 *    - Corporate networks, some mobile carriers need TURN
 *    - Add coturn server for production reliability
 */

// ICE Server configuration
// STUN: Free, helps with NAT traversal for most users
// TURN: Required for users behind symmetric NAT (corporate networks, some ISPs)
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    // Free Google STUN servers
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },

    // TODO: Add TURN server for better connectivity
    // Without TURN, ~15-20% of users may not connect (corporate networks, strict NAT)
    // Install coturn on your server and add:
    // {
    //   urls: "turn:YOUR_DOMAIN:3478",
    //   username: "webrtc",
    //   credential: "YOUR_SECRET"
    // },
    // {
    //   urls: "turn:YOUR_DOMAIN:3478?transport=tcp",
    //   username: "webrtc",
    //   credential: "YOUR_SECRET"
    // }
  ],
  iceCandidatePoolSize: 10,
};

export type ConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "failed"
  | "no_turn_fallback"; // Special state when STUN-only fails

interface UseWebRTCOptions {
  roomId: string;
  userId: string;
  role: "patient" | "psychologist";
  onRemoteStream?: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
  onError?: (error: string) => void;
}

interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionState: ConnectionState;
  isMicOn: boolean;
  isCameraOn: boolean;
  toggleMic: () => void;
  toggleCamera: () => void;
  startCall: () => Promise<void>;
  endCall: () => void;
  error: string | null;
}

export function useWebRTC({
  roomId,
  userId,
  role,
  onRemoteStream,
  onConnectionStateChange,
  onError,
}: UseWebRTCOptions): UseWebRTCReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const isCallerRef = useRef(false);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
  const iceConnectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update connection state and notify parent
  const updateConnectionState = useCallback(
    (state: ConnectionState) => {
      setConnectionState(state);
      onConnectionStateChange?.(state);
    },
    [onConnectionStateChange]
  );

  // Set error and notify parent
  const setErrorWithCallback = useCallback(
    (errorMessage: string) => {
      setError(errorMessage);
      onError?.(errorMessage);
    },
    [onError]
  );

  // Check if HTTPS is available (required for getUserMedia in production)
  const checkHTTPS = useCallback(() => {
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    const isHTTPS = window.location.protocol === "https:";

    if (!isLocalhost && !isHTTPS) {
      console.warn(
        "WARNING: WebRTC requires HTTPS in production. Camera/mic access may fail."
      );
    }
  }, []);

  // Initialize media stream
  const initializeMedia = useCallback(async () => {
    checkHTTPS();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err: unknown) {
      console.error("Error accessing media devices:", err);

      // Provide specific error messages
      const mediaError = err as { name?: string };
      if (mediaError.name === "NotAllowedError") {
        setErrorWithCallback(
          "Kamera veya mikrofon erişimi reddedildi. Lütfen tarayıcı izinlerini kontrol edin."
        );
      } else if (mediaError.name === "NotFoundError") {
        setErrorWithCallback(
          "Kamera veya mikrofon bulunamadı. Lütfen cihazlarınızı kontrol edin."
        );
      } else if (mediaError.name === "NotReadableError") {
        setErrorWithCallback(
          "Kamera veya mikrofon başka bir uygulama tarafından kullanılıyor."
        );
      } else {
        setErrorWithCallback(
          "Kamera veya mikrofon erişiminde bir hata oluştu."
        );
      }
      throw err;
    }
  }, [checkHTTPS, setErrorWithCallback]);

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    console.log("Creating RTCPeerConnection with ICE servers:", ICE_SERVERS);
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks to connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        console.log("Adding local track:", track.kind);
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log("Received remote track:", event.track.kind);
      const [stream] = event.streams;
      if (stream) {
        setRemoteStream(stream);
        onRemoteStream?.(stream);
      }
    };

    // Handle ICE candidates - send to other peer via signaling
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        // Don't log every candidate (too noisy), but log important ones
        if (event.candidate.type === "relay") {
          console.log("Sending TURN relay candidate");
        }
        socketRef.current.emit("webrtc-ice-candidate", {
          roomId,
          candidate: event.candidate.toJSON(),
          from: userId,
        });
      }
    };

    // Handle ICE gathering state
    pc.onicegatheringstatechange = () => {
      console.log("ICE gathering state:", pc.iceGatheringState);
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);

      // Clear timeout on any state change
      if (iceConnectionTimeoutRef.current) {
        clearTimeout(iceConnectionTimeoutRef.current);
        iceConnectionTimeoutRef.current = null;
      }

      switch (pc.connectionState) {
        case "connecting":
          updateConnectionState("connecting");
          break;
        case "connected":
          updateConnectionState("connected");
          setError(null); // Clear any previous errors
          break;
        case "disconnected":
          updateConnectionState("disconnected");
          break;
        case "failed":
          // Connection failed - likely STUN-only issue
          updateConnectionState("failed");
          setErrorWithCallback(
            "Bağlantı kurulamadı. Ağ ayarlarınızı kontrol edin veya farklı bir ağ deneyin."
          );
          break;
        case "closed":
          updateConnectionState("disconnected");
          break;
      }
    };

    // Handle ICE connection state - more granular than connectionState
    pc.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", pc.iceConnectionState);

      if (pc.iceConnectionState === "checking") {
        // Set a timeout - if we're stuck in "checking" for too long, TURN might be needed
        iceConnectionTimeoutRef.current = setTimeout(() => {
          if (pc.iceConnectionState === "checking") {
            console.warn(
              "ICE connection stuck in checking state - TURN server may be required"
            );
            // Don't fail yet, but warn
          }
        }, 10000); // 10 second timeout
      }

      if (pc.iceConnectionState === "failed") {
        // This often means STUN-only isn't enough
        console.error("ICE connection failed - TURN server may be required");
        setErrorWithCallback(
          "Bağlantı kurulamadı. Kurumsal ağda iseniz VPN kapatmayı deneyin."
        );
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [roomId, userId, onRemoteStream, updateConnectionState, setErrorWithCallback]);

  // Handle incoming offer (receiver side)
  const handleOffer = useCallback(
    async (sdp: RTCSessionDescriptionInit) => {
      console.log("Received offer, creating answer");
      const pc = peerConnectionRef.current;
      if (!pc) {
        console.error("No peer connection when handling offer");
        return;
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        console.log("Remote description set successfully");

        // Process queued ICE candidates now that remote description is set
        console.log(
          `Processing ${iceCandidatesQueue.current.length} queued ICE candidates`
        );
        while (iceCandidatesQueue.current.length > 0) {
          const candidate = iceCandidatesQueue.current.shift();
          if (candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
              console.warn("Error adding queued ICE candidate:", e);
            }
          }
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log("Local description (answer) set successfully");

        socketRef.current?.emit("webrtc-answer", {
          roomId,
          sdp: answer,
          from: userId,
        });
      } catch (err) {
        console.error("Error handling offer:", err);
        setErrorWithCallback("Bağlantı kurulurken bir hata oluştu.");
      }
    },
    [roomId, userId, setErrorWithCallback]
  );

  // Handle incoming answer (caller side)
  const handleAnswer = useCallback(
    async (sdp: RTCSessionDescriptionInit) => {
      console.log("Received answer");
      const pc = peerConnectionRef.current;
      if (!pc) {
        console.error("No peer connection when handling answer");
        return;
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        console.log("Remote description (answer) set successfully");

        // Process queued ICE candidates
        console.log(
          `Processing ${iceCandidatesQueue.current.length} queued ICE candidates`
        );
        while (iceCandidatesQueue.current.length > 0) {
          const candidate = iceCandidatesQueue.current.shift();
          if (candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
              console.warn("Error adding queued ICE candidate:", e);
            }
          }
        }
      } catch (err) {
        console.error("Error handling answer:", err);
      }
    },
    []
  );

  // Handle incoming ICE candidate
  const handleIceCandidate = useCallback(
    async (candidate: RTCIceCandidateInit) => {
      const pc = peerConnectionRef.current;
      if (!pc) {
        // Queue if no peer connection yet
        iceCandidatesQueue.current.push(candidate);
        return;
      }

      try {
        // If remote description is set, add immediately
        // Otherwise queue for later
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          iceCandidatesQueue.current.push(candidate);
        }
      } catch (err) {
        // Some candidates may fail - this is normal
        console.warn("Error adding ICE candidate:", err);
      }
    },
    []
  );

  // Create and send offer (caller side)
  const createOffer = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc) {
      console.error("No peer connection when creating offer");
      return;
    }

    try {
      console.log("Creating offer");
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      console.log("Local description (offer) set successfully");

      socketRef.current?.emit("webrtc-offer", {
        roomId,
        sdp: offer,
        from: userId,
      });
    } catch (err) {
      console.error("Error creating offer:", err);
      setErrorWithCallback("Görüntülü arama başlatılamadı.");
    }
  }, [roomId, userId, setErrorWithCallback]);

  // Start the call
  const startCall = useCallback(async () => {
    try {
      setError(null);
      updateConnectionState("connecting");

      // Initialize media first
      await initializeMedia();

      // Connect to signaling server
      const socket = io(window.location.origin, {
        path: "/socket.io",
        transports: ["websocket", "polling"],
      });
      socketRef.current = socket;

      // Set up socket event listeners
      socket.on("connect", () => {
        console.log("Connected to signaling server, socket id:", socket.id);
        socket.emit("join-room", { roomId, userId, role });
      });

      // Handle server-side authorization errors
      socket.on("error", ({ code, message }) => {
        console.error("Server error:", code, message);
        setErrorWithCallback(message);
        updateConnectionState("failed");
      });

      socket.on("joined-room", ({ isCaller, participantCount }) => {
        console.log(
          `Joined room as ${isCaller ? "caller" : "receiver"}, ${participantCount} participants`
        );
        isCallerRef.current = isCaller;

        // Create peer connection
        createPeerConnection();

        // If we're the caller and someone is already in the room, create offer
        // This handles the case where we join second
        if (isCaller && participantCount > 1) {
          console.log("We joined second, but marked as caller - creating offer");
          createOffer();
        }
      });

      socket.on("user-joined", ({ userId: joinedUserId, role: joinedRole }) => {
        console.log(`User ${joinedUserId} (${joinedRole}) joined the room`);
        // If we're the first one (caller), create offer when second person joins
        if (isCallerRef.current) {
          console.log("Other user joined, we are caller - creating offer");
          createOffer();
        }
      });

      socket.on("webrtc-offer", ({ sdp }) => {
        handleOffer(sdp);
      });

      socket.on("webrtc-answer", ({ sdp }) => {
        handleAnswer(sdp);
      });

      socket.on("webrtc-ice-candidate", ({ candidate }) => {
        handleIceCandidate(candidate);
      });

      socket.on("user-left", ({ userId: leftUserId }) => {
        console.log(`User ${leftUserId} left the room`);
        setRemoteStream(null);
        updateConnectionState("disconnected");
        // Don't set error - this is expected behavior
      });

      socket.on("room-full", () => {
        setErrorWithCallback("Oda dolu. Maksimum 2 kişi katılabilir.");
        updateConnectionState("failed");
      });

      socket.on("disconnect", (reason) => {
        console.log("Disconnected from signaling server:", reason);
        if (reason === "io server disconnect") {
          // Server disconnected us - try to reconnect
          socket.connect();
        }
      });

      socket.on("connect_error", (err) => {
        console.error("Socket connection error:", err);
        setErrorWithCallback("Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.");
        updateConnectionState("failed");
      });
    } catch (err) {
      console.error("Error starting call:", err);
      updateConnectionState("failed");
    }
  }, [
    roomId,
    userId,
    role,
    initializeMedia,
    createPeerConnection,
    createOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    updateConnectionState,
    setErrorWithCallback,
  ]);

  // End the call - cleanup all resources
  const endCall = useCallback(() => {
    console.log("Ending call - cleaning up resources");

    // Clear any pending timeouts
    if (iceConnectionTimeoutRef.current) {
      clearTimeout(iceConnectionTimeoutRef.current);
      iceConnectionTimeoutRef.current = null;
    }

    // Stop all local media tracks (releases camera/mic)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        console.log("Stopping local track:", track.kind);
        track.stop();
      });
      localStreamRef.current = null;
      setLocalStream(null);
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      // Remove all event handlers to prevent callbacks after close
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.oniceconnectionstatechange = null;
      peerConnectionRef.current.onicegatheringstatechange = null;

      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
      console.log("Peer connection closed");
    }

    // Leave room and disconnect socket
    if (socketRef.current) {
      socketRef.current.emit("leave-room", { roomId, userId });
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
      console.log("Socket disconnected");
    }

    // Reset state
    setRemoteStream(null);
    setError(null);
    updateConnectionState("idle");
    iceCandidatesQueue.current = [];
    isCallerRef.current = false;
  }, [roomId, userId, updateConnectionState]);

  // Toggle microphone
  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
        console.log("Mic toggled:", audioTrack.enabled ? "on" : "off");
      }
    }
  }, []);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
        console.log("Camera toggled:", videoTrack.enabled ? "on" : "off");
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  return {
    localStream,
    remoteStream,
    connectionState,
    isMicOn,
    isCameraOn,
    toggleMic,
    toggleCamera,
    startCall,
    endCall,
    error,
  };
}
