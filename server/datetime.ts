/**
 * Server-side timezone-aware date/time utilities
 *
 * Standard approach:
 * - All dates stored in DB as UTC timestamps
 * - API receives local time + timezone, converts to UTC before storing
 * - API returns ISO UTC strings, frontend converts to display timezone
 *
 * IMPORTANT: This site is for Thailand users. All times are in Asia/Bangkok timezone.
 */

// Default timezone for Thailand users - FIXED, not based on browser
export const DEFAULT_TIMEZONE = "Asia/Bangkok";

/**
 * Convert local date/time (in Thailand timezone) to UTC Date object
 *
 * When a user selects "16:00" in Bangkok timezone,
 * this converts it to the equivalent UTC time (09:00 UTC)
 *
 * Thailand is UTC+7 all year round (no daylight saving)
 *
 * @param date - Date string in "yyyy-MM-dd" format
 * @param time - Time string in "HH:mm" format
 * @param timezone - Source timezone (default: Asia/Bangkok)
 * @returns Date object in UTC
 */
export function localTimeToUTC(
  date: string,
  time: string,
  timezone: string = DEFAULT_TIMEZONE
): Date {
  // Thailand is always UTC+7 (no daylight saving time)
  // Example: 16:00 Bangkok = 09:00 UTC
  //
  // We create an ISO string with the +07:00 offset, which JavaScript
  // will correctly parse to UTC regardless of server timezone.
  //
  // Format: "2026-01-15T16:00:00+07:00" -> parsed as 09:00 UTC

  const paddedTime = time.includes(':') ? time : `${time}:00`;
  const isoWithOffset = `${date}T${paddedTime}:00+07:00`;

  return new Date(isoWithOffset);
}

/**
 * Add duration to a UTC date and return new UTC date
 */
export function addMinutesToUTC(utcDate: Date, minutes: number): Date {
  return new Date(utcDate.getTime() + minutes * 60 * 1000);
}

/**
 * Get the current time in Thailand timezone
 * Returns a Date object representing "now" in Bangkok
 */
export function nowInThailand(): Date {
  // Get current UTC time and add 7 hours for Thailand
  const now = new Date();
  return new Date(now.getTime() + 7 * 60 * 60 * 1000);
}

/**
 * Parse ISO string or Date and ensure it's a valid Date object
 */
export function ensureDate(value: string | Date): Date {
  if (value instanceof Date) {
    return value;
  }
  return new Date(value);
}

/**
 * Format a UTC Date to ISO string for API responses
 */
export function toISOString(date: Date): string {
  return date.toISOString();
}
