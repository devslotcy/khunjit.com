// Test sending system message
import { db } from "./server/db";
import { conversations, messages } from "@shared/schema";
import { sql } from "drizzle-orm";

async function testSendMessage() {
  const SYSTEM_USER_ID = 'system';
  const TEST_USER_ID = 'f1ffef01-ccd1-4fd7-82ba-241ab050fd0f'; // Your psychologist user ID

  try {
    // Find existing conversation where system is patient and user is psychologist
    // OR system is psychologist and user is patient
    const [existingConv] = await db
      .select()
      .from(conversations)
      .where(
        sql`(patient_id = ${SYSTEM_USER_ID} AND psychologist_id = ${TEST_USER_ID}) OR (patient_id = ${TEST_USER_ID} AND psychologist_id = ${SYSTEM_USER_ID})`
      )
      .limit(1);

    let conversationId: string;

    if (existingConv) {
      console.log("Found existing conversation:", existingConv.id);
      conversationId = existingConv.id;
    } else {
      console.log("Creating new conversation...");
      const [newConv] = await db.insert(conversations).values({
        patientId: SYSTEM_USER_ID,
        psychologistId: TEST_USER_ID,
      }).returning();
      conversationId = newConv.id;
      console.log("Created conversation:", conversationId);
    }

    // Send test message
    const messageText = "TEST: ps2 doctor ile saat 16:00'de randevunuz vardır.\nSeansı kaçırmayın.\nSeansa kalan süre: 25 dk";

    await db.insert(messages).values({
      conversationId,
      senderUserId: SYSTEM_USER_ID,
      text: messageText,
    });

    console.log("✅ Message sent successfully!");
    console.log("Message:", messageText);

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

testSendMessage().then(() => process.exit(0));
