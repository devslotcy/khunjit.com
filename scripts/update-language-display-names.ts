import { db } from "../server/db";
import { languages } from "../shared/schema";
import { eq } from "drizzle-orm";

async function updateLanguageNames() {
  try {
    console.log("🔄 Updating language display names...\n");

    const updates = [
      { code: 'en', nativeName: 'English' },
      { code: 'th', nativeName: 'ไทย' },
      { code: 'vi', nativeName: 'Tiếng Việt' },
      { code: 'fil', nativeName: 'Filipino' }, // Remove "Tagalog"
      { code: 'id', nativeName: 'Indonesia' }, // Remove "Bahasa"
      { code: 'ja', nativeName: '日本語' },
      { code: 'ko', nativeName: '한국어' },
      { code: 'de', nativeName: 'Deutsch' },
      { code: 'fr', nativeName: 'Français' },
      { code: 'it', nativeName: 'Italiano' },
      { code: 'tr', nativeName: 'Türkçe' },
    ];

    for (const { code, nativeName } of updates) {
      await db
        .update(languages)
        .set({ nativeName })
        .where(eq(languages.code, code));

      console.log(`✅ ${code.padEnd(5)} → ${nativeName}`);
    }

    console.log("\n✨ Language names updated successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating language names:", error);
    process.exit(1);
  }
}

updateLanguageNames();
