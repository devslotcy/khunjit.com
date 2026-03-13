import { db } from "./server/db";
import { countryTaxRules, psychologistProfiles } from "./shared/schema";

async function checkTaxRules() {
  try {
    console.log("Checking tax rules...\n");

    // Get all tax rules
    const allRules = await db.select().from(countryTaxRules);
    console.log(`Total tax rules: ${allRules.length}\n`);

    for (const rule of allRules) {
      console.log(`Country: ${rule.countryCode} (${rule.countryName})`);
      console.log(`  Withholding Rate: ${parseFloat(rule.withholdingRate) * 100}%`);
      console.log(`  Platform Tax Rate: ${parseFloat(rule.platformTaxRate || "0") * 100}%`);
      console.log(`  Effective From: ${rule.effectiveFrom}`);
      console.log(`  Effective To: ${rule.effectiveTo || "Active"}`);
      console.log();
    }

    // Check psychologist countries
    const psychologists = await db.select().from(psychologistProfiles);
    const countryCounts: Record<string, number> = {};

    for (const psych of psychologists) {
      const country = psych.countryCode || "Unknown";
      countryCounts[country] = (countryCounts[country] || 0) + 1;
    }

    console.log("Psychologist distribution by country:");
    for (const [country, count] of Object.entries(countryCounts)) {
      console.log(`  ${country}: ${count} psychologist(s)`);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkTaxRules();
