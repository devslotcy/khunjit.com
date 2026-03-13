/**
 * Timezone-aware date/time utilities for appointment handling
 *
 * Standard approach:
 * - DB stores timestamps in UTC
 * - API sends/receives ISO strings with timezone info
 * - Frontend displays in user's local timezone (default: Asia/Bangkok)
 */

import { format as dateFnsFormat, parseISO, getDay } from "date-fns";
import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";

// Default timezone for Thailand users (UTC+7, no DST)
export const DEFAULT_TIMEZONE = "Asia/Bangkok";

// Weekday keys for i18n - stored in DB and translated at render time
export const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

/**
 * Get the weekday key from a date (for storage/i18n lookup)
 * Returns lowercase key like "monday", "tuesday", etc.
 */
export function getWeekdayKey(
  date: string | Date,
  timezone: string = DEFAULT_TIMEZONE
): WeekdayKey {
  const parsed = typeof date === "string" ? parseISO(date) : date;
  const zonedDate = toZonedTime(parsed, timezone);
  const dayIndex = getDay(zonedDate); // 0 = Sunday, 1 = Monday, etc.
  return WEEKDAY_KEYS[dayIndex];
}

/**
 * Get the user's timezone from browser or fallback to Bangkok
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/**
 * Parse an ISO date string and format it for display in the specified timezone
 *
 * @param isoString - ISO date string from API (e.g., "2026-01-15T13:00:00.000Z")
 * @param formatStr - date-fns format string (e.g., "HH:mm", "d MMMM yyyy")
 * @param timezone - Target timezone (default: Asia/Bangkok)
 * @returns Formatted date string in the target timezone
 */
export function formatInTimezone(
  isoString: string | Date,
  formatStr: string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  try {
    const date =
      typeof isoString === "string" ? parseISO(isoString) : isoString;
    return formatInTimeZone(date, timezone, formatStr);
  } catch (error) {
    console.error("Error formatting date:", error);
    // Fallback to basic format
    const date =
      typeof isoString === "string" ? new Date(isoString) : isoString;
    return dateFnsFormat(date, formatStr);
  }
}

/**
 * Format appointment time range for display
 * Uses numeric date format (DD.MM.YYYY) for language independence
 *
 * @param startAt - Start time ISO string
 * @param endAt - End time ISO string
 * @param timezone - Target timezone
 * @returns Object with formatted date and time strings
 */
export function formatAppointmentTime(
  startAt: string | Date,
  endAt: string | Date,
  timezone: string = DEFAULT_TIMEZONE
): {
  date: string; // "04.02.2026" (DD.MM.YYYY - numeric, language-independent)
  dateShort: string; // "04.02.2026"
  time: string; // "13:00 - 13:50" (no timezone suffix)
  startTime: string; // "13:00"
  endTime: string; // "13:50"
  fullDateTime: string; // "04.02.2026 13:00"
  timeWithLabel: string; // "13:00 - 13:50" (no timezone suffix)
  weekdayKey: WeekdayKey; // "wednesday" (for i18n lookup)
} {
  const start = typeof startAt === "string" ? parseISO(startAt) : startAt;
  const end = typeof endAt === "string" ? parseISO(endAt) : endAt;

  const timeRange = `${formatInTimeZone(start, timezone, "HH:mm")} - ${formatInTimeZone(end, timezone, "HH:mm")}`;
  const numericDate = formatInTimeZone(start, timezone, "dd.MM.yyyy");

  return {
    date: numericDate,
    dateShort: numericDate,
    time: timeRange,
    startTime: formatInTimeZone(start, timezone, "HH:mm"),
    endTime: formatInTimeZone(end, timezone, "HH:mm"),
    fullDateTime: `${numericDate} ${formatInTimeZone(start, timezone, "HH:mm")}`,
    timeWithLabel: timeRange, // No timezone suffix
    weekdayKey: getWeekdayKey(start, timezone),
  };
}

/**
 * Create an ISO string from local date and time components
 * This is used when creating appointments from the booking modal
 *
 * @param date - Date string in "yyyy-MM-dd" format
 * @param time - Time string in "HH:mm" format
 * @param timezone - Source timezone (default: Asia/Bangkok)
 * @returns ISO string in UTC (e.g., "2026-01-15T09:00:00.000Z")
 */
