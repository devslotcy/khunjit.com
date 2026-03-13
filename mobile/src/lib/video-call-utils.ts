/**
 * Video Call Join Window Utilities (Mobile)
 *
 * Same logic as web version - determines if a user can join a video call based on:
 * 1. Appointment status (must be confirmed, ready, or in_session)
 * 2. Time window (10 minutes before start to 15 minutes after end)
 *
 * IMPORTANT: All time comparisons use UTC timestamps directly.
 */

// Configuration - matches web
export const JOIN_EARLY_MINUTES = 10; // Can join 10 minutes before start
export const JOIN_LATE_MINUTES = 15; // Can join up to 15 minutes after end

export type JoinReason =
  | 'ok' // Can join
  | 'too_early' // Before the join window
  | 'too_late' // After the join window
  | 'not_confirmed' // Appointment not in confirmed status
  | 'invalid_appointment'; // Missing required data

export interface CanJoinResult {
  canJoin: boolean;
  reason: JoinReason;
  message: string; // Turkish message for UI
  minutesUntilJoin?: number; // Minutes until join window opens (if too_early)
}

// Statuses that allow joining video call (matches web)
const JOINABLE_STATUSES = ['confirmed', 'ready', 'in_session'];

/**
 * Check if user can join video call for an appointment
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
      reason: 'invalid_appointment',
      message: 'Randevu bilgisi bulunamadı',
    };
  }

  // Parse dates if they're strings (ISO format from server)
  const startAt = typeof appointment.startAt === 'string'
    ? new Date(appointment.startAt)
    : appointment.startAt;

  const endAt = typeof appointment.endAt === 'string'
    ? new Date(appointment.endAt)
    : appointment.endAt;

  // Validate dates
  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
    return {
      canJoin: false,
      reason: 'invalid_appointment',
      message: 'Randevu tarihi geçersiz',
    };
  }

  // Check status first
  if (!JOINABLE_STATUSES.includes(appointment.status)) {
    return {
      canJoin: false,
      reason: 'not_confirmed',
      message: getStatusMessage(appointment.status),
    };
  }

  // Calculate time window using UTC timestamps
  const joinWindowStart = new Date(startAt.getTime() - JOIN_EARLY_MINUTES * 60 * 1000);
  const joinWindowEnd = new Date(endAt.getTime() + JOIN_LATE_MINUTES * 60 * 1000);

  // Check if too early
  if (now.getTime() < joinWindowStart.getTime()) {
    const minutesUntilJoin = Math.ceil((joinWindowStart.getTime() - now.getTime()) / (60 * 1000));
    return {
      canJoin: false,
      reason: 'too_early',
      message: 'Seans henüz başlamadı',
      minutesUntilJoin,
    };
  }

  // Check if too late
  if (now.getTime() > joinWindowEnd.getTime()) {
    return {
      canJoin: false,
      reason: 'too_late',
      message: 'Seans süresi geçti',
    };
  }

  // Can join!
  return {
    canJoin: true,
    reason: 'ok',
    message: 'Görüşmeye katılabilirsiniz',
  };
}

/**
 * Get user-friendly message for appointment status
 */
function getStatusMessage(status: string): string {
  switch (status) {
    case 'reserved':
      return 'Randevu henüz onaylanmadı';
    case 'payment_pending':
      return 'Ödeme bekleniyor';
    case 'payment_review':
      return 'Ödeme inceleniyor';
    case 'pending_approval':
      return 'Onay bekleniyor';
    case 'cancelled':
      return 'Randevu iptal edildi';
    case 'expired':
      return 'Randevu süresi doldu';
    case 'completed':
      return 'Seans tamamlandı';
    case 'no_show':
      return 'Katılım sağlanmadı';
    case 'rejected':
      return 'Randevu reddedildi';
    case 'refunded':
      return 'İade edildi';
    default:
      return 'Seans için uygun değil';
  }
}

/**
 * Get tooltip message explaining when user can join
 */
export function getJoinTooltip(result: CanJoinResult, startAt: Date | string): string {
  if (result.canJoin) {
    return 'Görüşmeye katılmak için tıklayın';
  }

  switch (result.reason) {
    case 'too_early':
      if (result.minutesUntilJoin !== undefined) {
        if (result.minutesUntilJoin > 60 * 24) {
          const days = Math.floor(result.minutesUntilJoin / (60 * 24));
          return `Seans ${days} gün sonra başlayacak`;
        } else if (result.minutesUntilJoin > 60) {
          const hours = Math.floor(result.minutesUntilJoin / 60);
          return `Seans ${hours} saat sonra başlayacak`;
        } else {
          return `Seans ${result.minutesUntilJoin} dakika sonra başlayacak`;
        }
      }
      return `Seans başlamadan ${JOIN_EARLY_MINUTES} dk önce aktif olur`;

    case 'too_late':
      return 'Seans süresi geçtiği için katılamazsınız';

    case 'not_confirmed':
      return result.message;

    default:
      return 'Görüşmeye katılamazsınız';
  }
}

/**
 * Format remaining time until session starts
 */
export function formatTimeUntilSession(startAt: Date | string, now: Date = new Date()): string {
  const start = typeof startAt === 'string' ? new Date(startAt) : startAt;
  const diffMs = start.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'Şimdi';
  }

  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} gün sonra`;
  } else if (diffHours > 0) {
    return `${diffHours} saat sonra`;
  } else {
    return `${diffMinutes} dakika sonra`;
  }
}
