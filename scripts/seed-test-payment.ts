import { db } from "../server/db";
import { users, userProfiles, psychologistProfiles, appointments, payments } from "../shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

async function seedTestPayment() {
  console.log("🌱 Creating test payment data...");

  // Create test patient
  const patientId = randomUUID();
  const patientPasswordHash = await bcrypt.hash("test123", 10);

  await db.insert(users).values({
    id: patientId,
    email: "test-patient@example.com",
    username: "testpatient",
    passwordHash: patientPasswordHash,
    firstName: "Test",
    lastName: "Hasta",
  });

  await db.insert(userProfiles).values({
    userId: patientId,
    role: "patient",
    status: "active",
  });

  // Create test psychologist
  const psychologistUserId = randomUUID();
  const psychologistId = randomUUID();
  const psychologistPasswordHash = await bcrypt.hash("test123", 10);

  await db.insert(users).values({
    id: psychologistUserId,
    email: "test-psychologist@example.com",
    username: "testpsychologist",
    passwordHash: psychologistPasswordHash,
    firstName: "Dr. Test",
    lastName: "Psikolog",
  });

  await db.insert(userProfiles).values({
    userId: psychologistUserId,
    role: "psychologist",
    status: "active",
  });

  await db.insert(psychologistProfiles).values({
    id: psychologistId,
    userId: psychologistUserId,
    fullName: "Dr. Test Psikolog",
    title: "Dr.",
    licenseNumber: "PSY-TEST-001",
    pricePerSession: "789.00",
    verified: true,
    verificationStatus: "approved",
    status: "active",
  });

  // Create test appointment
  const appointmentId = randomUUID();
  const now = new Date();
  const sessionStart = new Date(now);
  sessionStart.setHours(14, 0, 0, 0);
  const sessionEnd = new Date(sessionStart);
  sessionEnd.setMinutes(sessionStart.getMinutes() + 50);

  await db.insert(appointments).values({
    id: appointmentId,
    patientId,
    psychologistId,
    startAt: sessionStart,
    endAt: sessionEnd,
    status: "confirmed",
    meetingRoom: "test-room-001",
  });

  // Create test payment with full breakdown
  const grossAmount = 789.00;
  const vatRate = 20;
  const vatAmount = grossAmount * 0.20; // 157.80
  const netOfVat = grossAmount - vatAmount; // 631.20
  const platformFeeRate = 30;
  const platformFee = netOfVat * 0.30; // 189.36
  const processorFee = grossAmount * 0.029 + 0.30; // 23.18
  const providerPayout = netOfVat - platformFee - processorFee; // 513.34

  await db.insert(payments).values({
    appointmentId,
    patientId,
    psychologistId,
    provider: "test",
    externalRef: "TEST-" + randomUUID().substring(0, 8),
    status: "completed",
    grossAmount: grossAmount.toFixed(2),
    vatRate: vatRate.toFixed(2),
    vatAmount: vatAmount.toFixed(2),
    netOfVat: netOfVat.toFixed(2),
    platformFee: platformFee.toFixed(2),
    platformFeeRate: platformFeeRate.toFixed(2),
    processorFee: processorFee.toFixed(2),
    providerPayout: providerPayout.toFixed(2),
    currency: "TRY",
    paidAt: now,
  });

  console.log("✅ Test payment created successfully!");
  console.log("📊 Payment Details:");
  console.log(`   Brüt Gelir: ${grossAmount.toFixed(2)} TRY`);
  console.log(`   KDV (20%): ${vatAmount.toFixed(2)} TRY`);
  console.log(`   Platform Komisyonu (30%): ${platformFee.toFixed(2)} TRY`);
  console.log(`   Psikolog Payı: ${providerPayout.toFixed(2)} TRY`);
  console.log("\n👤 Test Accounts:");
  console.log(`   Patient: test-patient@example.com / test123`);
  console.log(`   Psychologist: test-psychologist@example.com / test123`);
}

seedTestPayment()
  .then(() => {
    console.log("🎉 Seeding completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });
