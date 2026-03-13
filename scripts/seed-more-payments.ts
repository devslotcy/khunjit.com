import { db } from "../server/db";
import { users, payments, appointments } from "../shared/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

async function seedMorePayments() {
  console.log("🌱 Creating more test payments...");

  // Get test users
  const [patient] = await db.select().from(users).where(eq(users.email, "test-patient@example.com")).limit(1);
  const [psychologist] = await db.select().from(users).where(eq(users.email, "test-psychologist@example.com")).limit(1);

  if (!patient || !psychologist) {
    console.error("❌ Test users not found. Please run seed-test-payment.ts first.");
    process.exit(1);
  }

  // Get psychologist profile ID
  const psychologistId = ""; // We'll query this

  const amounts = [789.00, 650.00, 850.00, 720.00, 950.00];
  const daysAgo = [1, 3, 5, 7, 10];

  for (let i = 0; i < amounts.length; i++) {
    const appointmentId = randomUUID();
    const grossAmount = amounts[i];

    // Calculate dates
    const paymentDate = new Date();
    paymentDate.setDate(paymentDate.getDate() - daysAgo[i]);
    paymentDate.setHours(14 + i, 0, 0, 0);

    const sessionStart = new Date(paymentDate);
    const sessionEnd = new Date(sessionStart);
    sessionEnd.setMinutes(sessionStart.getMinutes() + 50);

    // Payment breakdown
    const vatAmount = grossAmount * 0.20;
    const netOfVat = grossAmount - vatAmount;
    const platformFee = netOfVat * 0.30;
    const processorFee = grossAmount * 0.029 + 0.30;
    const providerPayout = netOfVat - platformFee - processorFee;

    // Create appointment
    await db.insert(appointments).values({
      id: appointmentId,
      patientId: patient.id,
      psychologistId: psychologistId || randomUUID(), // Use actual psychologist ID
      startAt: sessionStart,
      endAt: sessionEnd,
      status: "confirmed",
      meetingRoom: `test-room-${i + 2}`,
    });

    // Create payment
    await db.insert(payments).values({
      appointmentId,
      patientId: patient.id,
      psychologistId: psychologistId || randomUUID(),
      provider: "test",
      externalRef: `TEST-${i + 2}-` + randomUUID().substring(0, 6),
      status: "completed",
      grossAmount: grossAmount.toFixed(2),
      vatRate: "20.00",
      vatAmount: vatAmount.toFixed(2),
      netOfVat: netOfVat.toFixed(2),
      platformFee: platformFee.toFixed(2),
      platformFeeRate: "30.00",
      processorFee: processorFee.toFixed(2),
      providerPayout: providerPayout.toFixed(2),
      currency: "TRY",
      paidAt: paymentDate,
    });

    console.log(`✅ Payment ${i + 1} created: ${grossAmount.toFixed(2)} TRY (${daysAgo[i]} days ago)`);
  }

  console.log("\n🎉 All test payments created successfully!");
}

seedMorePayments()
  .then(() => {
    console.log("✨ Seeding completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });
