import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { log } from "./index";
import { storage } from "./storage";

// ============================================
// CONFIGURATION
// ============================================
const JOIN_EARLY_MINUTES = 10; // Can join 10 minutes before start
const JOIN_LATE_MINUTES = 15; // Can join up to 15 minutes after end
const JOINABLE_STATUSES = ["confirmed", "ready", "in_session"];

// Room management
interface RoomParticipant {
  socketId: string;
  oderId: string; // oderId represents the user's identifier
  role: "patient" | "psychologist";
  joinedAt: Date;
}

interface Room {
  participants: Map<string, RoomParticipant>;
  appointmentId: string;
  patientId: string;
  psychologistId: string;
  createdAt: Date;
}

const rooms = new Map<string, Room>();
const MAX_PARTICIPANTS_PER_ROOM = 2;

// Socket.io event types
interface JoinRoomPayload {
  roomId: string; // appointmentId
  userId: string;
  role: "patient" | "psychologist";
}

interface WebRTCOfferPayload {
  roomId: string;
  sdp: RTCSessionDescriptionInit;
  from: string;
}

interface WebRTCAnswerPayload {
  roomId: string;
  sdp: RTCSessionDescriptionInit;
  from: string;
}

interface WebRTCIceCandidatePayload {
  roomId: string;
  candidate: RTCIceCandidateInit;
  from: string;
}

interface LeaveRoomPayload {
  roomId: string;
  userId: string;
}

/**
 * Check if current time is within the join window for an appointment
 */
function isWithinJoinWindow(startAt: Date, endAt: Date, now: Date = new Date()): {
  canJoin: boolean;
  reason: "ok" | "too_early" | "too_late";
} {
  const joinWindowStart = new Date(startAt.getTime() - JOIN_EARLY_MINUTES * 60 * 1000);
  const joinWindowEnd = new Date(endAt.getTime() + JOIN_LATE_MINUTES * 60 * 1000);

  if (now < joinWindowStart) {
    return { canJoin: false, reason: "too_early" };
  }

  if (now > joinWindowEnd) {
    return { canJoin: false, reason: "too_late" };
  }

  return { canJoin: true, reason: "ok" };
}

