import { config } from 'dotenv';

// Load .env FIRST before any other imports
config();

// Now import database
import { db } from "./server/db.js";
import { users, psychologistProfiles, appointments, userProfiles, languages } from "@shared/schema";
import { eq } from "drizzle-orm";

async function checkUsers() {
  console.log('🔍 Checking users in the system\n');
  console.log('DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 30) + '...\n');

  // Get all users
  const allUsers = await db.select().from(users).limit(10);

  console.log(`Found ${allUsers.length} users:\n`);

  for (const user of allUsers) {
    console.log(`👤 ${user.firstName} ${user.lastName || ''}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   ID: ${user.id}`);

    // Get user profile to check language
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
    if (profile?.languageId) {
      const [lang] = await db.select().from(languages).where(eq(languages.id, profile.languageId)).limit(1);
      console.log(`   Language: ${lang?.name} (${lang?.code})`);
    }

    // If psychologist, get profile
    if (user.role === 'psychologist') {
      const [psychProfile] = await db.select().from(psychologistProfiles).where(eq(psychologistProfiles.userId, user.id)).limit(1);
      if (psychProfile) {
        console.log(`   Psychologist Profile: ${psychProfile.fullName}`);
        console.log(`   Verification: ${psychProfile.verificationStatus}`);
      }
    }

    console.log('');
  }

  // Check appointments
  const recentAppointments = await db.select().from(appointments).limit(5);
  console.log(`\n📅 Found ${recentAppointments.length} recent appointments`);

  if (recentAppointments.length > 0) {
    for (const apt of recentAppointments) {
      console.log(`\nAppointment ${apt.id}:`);
      console.log(`   Status: ${apt.status}`);
      console.log(`   Start: ${apt.startAt}`);

      // Get patient name
      const [patient] = await db.select().from(users).where(eq(users.id, apt.patientId)).limit(1);
      console.log(`   Patient: ${patient?.firstName} ${patient?.lastName || ''} (${patient?.email})`);

      // Get psychologist name
      const [psychProfile] = await db.select().from(psychologistProfiles).where(eq(psychologistProfiles.id, apt.psychologistId)).limit(1);
      if (psychProfile) {
        const [psych] = await db.select().from(users).where(eq(users.id, psychProfile.userId)).limit(1);
        console.log(`   Psychologist: ${psychProfile.fullName} (${psych?.email})`);
      }
    }
  }
}

checkUsers()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
