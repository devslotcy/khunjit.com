import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool, types } = pg;

/**
 * Fix for node-postgres timestamp parsing
 *
 * By default, node-postgres interprets `timestamp without timezone` values
 * as local time, which causes timezone bugs when the server timezone differs
 * from UTC. This fix ensures all timestamps are parsed as UTC.
 *
 * Type IDs:
 * - 1114: timestamp without timezone
 * - 1184: timestamptz (already handles timezone correctly)
 */
const TIMESTAMP_OID = 1114;
const TIMESTAMPTZ_OID = 1184;

// Parse timestamp as UTC (append 'Z' to treat as UTC)
types.setTypeParser(TIMESTAMP_OID, (stringValue: string) => {
  // If value is null or empty, return null
  if (!stringValue) return null;
  // Append 'Z' to interpret as UTC, then create Date
  return new Date(stringValue + "Z");
});

// Timestamptz already includes timezone info, parse directly
types.setTypeParser(TIMESTAMPTZ_OID, (stringValue: string) => {
  if (!stringValue) return null;
  return new Date(stringValue);
});

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

/**
 * Configure PostgreSQL connection pool
 *
 * IMPORTANT: We explicitly set the session timezone to UTC to ensure consistent
 * timestamp handling. When PostgreSQL converts TIMESTAMPTZ to timestamp (without tz),
 * it uses the session timezone. Setting it to UTC ensures:
 * - 13:00 UTC stays as 13:00 in the database
 * - No timezone conversion happens during INSERT/SELECT
 */
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Set session timezone to UTC for all connections
pool.on("connect", (client) => {
  client.query("SET timezone = 'UTC'");
});

export const db = drizzle(pool, { schema });
