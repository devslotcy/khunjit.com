import { db } from "./server/db";
import { payoutLedger, payments, appointments, psychologistProfiles, countryTaxRules } from "./shared/schema";
import { eq, isNull, and, lte, or, gte } from "drizzle-orm";

/**
 * Backfill script to create payout ledger entries for existing payments
 * that don't have tax breakdown data yet.
 */

interface TaxRule {
  countryCode: string;
  withholdingRate: string;
  platformTaxRate: string;
}

async function getTaxRule(countryCode: string): Promise<TaxRule | null> {
  const now = new Date();
  const [rule] = await db
    .select()
    .from(countryTaxRules)
    .where(
      and(
        eq(countryTaxRules.countryCode, countryCode),
        lte(countryTaxRules.effectiveFrom, now),
        or(
          isNull(countryTaxRules.effectiveTo),
          gte(countryTaxRules.effectiveTo, now)
        )
      )
    )
    .limit(1);

  if (rule) {
    return {
      countryCode: rule.countryCode,
      withholdingRate: rule.withholdingRate,
      platformTaxRate: rule.platformTaxRate || "0",
    };
  }

  // Default to US rules if not found
  console.warn(`No tax rule found for ${countryCode}, using US default`);
  const [usRule] = await db
    .select()
    .from(countryTaxRules)
    .where(eq(countryTaxRules.countryCode, "US"))
    .limit(1);

  if (usRule) {
    return {
      countryCode: usRule.countryCode,
      withholdingRate: usRule.withholdingRate,
      platformTaxRate: usRule.platformTaxRate || "0",
    };
  }

  return null;
}

function calculatePayoutSplit(
  grossAmount: number,
  countryCode: string,
  withholdingRate: number,
  platformFeeRate: number = 0.20 // 20% platform fee
) {
  // Step 1: Platform fee (20% of gross)
  const platformFee = Math.round(grossAmount * platformFeeRate * 100) / 100;

  // Step 2: Psychologist's gross (80% of gross)
  const psychologistGross = Math.round((grossAmount - platformFee) * 100) / 100;

  // Step 3: Withholding tax (applied to psychologist's gross)
  const withholdingAmount = Math.round(psychologistGross * withholdingRate * 100) / 100;

  // Step 4: Psychologist's net (after tax)
  const psychologistNet = Math.round((psychologistGross - withholdingAmount) * 100) / 100;

  // Step 5: Platform's net (fee + withheld tax)
  const platformNet = Math.round((platformFee + withholdingAmount) * 100) / 100;

  return {
    platformFee,
    psychologistGross,
    withholdingAmount,
    psychologistNet,
    platformNet,
  };
}

async function backfillPayoutLedger() {
  try {
    console.log("Starting payout ledger backfill...\n");

    // Get all payments that don't have a payout ledger entry
    const allPayments = await db.select().from(payments);
    console.log(`Total payments: ${allPayments.length}`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const payment of allPayments) {
      try {
        // Check if ledger already exists
        const [existingLedger] = await db
          .select()
          .from(payoutLedger)
          .where(eq(payoutLedger.paymentId, payment.id))
          .limit(1);

        if (existingLedger) {
          skipped++;
          continue;
        }

        // Get appointment
        const [appointment] = await db
          .select()
          .from(appointments)
          .where(eq(appointments.id, payment.appointmentId))
          .limit(1);

        if (!appointment) {
          console.warn(`  Payment ${payment.id}: No appointment found, skipping`);
          errors++;
          continue;
        }

        // Get psychologist
        const [psychologist] = await db
          .select()
          .from(psychologistProfiles)
          .where(eq(psychologistProfiles.userId, appointment.psychologistId))
          .limit(1);

        const countryCode = psychologist?.countryCode || "US";

        // Get tax rule for country
        const taxRule = await getTaxRule(countryCode);
        if (!taxRule) {
          console.warn(`  Payment ${payment.id}: No tax rule found for ${countryCode}, skipping`);
          errors++;
          continue;
        }

        // Calculate split
        const grossAmount = parseFloat(payment.amount || "0");
        if (grossAmount <= 0) {
          console.warn(`  Payment ${payment.id}: Invalid amount ${grossAmount}, skipping`);
          errors++;
          continue;
        }

        const withholdingRate = parseFloat(taxRule.withholdingRate);
        const split = calculatePayoutSplit(grossAmount, countryCode, withholdingRate);

        // Create payout ledger entry
        await db.insert(payoutLedger).values({
          appointmentId: payment.appointmentId,
          paymentId: payment.id,
          psychologistId: appointment.psychologistId,
          countryCode,
          amountGross: grossAmount.toFixed(2),
          platformFeeRate: "0.20", // 20%
          platformFee: split.platformFee.toFixed(2),
          psychologistGross: split.psychologistGross.toFixed(2),
          withholdingRate: withholdingRate.toFixed(4),
          withholdingAmount: split.withholdingAmount.toFixed(2),
          psychologistNet: split.psychologistNet.toFixed(2),
          platformNet: split.platformNet.toFixed(2),
          currency: payment.currency || "USD",
          taxBreakdownJson: {
            step1_gross: grossAmount,
            step2_platformFee: split.platformFee,
            step3_psychologistGross: split.psychologistGross,
            step4_withholdingTax: split.withholdingAmount,
            step5_psychologistNet: split.psychologistNet,
            step6_platformNet: split.platformNet,
          },
          payoutStatus: payment.status === "paid" ? "pending" : "pending",
        });

        created++;
        console.log(`  ✓ Created ledger for payment ${payment.id} (${countryCode}, ${(withholdingRate * 100).toFixed(2)}% tax)`);
      } catch (error) {
        console.error(`  ✗ Error processing payment ${payment.id}:`, error);
        errors++;
      }
    }

    console.log("\n--- Summary ---");
    console.log(`Created: ${created}`);
    console.log(`Skipped (already exists): ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log(`Total: ${allPayments.length}`);

    process.exit(0);
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

backfillPayoutLedger();
