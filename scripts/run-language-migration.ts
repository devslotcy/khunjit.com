import { pool } from "../server/db";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log("🚀 Starting language system migration...");

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, "add-language-tables.sql");
    const sql = fs.readFileSync(sqlFilePath, "utf8");

    // Execute the SQL
    await pool.query(sql);

    console.log("✅ Migration completed successfully!");
    console.log("✨ Language tables created and seeded with 11 languages");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