export function setupSignalingServer(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    // SECURITY: In production, restrict CORS to your domain
    // Example: origin: "https://khunjit.com"
    cors: {
      origin: process.env.NODE_ENV === "production"
        ? process.env.CORS_ORIGIN || "*"
        : "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/socket.io",
  });

  log("Socket.io signaling server initialized", "socket.io");

  io.on("connection", (socket: Socket) => {
    log(`Client connected: ${socket.id}`, "socket.io");

    // Handle user authentication for notifications
    socket.on("authenticate", (userId: string) => {
      if (userId) {
        socket.join(`user:${userId}`);
        log(`User ${userId} authenticated and joined notification room`, "socket.io");
      }
    });

    // Handle join-room event with AUTHORIZATION CHECK
    socket.on("join-room", async (payload: JoinRoomPayload) => {
      const { roomId, userId, role } = payload;
      log(`Join room request: roomId=${roomId}, oderId=${userId}, role=${role}`, "socket.io");

      try {
        // ============================================
        // SECURITY: Verify user is authorized for this appointment
        // ============================================
        const appointment = await storage.getAppointment(roomId);

        if (!appointment) {
          log(`SECURITY: Appointment ${roomId} not found, rejecting ${userId}`, "socket.io");
          socket.emit("error", {
            code: "APPOINTMENT_NOT_FOUND",
            message: "Randevu bulunamadı"
          });
          return;
        }

        // Check if user is either the patient or psychologist of this appointment
        const isPatient = appointment.patientId === userId;
        const isPsychologist = appointment.psychologistId === userId;

        if (!isPatient && !isPsychologist) {
          log(`SECURITY: User ${userId} is NOT authorized for appointment ${roomId}`, "socket.io");
          log(`  - Appointment patientId: ${appointment.patientId}`, "socket.io");
          log(`  - Appointment psychologistId: ${appointment.psychologistId}`, "socket.io");
          socket.emit("error", {
            code: "UNAUTHORIZED",
            message: "Bu görüşmeye katılma yetkiniz yok"
          });
          return;
        }

        // Verify role matches
        if ((role === "patient" && !isPatient) || (role === "psychologist" && !isPsychologist)) {
          log(`SECURITY: Role mismatch for user ${userId} in appointment ${roomId}`, "socket.io");
          socket.emit("error", {
            code: "ROLE_MISMATCH",
            message: "Rol uyuşmazlığı"
          });
          return;
        }

        // ============================================
        // SECURITY: Check appointment status
        // ============================================
        if (!JOINABLE_STATUSES.includes(appointment.status)) {
          log(`SECURITY: Appointment ${roomId} status is "${appointment.status}", not joinable`, "socket.io");
          socket.emit("error", {
            code: "APPOINTMENT_NOT_CONFIRMED",
            message: getStatusErrorMessage(appointment.status)
          });
          return;
        }

        // ============================================
        // SECURITY: Check time window
        // ============================================
        const startAt = new Date(appointment.startAt);
        const endAt = new Date(appointment.endAt);
        const now = new Date();

        const timeCheck = isWithinJoinWindow(startAt, endAt, now);
        if (!timeCheck.canJoin) {
          const minutesUntilStart = Math.ceil((startAt.getTime() - now.getTime()) / (60 * 1000));
          log(`SECURITY: Time window check failed for appointment ${roomId}: ${timeCheck.reason}`, "socket.io");

          if (timeCheck.reason === "too_early") {
            socket.emit("error", {
              code: "TOO_EARLY",
              message: `Seans henüz başlamadı. ${minutesUntilStart > 60 ? Math.floor(minutesUntilStart / 60) + " saat" : minutesUntilStart + " dakika"} sonra katılabilirsiniz.`
            });
          } else {
            socket.emit("error", {
              code: "TOO_LATE",
              message: "Seans süresi geçti"
            });
          }
          return;
        }

        log(`SECURITY: User ${userId} authorized as ${role} for appointment ${roomId}`, "socket.io");

        // Get or create room with appointment info
        let room = rooms.get(roomId);
        if (!room) {
          room = {
            participants: new Map(),
            appointmentId: roomId,
            patientId: appointment.patientId,
            psychologistId: appointment.psychologistId,
            createdAt: new Date(),
          };
          rooms.set(roomId, room);
          log(`Created new room: ${roomId}`, "socket.io");
        }

        // Check if room is full (max 2 participants)
        if (room.participants.size >= MAX_PARTICIPANTS_PER_ROOM) {
          // Check if this user is already in the room (reconnecting)
          const existingParticipant = Array.from(room.participants.values()).find(
            (p) => p.oderId === userId
          );

          if (!existingParticipant) {
            log(`Room ${roomId} is full, rejecting ${userId}`, "socket.io");
            socket.emit("room-full", { roomId });
            return;
          }

          // User is reconnecting, remove old socket
          room.participants.delete(existingParticipant.socketId);
          log(`User ${userId} reconnecting to room ${roomId}`, "socket.io");
        }

        // Add participant to room (oderId field stores the userId)
        const participant: RoomParticipant = {
          socketId: socket.id,
          oderId: userId,
          role,
          joinedAt: new Date(),
        };
        room.participants.set(socket.id, participant);

        // Join socket.io room
        socket.join(roomId);

        // Notify about join
        const participantCount = room.participants.size;
        const isFirstParticipant = participantCount === 1;

        log(`User ${userId} joined room ${roomId} (${participantCount} participants)`, "socket.io");

        // Notify the joining user about their role (caller if first, receiver if second)
        socket.emit("joined-room", {
          roomId,
          isCaller: isFirstParticipant,
          participantCount,
        });

        // Notify other participants about new user (trigger offer creation)
        socket.to(roomId).emit("user-joined", {
          oderId: userId,
          role,
          socketId: socket.id,
        });

      } catch (error) {
        log(`Error in join-room: ${error}`, "socket.io");
        socket.emit("error", {
          code: "SERVER_ERROR",
          message: "Sunucu hatası"
        });
      }
    });

    // Handle WebRTC offer - forward to other participant only
    socket.on("webrtc-offer", (payload: WebRTCOfferPayload) => {
      const { roomId, sdp, from } = payload;
      log(`WebRTC offer from ${from} in room ${roomId}`, "socket.io");

      // socket.to(roomId) sends to everyone in room EXCEPT sender
      socket.to(roomId).emit("webrtc-offer", { sdp, from });
    });

    // Handle WebRTC answer - forward to other participant only
    socket.on("webrtc-answer", (payload: WebRTCAnswerPayload) => {
      const { roomId, sdp, from } = payload;
      log(`WebRTC answer from ${from} in room ${roomId}`, "socket.io");

      // socket.to(roomId) sends to everyone in room EXCEPT sender
      socket.to(roomId).emit("webrtc-answer", { sdp, from });
    });

    // Handle ICE candidates - forward to other participant only
    socket.on("webrtc-ice-candidate", (payload: WebRTCIceCandidatePayload) => {
      const { roomId, candidate, from } = payload;
      // Don't log every ICE candidate (too noisy)

      // socket.to(roomId) sends to everyone in room EXCEPT sender
      socket.to(roomId).emit("webrtc-ice-candidate", { candidate, from });
    });

    // Handle leave-room event
    socket.on("leave-room", (payload: LeaveRoomPayload) => {
      const { roomId, userId } = payload;
      handleLeaveRoom(socket, roomId, userId);
    });

    // Handle disconnect - cleanup all rooms
    socket.on("disconnect", () => {
      log(`Client disconnected: ${socket.id}`, "socket.io");

      // Find and clean up any rooms this socket was in
      rooms.forEach((room, roomId) => {
        const participant = room.participants.get(socket.id);
        if (participant) {
          handleLeaveRoom(socket, roomId, participant.oderId);
        }
      });
    });
  });

  return io;
}

