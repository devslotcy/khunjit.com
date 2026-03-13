import { db } from "./server/db";
import { psychologistProfiles, payoutLedger } from "./shared/schema";
import { sql } from "drizzle-orm";

/**
 * Update some psychologists to different countries to demonstrate tax withholding
 */

async function updatePsychologistsCountry() {
  try {
    console.log("Updating psychologists to different countries...\n");

    const psychologists = await db.select().from(psychologistProfiles);

    if (psychologists.length < 3) {
      console.error("Not enough psychologists in database");
      process.exit(1);
    }

    // Update first psychologist to Thailand (3% tax)
    await db
      .update(psychologistProfiles)
      .set({ countryCode: "TH" })
      .where(sql`id = ${psychologists[0].id}`);
    console.log(`✓ ${psychologists[0].fullName} → Thailand (3% tax)`);

    // Update second psychologist to Turkey (20% tax)
    if (psychologists.length > 1) {
      await db
        .update(psychologistProfiles)
        .set({ countryCode: "TR" })
        .where(sql`id = ${psychologists[1].id}`);
      console.log(`✓ ${psychologists[1].fullName} → Turkey (20% tax)`);
    }

    // Update third psychologist to Vietnam (10% tax)
    if (psychologists.length > 2) {
      await db
        .update(psychologistProfiles)
        .set({ countryCode: "VN" })
        .where(sql`id = ${psychologists[2].id}`);
      console.log(`✓ ${psychologists[2].fullName} → Vietnam (10% tax)`);
    }

    console.log("\n✓ Countries updated successfully!");

    // Now recalculate payout ledger for these psychologists
    console.log("\nRecalculating payout ledgers with new tax rates...");

    // Delete all payout ledger entries to recalculate
    await db.delete(payoutLedger);
    console.log("✓ Cleared old payout ledger entries");

    console.log("\nNow run: npx tsx backfill-payout-ledger.ts");
    console.log("to recalculate with new tax rates\n");

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

updatePsychologistsCountry();
