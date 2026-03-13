import { db } from "./server/db";
import { payoutLedger, psychologistProfiles, appointments } from "./shared/schema";
import { eq } from "drizzle-orm";

/**
 * Fix payout ledger country codes based on current psychologist profiles
 */

async function fixPayoutLedgerCountries() {
  try {
    console.log("Fixing payout ledger country codes...\n");

    const ledgers = await db.select().from(payoutLedger);
    console.log(`Total ledger entries: ${ledgers.length}\n`);

    let updated = 0;
    let withTax = 0;

    for (const ledger of ledgers) {
      // Get appointment
      const [appointment] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, ledger.appointmentId))
        .limit(1);

      if (!appointment) continue;

      // Get psychologist
      const [psychologist] = await db
        .select()
        .from(psychologistProfiles)
        .where(eq(psychologistProfiles.userId, appointment.psychologistId))
        .limit(1);

      if (!psychologist) continue;

      const countryCode = psychologist.countryCode || "US";

      // If country changed, recalculate tax
      if (countryCode !== ledger.countryCode) {
        console.log(`Updating ledger ${ledger.id}: ${ledger.countryCode} → ${countryCode}`);

        // Get tax rate for new country
        let withholdingRate = 0;
        if (countryCode === "TH") withholdingRate = 0.03; // 3%
        else if (countryCode === "TR") withholdingRate = 0.20; // 20%
        else if (countryCode === "VN") withholdingRate = 0.10; // 10%
        else if (countryCode === "PH") withholdingRate = 0.08; // 8%
        else if (countryCode === "ID") withholdingRate = 0.05; // 5%
        else if (countryCode === "JP") withholdingRate = 0.1021; // 10.21%
        else if (countryCode === "KR") withholdingRate = 0.033; // 3.3%

        const psychologistGross = parseFloat(ledger.psychologistGross);
        const withholdingAmount = Math.round(psychologistGross * withholdingRate * 100) / 100;
        const psychologistNet = Math.round((psychologistGross - withholdingAmount) * 100) / 100;
        const platformFee = parseFloat(ledger.platformFee);
        const platformNet = Math.round((platformFee + withholdingAmount) * 100) / 100;

        // Update ledger
        await db
          .update(payoutLedger)
          .set({
            countryCode,
            withholdingRate: withholdingRate.toFixed(4),
            withholdingAmount: withholdingAmount.toFixed(2),
            psychologistNet: psychologistNet.toFixed(2),
            platformNet: platformNet.toFixed(2),
            taxBreakdownJson: {
              ...ledger.taxBreakdownJson as any,
              step4_withholdingTax: withholdingAmount,
              step5_psychologistNet: psychologistNet,
              step6_platformNet: platformNet,
            },
          })
          .where(eq(payoutLedger.id, ledger.id));

        updated++;

        if (withholdingAmount > 0) {
          withTax++;
          console.log(`  Tax: ${withholdingAmount.toFixed(2)} (${(withholdingRate * 100).toFixed(2)}%)`);
        }
      }
    }

    console.log("\n--- Summary ---");
    console.log(`Updated: ${updated} ledger entries`);
    console.log(`With tax withholding: ${withTax} entries`);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

fixPayoutLedgerCountries();
