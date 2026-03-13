// Test script for appointment reminders
import { db } from "./server/db";
import { eq, and, or, gte, lte, isNull } from "drizzle-orm";
import { appointments } from "@shared/schema";

async function test() {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  console.log("Now:", now.toISOString());
  console.log("One hour later:", oneHourLater.toISOString());

  const upcomingAppointments = await db
    .select()
    .from(appointments)
    .where(and(
      or(
        eq(appointments.status, "confirmed"),
        eq(appointments.status, "ready")
      ),
      gte(appointments.startAt, now),
      lte(appointments.startAt, oneHourLater),
      eq(appointments.reminderSent1h, false),
      isNull(appointments.deletedAt)
    ));

  console.log(`Found ${upcomingAppointments.length} appointments:`);
  upcomingAppointments.forEach(apt => {
    const minutesUntil = Math.floor((apt.startAt.getTime() - now.getTime()) / 60000);
    console.log(`- ID: ${apt.id}`);
    console.log(`  Start: ${apt.startAt.toISOString()}`);
    console.log(`  Minutes until: ${minutesUntil}`);
    console.log(`  Status: ${apt.status}`);
    console.log(`  Reminder sent: ${apt.reminderSent1h}`);
  });
}

test().then(() => process.exit(0)).catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