/**
 * Get user-friendly error message for appointment status
 */
function getStatusErrorMessage(status: string): string {
  switch (status) {
    case "reserved":
      return "Randevu henüz onaylanmadı";
    case "payment_pending":
      return "Ödeme bekleniyor";
    case "payment_review":
      return "Ödeme inceleniyor";
    case "pending_approval":
      return "Onay bekleniyor";
    case "cancelled":
      return "Randevu iptal edildi";
    case "expired":
      return "Randevu süresi doldu";
    case "completed":
      return "Seans tamamlandı";
    case "no_show":
      return "Katılım sağlanmadı";
    case "rejected":
      return "Randevu reddedildi";
    case "refunded":
      return "İade edildi";
    default:
      return "Seans için uygun değil";
  }
}

function handleLeaveRoom(socket: Socket, roomId: string, oderId: string) {
  const room = rooms.get(roomId);
  if (!room) {
    log(`Leave room: room ${roomId} not found`, "socket.io");
    return;
  }

  const participant = room.participants.get(socket.id);
  if (!participant) {
    log(`Leave room: socket ${socket.id} not in room ${roomId}`, "socket.io");
    return;
  }

  // Remove participant from room
  room.participants.delete(socket.id);
  socket.leave(roomId);

  log(`User ${oderId} left room ${roomId} (${room.participants.size} remaining)`, "socket.io");

  // Notify other participants that user left
  socket.to(roomId).emit("user-left", {
    oderId,
    role: participant.role,
  });

  // Clean up empty rooms
  if (room.participants.size === 0) {
    rooms.delete(roomId);
    log(`Room ${roomId} deleted (empty)`, "socket.io");
  }
}

// Export for testing/monitoring
export function getRoomInfo(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return null;

  return {
    roomId,
    participantCount: room.participants.size,
    participants: Array.from(room.participants.values()).map((p) => ({
      oderId: p.oderId,
      role: p.role,
      joinedAt: p.joinedAt,
    })),
    createdAt: room.createdAt,
  };
}

export function getAllRooms() {
  return Array.from(rooms.keys()).map((roomId) => getRoomInfo(roomId));
}
