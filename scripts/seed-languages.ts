import { db } from "../server/db";
import { languages } from "../shared/schema";
import { sql } from "drizzle-orm";

/**
 * Seed the languages table with the 11 supported languages
 *
 * This script is idempotent - it will only insert languages that don't already exist
 */

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "th", name: "Thai", nativeName: "ไทย" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt" },
  { code: "fil", name: "Filipino", nativeName: "Filipino" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe" },
];

async function seedLanguages() {
  try {
    console.log("🌍 Starting language seeding...");

    for (const lang of SUPPORTED_LANGUAGES) {
      // Check if language already exists
      const existing = await db
        .select()
        .from(languages)
        .where(sql`${languages.code} = ${lang.code}`)
        .limit(1);

      if (existing.length === 0) {
        await db.insert(languages).values({
          code: lang.code,
          name: lang.name,
          nativeName: lang.nativeName,
          isActive: true,
        });
        console.log(`✅ Inserted language: ${lang.name} (${lang.code})`);
      } else {
        console.log(`⏭️  Language already exists: ${lang.name} (${lang.code})`);
      }
    }

    console.log("✨ Language seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding languages:", error);
    throw error;
  }
}

// Run the seeding function
seedLanguages()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
