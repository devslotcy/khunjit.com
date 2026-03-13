import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const { Pool } = pg;

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Connecting to database...');
    const client = await pool.connect();

    try {
      console.log('📖 Reading migration file...');
      const migrationPath = join(__dirname, 'migrations', 'remove_session_notes_unique_constraint.sql');
      const sql = readFileSync(migrationPath, 'utf-8');

      console.log('⚡ Executing migration to remove unique constraint...');
      await client.query(sql);

      console.log('✅ Migration completed successfully!');
      console.log('   - Removed unique constraint from session_notes.appointment_id');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
