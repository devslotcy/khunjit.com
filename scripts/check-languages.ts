import { db } from "../server/db";
import { languages } from "../shared/schema";

async function checkLanguages() {
  try {
    console.log("📋 Checking languages in database...\n");

    const allLanguages = await db.select().from(languages);

    if (allLanguages.length === 0) {
      console.log("❌ No languages found in database!");
      console.log("💡 Run: npx tsx scripts/run-language-migration.ts");
      process.exit(1);
    }

    console.log(`✅ Found ${allLanguages.length} languages:\n`);

    allLanguages.forEach((lang) => {
      console.log(`  ${lang.code.padEnd(5)} | ${lang.name.padEnd(15)} | ${lang.nativeName || lang.name}`);
    });

    console.log("\n✨ Languages table is ready!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error checking languages:", error);
    process.exit(1);
  }
}

checkLanguages();
