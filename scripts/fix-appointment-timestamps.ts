/**
 * Migration script to fix appointment timestamps
 *
 * Problem: Appointments were stored with local Istanbul time (16:00) instead of UTC (13:00).
 * This happened because:
 * 1. localTimeToUTC correctly converted 16:00 Istanbul to 13:00 UTC
 * 2. But PostgreSQL session timezone was not UTC
 * 3. When TIMESTAMPTZ was cast to timestamp (without tz), it converted back to local time
 *
 * Fix: Subtract 3 hours from all appointment timestamps to convert them to proper UTC.
 * Note: Turkey is UTC+3 all year (no DST since 2016).
 *
 * IMPORTANT: Run this script ONCE after deploying the db.ts fix.
 * The db.ts fix prevents new appointments from having this issue.
 */

import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function fixTimestamps() {
  const client = await pool.connect();

  try {
    console.log("Starting timestamp fix migration...\n");

    // First, check current state
    const before = await client.query(`
      SELECT id, start_at, end_at, status, created_at
      FROM appointments
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log("Before migration (sample):");
    before.rows.forEach((row) => {
      console.log(`  ${row.id.substring(0, 8)}... : ${row.start_at} -> ${row.end_at} (${row.status})`);
    });
    console.log("");

    // Begin transaction
    await client.query("BEGIN");

    // Fix appointment timestamps
    // Subtract 3 hours to convert from "stored as Istanbul local time" to "proper UTC"
    const result = await client.query(`
      UPDATE appointments
      SET
        start_at = start_at - INTERVAL '3 hours',
        end_at = end_at - INTERVAL '3 hours',
        reserved_until = CASE
          WHEN reserved_until IS NOT NULL
          THEN reserved_until - INTERVAL '3 hours'
          ELSE NULL
        END,
        join_code_expires_at = CASE
          WHEN join_code_expires_at IS NOT NULL
          THEN join_code_expires_at - INTERVAL '3 hours'
          ELSE NULL
        END,
        updated_at = NOW()
      WHERE deleted_at IS NULL
      RETURNING id
    `);

    console.log(`Updated ${result.rowCount} appointments\n`);

    // Verify the fix
    const after = await client.query(`
      SELECT id, start_at, end_at, status
      FROM appointments
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log("After migration (sample):");
    after.rows.forEach((row) => {
      console.log(`  ${row.id.substring(0, 8)}... : ${row.start_at} -> ${row.end_at} (${row.status})`);
    });
    console.log("");

    // Commit transaction
    await client.query("COMMIT");
    console.log("Migration completed successfully!");

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Migration failed, rolled back:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
fixTimestamps().catch(console.error);
