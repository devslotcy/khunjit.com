/**
 * Video Call Join Window Utilities
 *
 * Determines if a user can join a video call based on:
 * 1. Appointment status (must be confirmed or ready)
 * 2. Time window (JOIN_EARLY_MINUTES before start to JOIN_LATE_MINUTES after end)
 *
 * IMPORTANT: All time comparisons use UTC timestamps directly.
 * The appointment times are stored in UTC in the database.
 * We compare the current UTC time against the appointment's UTC times.
 * This works correctly regardless of the user's browser timezone.
 */

// Configuration - can be moved to environment variables if needed
export const JOIN_EARLY_MINUTES = 10; // Can join 10 minutes before start
export const JOIN_LATE_MINUTES = 15; // Can join up to 15 minutes after end

export type JoinReason =
  | "ok" // Can join
  | "too_early" // Before the join window
  | "too_late" // After the join window
  | "not_confirmed" // Appointment not in confirmed status
  | "invalid_appointment"; // Missing required data

export interface CanJoinResult {
  canJoin: boolean;
  reason: JoinReason;
  message: string; // i18n key for UI message
  minutesUntilJoin?: number; // Minutes until join window opens (if too_early)
}

// Statuses that allow joining video call
const JOINABLE_STATUSES = ["confirmed", "ready", "in_session"];

/**
 * Check if user can join video call for an appointment
 *
 * Time comparison uses UTC timestamps directly:
 * - appointment.startAt/endAt are stored as UTC in the database
 * - new Date() gives current time in UTC internally
 * - Comparing UTC to UTC works correctly regardless of browser timezone
 *
 * @param appointment - The appointment object with status, startAt, endAt
 * @param now - Current time (defaults to new Date())
 * @returns CanJoinResult with canJoin boolean and reason
 */
export function canJoinVideoCall(
  appointment: {
    status: string;
    startAt: Date | string;
    endAt: Date | string;
  } | null | undefined,
  now: Date = new Date()
): CanJoinResult {
  // Validate appointment
  if (!appointment) {
    return {
      canJoin: false,
      reason: "invalid_appointment",
      message: "appointments.videoCall.invalidAppointment",
    };
  }

  // Parse dates if they're strings (ISO format from server)
  // These are UTC timestamps from the database
  const startAt = typeof appointment.startAt === "string"
    ? new Date(appointment.startAt)
    : appointment.startAt;

  const endAt = typeof appointment.endAt === "string"
    ? new Date(appointment.endAt)
    : appointment.endAt;

  // Validate dates
  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
    return {
      canJoin: false,
      reason: "invalid_appointment",
      message: "appointments.videoCall.invalidDate",
    };
  }

  // Check status first
  if (!JOINABLE_STATUSES.includes(appointment.status)) {
    return {
      canJoin: false,
      reason: "not_confirmed",
      message: getStatusMessage(appointment.status),
    };
  }

  // Calculate time window using UTC timestamps
  // All Date objects internally use UTC milliseconds, so this comparison
  // works correctly regardless of the user's browser timezone
  const joinWindowStart = new Date(startAt.getTime() - JOIN_EARLY_MINUTES * 60 * 1000);
  const joinWindowEnd = new Date(endAt.getTime() + JOIN_LATE_MINUTES * 60 * 1000);

  // Check if too early (current UTC time < join window start UTC time)
  if (now.getTime() < joinWindowStart.getTime()) {
    const minutesUntilJoin = Math.ceil((joinWindowStart.getTime() - now.getTime()) / (60 * 1000));
    return {
      canJoin: false,
      reason: "too_early",
      message: "appointments.videoCall.sessionNotStarted",
      minutesUntilJoin,
    };
  }

  // Check if too late (current UTC time > join window end UTC time)
  if (now.getTime() > joinWindowEnd.getTime()) {
    return {
      canJoin: false,
      reason: "too_late",
      message: "appointments.videoCall.sessionEnded",
    };
  }

  // Can join!
  return {
    canJoin: true,
    reason: "ok",
    message: "appointments.videoCall.canJoin",
  };
}

/**
 * Get i18n key for appointment status message
 */
function getStatusMessage(status: string): string {
  switch (status) {
    case "reserved":
      return "appointments.videoCall.notConfirmed";
    case "payment_pending":
      return "appointments.videoCall.paymentPending";
    case "payment_review":
      return "appointments.videoCall.paymentReview";
    case "pending_approval":
      return "appointments.videoCall.pendingApproval";
    case "cancelled":
      return "appointments.videoCall.cancelled";
    case "expired":
      return "appointments.videoCall.expired";
    case "completed":
      return "appointments.videoCall.completed";
    case "no_show":
      return "appointments.videoCall.noShow";
    case "rejected":
      return "appointments.videoCall.rejected";
    case "refunded":
      return "appointments.videoCall.refunded";
    default:
      return "appointments.videoCall.notEligible";
  }
}

/**
 * Get tooltip message explaining when user can join
 */
export function getJoinTooltip(
  result: CanJoinResult,
  startAt: Date | string,
  t: (key: string, params?: any) => string
): string {
  if (result.canJoin) {
    return t("appointments.videoCall.clickToJoin");
  }

  const start = typeof startAt === "string" ? new Date(startAt) : startAt;

  switch (result.reason) {
    case "too_early":
      if (result.minutesUntilJoin !== undefined) {
        if (result.minutesUntilJoin > 60 * 24) {
          const days = Math.floor(result.minutesUntilJoin / (60 * 24));
          return t("appointments.videoCall.startsInDays", { count: days });
        } else if (result.minutesUntilJoin > 60) {
          const hours = Math.floor(result.minutesUntilJoin / 60);
          return t("appointments.videoCall.startsInHours", { count: hours });
        } else {
          return t("appointments.videoCall.startsInMinutes", { count: result.minutesUntilJoin });
        }
      }
      return t("appointments.videoCall.activeBeforeStart", { minutes: JOIN_EARLY_MINUTES });

    case "too_late":
      return t("appointments.videoCall.cannotJoinEnded");

    case "not_confirmed":
      return t(result.message);

    default:
      return t("appointments.videoCall.cannotJoin");
  }
}

/**
 * Format remaining time until session starts
 */
export function formatTimeUntilSession(
  startAt: Date | string,
  now: Date = new Date(),
  t: (key: string, params?: any) => string
): string {
  const start = typeof startAt === "string" ? new Date(startAt) : startAt;
  const diffMs = start.getTime() - now.getTime();

  if (diffMs <= 0) {
    return t("appointments.videoCall.now");
  }

  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return t("appointments.videoCall.inDays", { count: diffDays });
  } else if (diffHours > 0) {
    return t("appointments.videoCall.inHours", { count: diffHours });
  } else {
    return t("appointments.videoCall.inMinutes", { count: diffMinutes });
  }
}
