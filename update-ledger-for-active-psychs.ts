import { db } from "./server/db";
import { payoutLedger, payments, psychologistProfiles } from "./shared/schema";
import { eq, inArray } from "drizzle-orm";

/**
 * Update payout ledger entries for psychologists with updated country codes
 */

async function updateLedgerForActivePsychs() {
  try {
    console.log("Updating payout ledger for active psychologists...\n");

    // Get psychologists with non-US countries
    const nonUSPsychs = await db
      .select()
      .from(psychologistProfiles)
      .where(inArray(psychologistProfiles.countryCode, ["TH", "TR", "VN"]));

    console.log(`Found ${nonUSPsychs.length} non-US psychologists:`);
    for (const p of nonUSPsychs) {
      console.log(`  ${p.fullName}: ${p.countryCode} (userId: ${p.userId})`);
    }

    if (nonUSPsychs.length === 0) {
      console.log("\nNo non-US psychologists found");
      process.exit(0);
    }

    console.log("\nFinding payments for these psychologists...");

    // Get all payments
    const allPayments = await db.select().from(payments);

    let updated = 0;
    let withTax = 0;

    for (const payment of allPayments) {
      // Check if payment psychologistId matches any of our non-US psychs
      const psychologist = nonUSPsychs.find(p => p.userId === payment.psychologistId);

      if (!psychologist) continue;

      // Get existing ledger
      const [ledger] = await db
        .select()
        .from(payoutLedger)
        .where(eq(payoutLedger.paymentId, payment.id))
        .limit(1);

      if (!ledger) {
        console.log(`  No ledger found for payment ${payment.id}`);
        continue;
      }

      const countryCode = psychologist.countryCode;

      // Get tax rate for country
      let withholdingRate = 0;
      if (countryCode === "TH") withholdingRate = 0.03; // 3%
      else if (countryCode === "TR") withholdingRate = 0.20; // 20%
      else if (countryCode === "VN") withholdingRate = 0.10; // 10%

      const psychologistGross = parseFloat(ledger.psychologistGross);
      const withholdingAmount = Math.round(psychologistGross * withholdingRate * 100) / 100;
      const psychologistNet = Math.round((psychologistGross - withholdingAmount) * 100) / 100;
      const platformFee = parseFloat(ledger.platformFee);
      const platformNet = Math.round((platformFee + withholdingAmount) * 100) / 100;

      // Update ledger
      await db
        .update(payoutLedger)
        .set({
          psychologistId: psychologist.userId,
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

      console.log(`✓ Updated ledger for payment ${payment.id.substring(0, 8)}...`);
      console.log(`  Psychologist: ${psychologist.fullName} (${countryCode})`);
      console.log(`  Tax: ${withholdingAmount.toFixed(2)} ${payment.currency} (${(withholdingRate * 100).toFixed(2)}%)`);
      console.log(`  Psychologist Net: ${psychologistNet.toFixed(2)} ${payment.currency}`);

      updated++;
      if (withholdingAmount > 0) withTax++;
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

updateLedgerForActivePsychs();
