import { db } from "./server/db";
import { psychologistProfiles, payments, appointments, payoutLedger } from "./shared/schema";
import { eq } from "drizzle-orm";

/**
 * Create a test payment with tax withholding for demonstration
 */

async function createTestPaymentWithTax() {
  try {
    console.log("Creating test payment with tax withholding...\n");

    // Get a psychologist
    const [psychologist] = await db
      .select()
      .from(psychologistProfiles)
      .limit(1);

    if (!psychologist) {
      console.error("No psychologist found in database");
      process.exit(1);
    }

    console.log(`Using psychologist: ${psychologist.fullName}`);
    console.log(`Current country: ${psychologist.countryCode}`);

    // Update psychologist to Thailand (3% tax)
    await db
      .update(psychologistProfiles)
      .set({ countryCode: "TH" })
      .where(eq(psychologistProfiles.id, psychologist.id));

    console.log("✓ Updated psychologist country to TH (Thailand - 3% tax)\n");

    // Get an appointment for this psychologist
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.psychologistId, psychologist.userId))
      .limit(1);

    if (!appointment) {
      console.error("No appointment found for this psychologist");
      process.exit(1);
    }

    console.log(`Using appointment: ${appointment.id}`);

    // Get the payment for this appointment
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.appointmentId, appointment.id))
      .limit(1);

    if (!payment) {
      console.error("No payment found for this appointment");
      process.exit(1);
    }

    console.log(`Found payment: ${payment.id}`);
    console.log(`Amount: ${payment.amount} ${payment.currency}`);

    // Delete existing payout ledger if exists
    await db
      .delete(payoutLedger)
      .where(eq(payoutLedger.paymentId, payment.id));

    // Calculate with 3% tax (Thailand)
    const grossAmount = parseFloat(payment.amount || "0");
    const platformFee = Math.round(grossAmount * 0.20 * 100) / 100; // 20%
    const psychologistGross = Math.round((grossAmount - platformFee) * 100) / 100; // 80%
    const withholdingAmount = Math.round(psychologistGross * 0.03 * 100) / 100; // 3% of 80%
    const psychologistNet = Math.round((psychologistGross - withholdingAmount) * 100) / 100;
    const platformNet = Math.round((platformFee + withholdingAmount) * 100) / 100;

    // Create new payout ledger with tax
    await db.insert(payoutLedger).values({
      appointmentId: appointment.id,
      paymentId: payment.id,
      psychologistId: appointment.psychologistId,
      countryCode: "TH",
      amountGross: grossAmount.toFixed(2),
      platformFeeRate: "0.20",
      platformFee: platformFee.toFixed(2),
      psychologistGross: psychologistGross.toFixed(2),
      withholdingRate: "0.0300", // 3%
      withholdingAmount: withholdingAmount.toFixed(2),
      psychologistNet: psychologistNet.toFixed(2),
      platformNet: platformNet.toFixed(2),
      currency: payment.currency || "THB",
      taxBreakdownJson: {
        step1_gross: grossAmount,
        step2_platformFee: platformFee,
        step3_psychologistGross: psychologistGross,
        step4_withholdingTax: withholdingAmount,
        step5_psychologistNet: psychologistNet,
        step6_platformNet: platformNet,
      },
      payoutStatus: "pending",
    });

    console.log("\n✓ Created payout ledger with tax breakdown:");
    console.log(`  Gross Amount: ${grossAmount.toFixed(2)} ${payment.currency}`);
    console.log(`  Platform Fee (20%): ${platformFee.toFixed(2)} ${payment.currency}`);
    console.log(`  Psychologist Gross (80%): ${psychologistGross.toFixed(2)} ${payment.currency}`);
    console.log(`  Withholding Tax (3%): ${withholdingAmount.toFixed(2)} ${payment.currency}`);
    console.log(`  Psychologist Net: ${psychologistNet.toFixed(2)} ${payment.currency}`);
    console.log(`  Platform Net: ${platformNet.toFixed(2)} ${payment.currency}`);

    console.log("\n✅ Test payment created successfully!");
    console.log("You can now view this in the admin panel to see the tax breakdown.\n");

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

createTestPaymentWithTax();
