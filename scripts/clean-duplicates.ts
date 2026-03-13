import { db } from "../server/db";
import { psychologistProfiles } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Clean duplicate entries in specialties and therapyApproaches arrays
 * for all psychologist profiles
 */
async function cleanDuplicates() {
  console.log("Starting duplicate cleanup...");

  try {
    // Fetch all psychologist profiles
    const profiles = await db.select().from(psychologistProfiles);
    console.log(`Found ${profiles.length} psychologist profiles`);

    let updatedCount = 0;

    // Process each profile
    for (const profile of profiles) {
      const cleanSpecialties = [...new Set(profile.specialties || [])];
      const cleanTherapyApproaches = [...new Set(profile.therapyApproaches || [])];

      // Check if there were duplicates
      const hadSpecialtyDupes = (profile.specialties?.length || 0) !== cleanSpecialties.length;
      const hadApproachDupes = (profile.therapyApproaches?.length || 0) !== cleanTherapyApproaches.length;

      if (hadSpecialtyDupes || hadApproachDupes) {
        console.log(`\nCleaning profile ${profile.id}:`);
        console.log(`  Specialties: ${profile.specialties?.length || 0} -> ${cleanSpecialties.length}`);
        console.log(`  Approaches: ${profile.therapyApproaches?.length || 0} -> ${cleanTherapyApproaches.length}`);

        // Update the profile
        await db.update(psychologistProfiles)
          .set({
            specialties: cleanSpecialties,
            therapyApproaches: cleanTherapyApproaches,
            updatedAt: new Date()
          })
          .where(eq(psychologistProfiles.id, profile.id));

        updatedCount++;
      }
    }

    console.log(`\n✅ Cleanup complete! Updated ${updatedCount} profiles`);
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    throw error;
  }
}

// Run the cleanup
cleanDuplicates()
  .then(() => {
    console.log("Script finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
