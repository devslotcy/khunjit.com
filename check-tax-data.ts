import { db } from "./server/db";
import { payoutLedger, payments, appointments, psychologistProfiles } from "./shared/schema";
import { eq } from "drizzle-orm";

async function checkTaxData() {
  try {
    console.log("Checking payout ledger and tax data...\n");

    // Get all payments
    const allPayments = await db.select().from(payments).limit(10);
    console.log(`Total payments (sample): ${allPayments.length}`);

    for (const payment of allPayments) {
      console.log(`\n--- Payment ${payment.id} ---`);
      console.log(`Status: ${payment.status}`);
      console.log(`Amount: ${payment.amount} ${payment.currency}`);

      // Check if payout ledger exists
      const [ledger] = await db
        .select()
        .from(payoutLedger)
        .where(eq(payoutLedger.paymentId, payment.id))
        .limit(1);

      if (ledger) {
        console.log(`✓ Payout Ledger exists`);
        console.log(`  - Psychologist Gross: ${ledger.psychologistGross}`);
        console.log(`  - Withholding Tax: ${ledger.withholdingAmount}`);
        console.log(`  - Withholding Rate: ${ledger.withholdingRate}`);
        console.log(`  - Psychologist Net: ${ledger.psychologistNet}`);
        console.log(`  - Country: ${ledger.countryCode}`);
      } else {
        console.log(`✗ NO Payout Ledger found`);

        // Get appointment and psychologist info
        const [appointment] = await db
          .select()
          .from(appointments)
          .where(eq(appointments.id, payment.appointmentId))
          .limit(1);

        if (appointment) {
          const [psychologist] = await db
            .select()
            .from(psychologistProfiles)
            .where(eq(psychologistProfiles.userId, appointment.psychologistId))
            .limit(1);

          console.log(`  - Psychologist country: ${psychologist?.countryCode || 'Unknown'}`);
          console.log(`  - Should create payout ledger for this payment`);
        }
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkTaxData();
