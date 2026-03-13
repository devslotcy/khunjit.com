import { db } from "../server/db";
import { bankTransfers } from "@shared/schema";

async function checkBankTransfers() {
  try {
    const transfers = await db.select().from(bankTransfers);
    console.log("Total bank transfers:", transfers.length);
    if (transfers.length > 0) {
      console.log("\nFirst 3 transfers:");
      transfers.slice(0, 3).forEach((t, idx) => {
        console.log(`\n${idx + 1}. Transfer ID: ${t.id}`);
        console.log(`   Status: ${t.status}`);
        console.log(`   Amount: ${t.amount}`);
        console.log(`   Bank: ${t.bankName}`);
        console.log(`   Reference: ${t.referenceCode}`);
        console.log(`   Submitted: ${t.submittedAt}`);
      });
    } else {
      console.log("\nNo bank transfers found in database!");
    }
  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

checkBankTransfers();
