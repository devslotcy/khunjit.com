import { db } from "./server/db";
import { appointments, psychologistProfiles, payoutLedger } from "./shared/schema";
import { eq } from "drizzle-orm";

async function checkAppointmentPsychologist() {
  try {
    console.log("Checking appointment-psychologist relationships...\n");

    const appts = await db.select().from(appointments).limit(5);

    for (const appt of appts) {
      console.log(`Appointment: ${appt.id}`);
      console.log(`  Psychologist ID: ${appt.psychologistId}`);

      // Get psychologist PROFILE (not user)
      const profiles = await db
        .select()
        .from(psychologistProfiles)
        .where(eq(psychologistProfiles.userId, appt.psychologistId));

      console.log(`  Found ${profiles.length} psychologist profiles`);
      if (profiles.length > 0) {
        console.log(`  Profile Country: ${profiles[0].countryCode}`);
        console.log(`  Profile Name: ${profiles[0].fullName}`);
      }

      // Get ledger
      const [ledger] = await db
        .select()
        .from(payoutLedger)
        .where(eq(payoutLedger.appointmentId, appt.id))
        .limit(1);

      if (ledger) {
        console.log(`  Ledger Country: ${ledger.countryCode}`);
      } else {
        console.log(`  No ledger found`);
      }

      console.log();
    }

    // Check all psychologists
    console.log("\n--- All Psychologists ---");
    const allPsychs = await db.select().from(psychologistProfiles);
    for (const p of allPsychs) {
      console.log(`${p.fullName} (userId: ${p.userId}): ${p.countryCode}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkAppointmentPsychologist();
