/**
 * Utility functions for safely parsing props that may come as strings from navigation params
 * This prevents "java.lang.String cannot be cast to java.lang.Boolean" errors on Android
 */

/**
 * Safely parse a value to boolean
 * Handles: true, false, "true", "false", 1, 0, "1", "0", null, undefined
 */
export function parseBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === '1';
  }
  if (typeof value === 'number') return value !== 0;
  return false;
}

/**
 * Safely parse a value to number
 * Returns defaultValue if parsing fails
 */
export function parseNumber(value: unknown, defaultValue: number = 0): number {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
}

/**
 * Safely parse a value to integer
 * Returns defaultValue if parsing fails
 */
export function parseInt(value: unknown, defaultValue: number = 0): number {
  if (typeof value === 'number' && !isNaN(value)) return Math.floor(value);
  if (typeof value === 'string') {
    const parsed = global.parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
}
