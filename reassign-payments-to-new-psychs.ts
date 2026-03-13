import { db } from "./server/db";
import { payments, payoutLedger, psychologistProfiles } from "./shared/schema";
import { eq, limit } from "drizzle-orm";

/**
 * Reassign some payments to new psychologists to demonstrate tax withholding
 */

async function reassignPayments() {
  try {
    console.log("Reassigning payments to demonstrate tax withholding...\n");

    // Get psychologists with different tax rates
    const [thaiPsych] = await db
      .select()
      .from(psychologistProfiles)
      .where(eq(psychologistProfiles.countryCode, "TH"))
      .limit(1);

    const [turkeyPsych] = await db
      .select()
      .from(psychologistProfiles)
      .where(eq(psychologistProfiles.countryCode, "TR"))
      .limit(1);

    const [vietnamPsych] = await db
      .select()
      .from(psychologistProfiles)
      .where(eq(psychologistProfiles.countryCode, "VN"))
      .limit(1);

    if (!thaiPsych || !turkeyPsych || !vietnamPsych) {
      console.error("Missing psychologists");
      process.exit(1);
    }

    console.log("Target psychologists:");
    console.log(`  Thai: ${thaiPsych.fullName} (3% tax)`);
    console.log(`  Turkey: ${turkeyPsych.fullName} (20% tax)`);
    console.log(`  Vietnam: ${vietnamPsych.fullName} (10% tax)`);

    // Get 3 payments to reassign
    const paymentsToUpdate = await db.select().from(payments).limit(3);

    if (paymentsToUpdate.length < 3) {
      console.error("Not enough payments to reassign");
      process.exit(1);
    }

    const psychs = [thaiPsych, turkeyPsych, vietnamPsych];
    const taxRates = [0.03, 0.20, 0.10];
    const countries = ["TH", "TR", "VN"];

    console.log("\nReassigning payments and recalculating taxes...\n");

    for (let i = 0; i < 3 && i < paymentsToUpdate.length; i++) {
      const payment = paymentsToUpdate[i];
      const psych = psychs[i];
      const withholdingRate = taxRates[i];
      const countryCode = countries[i];

      // Update payment psychologist
      await db
        .update(payments)
        .set({ psychologistId: psych.userId })
        .where(eq(payments.id, payment.id));

      // Get or create ledger
      const [ledger] = await db
        .select()
        .from(payoutLedger)
        .where(eq(payoutLedger.paymentId, payment.id))
        .limit(1);

      const grossAmount = parseFloat(payment.amount || "0");
      const platformFee = Math.round(grossAmount * 0.20 * 100) / 100;
      const psychologistGross = Math.round((grossAmount - platformFee) * 100) / 100;
      const withholdingAmount = Math.round(psychologistGross * withholdingRate * 100) / 100;
      const psychologistNet = Math.round((psychologistGross - withholdingAmount) * 100) / 100;
      const platformNet = Math.round((platformFee + withholdingAmount) * 100) / 100;

      if (ledger) {
        // Update existing ledger
        await db
          .update(payoutLedger)
          .set({
            psychologistId: psych.userId,
            countryCode,
            withholdingRate: withholdingRate.toFixed(4),
            withholdingAmount: withholdingAmount.toFixed(2),
            psychologistGross: psychologistGross.toFixed(2),
            psychologistNet: psychologistNet.toFixed(2),
            platformFee: platformFee.toFixed(2),
            platformNet: platformNet.toFixed(2),
            taxBreakdownJson: {
              step1_gross: grossAmount,
              step2_platformFee: platformFee,
              step3_psychologistGross: psychologistGross,
              step4_withholdingTax: withholdingAmount,
              step5_psychologistNet: psychologistNet,
              step6_platformNet: platformNet,
            },
          })
          .where(eq(payoutLedger.id, ledger.id));
      }

      console.log(`✓ Payment ${payment.id.substring(0, 8)}... → ${psych.fullName} (${countryCode})`);
      console.log(`  Amount: ${grossAmount.toFixed(2)} ${payment.currency}`);
      console.log(`  Platform Fee (20%): ${platformFee.toFixed(2)} ${payment.currency}`);
      console.log(`  Psychologist Gross: ${psychologistGross.toFixed(2)} ${payment.currency}`);
      console.log(`  Tax (${(withholdingRate * 100).toFixed(2)}%): ${withholdingAmount.toFixed(2)} ${payment.currency}`);
      console.log(`  Psychologist Net: ${psychologistNet.toFixed(2)} ${payment.currency}`);
      console.log();
    }

    console.log("✅ Payments reassigned successfully!");
    console.log("You can now view these in the admin panel with proper tax withholding.\n");

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

reassignPayments();