export function createISOFromLocalTime(
  date: string,
  time: string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  // Parse date and time components
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);

  // Create a date in the specified timezone
  // This creates a Date representing "16:00 in Bangkok timezone"
  const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

  // Convert from the specified timezone to UTC
  const utcDate = fromZonedTime(localDate, timezone);

  return utcDate.toISOString();
}

/**
 * Parse a Date object from the API and convert to the target timezone
 * Useful for date comparisons and calculations
 *
 * @param date - Date from API
 * @param timezone - Target timezone
 * @returns Date object adjusted for the target timezone
 */
export function toLocalDate(
  date: string | Date,
  timezone: string = DEFAULT_TIMEZONE
): Date {
  const parsed = typeof date === "string" ? parseISO(date) : date;
  return toZonedTime(parsed, timezone);
}

/**
 * Get relative time description for appointments (i18n-aware)
 * Returns a key and values for translation
 *
 * Display logic:
 * - If diff < 0: "passed/geçti"
 * - If diff < 1 minute: "now/şimdi"
 * - If diff < 60 minutes: "in X minutes / X dakika sonra"
 * - If diff >= 24 && < 48 hours: "tomorrow / yarın"
 * - If diff < 48 hours: "in X hours / X saat sonra"
 * - If diff >= 48 hours: "in X days / X gün sonra"
 *
 * @param startAt - Start time ISO string
 * @param timezone - Target timezone
 * @returns Object with translation key and interpolation values
 */
export function getRelativeAppointmentTimeKey(
  startAt: string | Date,
  timezone: string = DEFAULT_TIMEZONE
): { key: string; values?: Record<string, number | string> } {
  const start = typeof startAt === "string" ? parseISO(startAt) : startAt;
  const now = new Date();
  const startInTz = toZonedTime(start, timezone);
  const nowInTz = toZonedTime(now, timezone);

  const diffMs = startInTz.getTime() - nowInTz.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Past appointment
  if (diffMinutes < 0) {
    return { key: "appointments.relative.past" };
  }

  // Very soon (< 1 minute)
  if (diffMinutes < 1) {
    return { key: "appointments.relative.now" };
  }

  // Within the hour (show minutes)
  if (diffMinutes < 60) {
    return { key: "appointments.relative.inMinutes", values: { count: diffMinutes } };
  }

  // Tomorrow (24-48 hours)
  if (diffHours >= 24 && diffHours < 48) {
    return { key: "appointments.relative.tomorrow" };
  }

  // Within 48 hours (show hours)
  if (diffHours < 48) {
    return { key: "appointments.relative.inHours", values: { count: diffHours } };
  }

  // More than 48 hours (show days)
  return { key: "appointments.relative.inDays", values: { count: diffDays } };
}

/**
 * Get relative time description for appointments
 * Legacy function - returns English string directly
 * For new code, prefer getRelativeAppointmentTimeKey() with i18n
 *
 * @param startAt - Start time ISO string
 * @param timezone - Target timezone
 * @returns Human-readable relative time string (English)
 */
export function getRelativeAppointmentTime(
  startAt: string | Date,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const start = typeof startAt === "string" ? parseISO(startAt) : startAt;
  const now = new Date();
  const startInTz = toZonedTime(start, timezone);
  const nowInTz = toZonedTime(now, timezone);

  const diffMs = startInTz.getTime() - nowInTz.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 0) {
    return "passed";
  } else if (diffMinutes < 1) {
    return "now";
  } else if (diffMinutes < 60) {
    return `in ${diffMinutes} min`;
  } else if (diffHours >= 24 && diffHours < 48) {
    return "tomorrow";
  } else if (diffHours < 48) {
    return `in ${diffHours}h`;
  } else {
    return `in ${diffDays} days`;
  }
}

/**
 * Check if an appointment time is in the past
 */
export function isAppointmentPast(
  endAt: string | Date,
  timezone: string = DEFAULT_TIMEZONE
): boolean {
  const end = typeof endAt === "string" ? parseISO(endAt) : endAt;
  return end < new Date();
}

/**
 * Format for API calls - always send ISO UTC
 */
export function toAPIFormat(date: Date): string {
  return date.toISOString();
}
