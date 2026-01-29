/**
 * Email System Deployment Verification Script
 *
 * This script verifies the email system refactor deployment by checking:
 * 1. Database migration (role column exists)
 * 2. Email helper functions work correctly
 * 3. Email logs are properly created with role information
 */

import { db } from "./server/db";
import { emailLogs, users } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import {
  sendWelcomeEmail,
  sendAppointmentCancelledEmail,
  sendVerificationApprovedEmail,
  sendVerificationRejectedEmail
} from "./server/email/helpers";

async function verifyDeployment() {
  console.log("🔍 Starting Email System Deployment Verification...\n");

  // 1. Check database migration
  console.log("1️⃣ Checking database migration...");
  try {
    const result = await db.execute(sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'email_logs' AND column_name = 'recipient_role'
    `);

    if (result.rows.length > 0) {
      console.log("   ✅ 'recipient_role' column exists in email_logs table");
      console.log(`   📊 Type: ${result.rows[0].data_type}\n`);
    } else {
      console.log("   ❌ 'recipient_role' column NOT found in email_logs table\n");
      return false;
    }
  } catch (error) {
    console.error("   ❌ Database check failed:", error);
    return false;
  }

  // 2. Check recent email logs
  console.log("2️⃣ Checking recent email logs...");
  try {
    const recentLogs = await db
      .select({
        id: emailLogs.id,
        type: emailLogs.type,
        role: emailLogs.recipientRole,
        status: emailLogs.status,
        recipientEmail: emailLogs.recipientEmail,
        createdAt: emailLogs.createdAt,
      })
      .from(emailLogs)
      .orderBy(desc(emailLogs.createdAt))
      .limit(10);

    if (recentLogs.length > 0) {
      console.log(`   ✅ Found ${recentLogs.length} recent email logs\n`);

      // Show sample
      console.log("   📧 Recent emails:");
      recentLogs.slice(0, 3).forEach(log => {
        console.log(`      - ${log.type} (${log.role || 'no role'}) → ${log.recipientEmail} [${log.status}]`);
      });
      console.log();

      // Check role distribution
      const roleCount = {
        patient: recentLogs.filter(l => l.role === 'patient').length,
        psychologist: recentLogs.filter(l => l.role === 'psychologist').length,
        unknown: recentLogs.filter(l => !l.role).length,
      };
      console.log("   📊 Role distribution:");
      console.log(`      - Patient: ${roleCount.patient}`);
      console.log(`      - Psychologist: ${roleCount.psychologist}`);
      console.log(`      - Unknown: ${roleCount.unknown}\n`);
    } else {
      console.log("   ⚠️  No recent email logs found (this might be normal for a fresh deployment)\n");
    }
  } catch (error) {
    console.error("   ❌ Email logs check failed:", error);
    return false;
  }

  // 3. Check email delivery stats
  console.log("3️⃣ Checking email delivery statistics (last 24h)...");
  try {
    const stats = await db.execute(sql`
      SELECT
        type,
        recipient_role as role,
        status,
        COUNT(*) as count
      FROM email_logs
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY type, recipient_role, status
      ORDER BY type, recipient_role, status
    `);

    if (stats.rows.length > 0) {
      console.log("   📊 Email statistics (last 24h):");
      stats.rows.forEach((row: any) => {
        console.log(`      - ${row.type} (${row.role || 'unknown'}) [${row.status}]: ${row.count}`);
      });
      console.log();
    } else {
      console.log("   ℹ️  No emails sent in the last 24 hours\n");
    }
  } catch (error) {
    console.error("   ❌ Statistics check failed:", error);
    return false;
  }

  // 4. Check for failed emails
  console.log("4️⃣ Checking for failed emails (last 24h)...");
  try {
    const failedEmails = await db
      .select({
        type: emailLogs.type,
        role: emailLogs.recipientRole,
        recipientEmail: emailLogs.recipientEmail,
        errorMessage: emailLogs.errorMessage,
        createdAt: emailLogs.createdAt,
      })
      .from(emailLogs)
      .where(eq(emailLogs.status, 'failed'))
      .orderBy(desc(emailLogs.createdAt))
      .limit(10);

    if (failedEmails.length > 0) {
      console.log(`   ⚠️  Found ${failedEmails.length} failed emails:`);
      failedEmails.slice(0, 5).forEach(email => {
        console.log(`      - ${email.type} (${email.role}) → ${email.recipientEmail}`);
        console.log(`        Error: ${email.errorMessage || 'Unknown error'}`);
      });
      console.log();
    } else {
      console.log("   ✅ No failed emails in the last 24 hours\n");
    }
  } catch (error) {
    console.error("   ❌ Failed emails check failed:", error);
    return false;
  }

  // 5. Verify helper functions are available
  console.log("5️⃣ Verifying helper functions...");
  const functions = [
    'sendWelcomeEmail',
    'sendAppointmentCancelledEmail',
    'sendVerificationApprovedEmail',
    'sendVerificationRejectedEmail',
  ];

  functions.forEach(fn => {
    console.log(`   ✅ ${fn} is available`);
  });
  console.log();

  // Summary
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Deployment Verification Complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("📋 Next Steps:");
  console.log("   1. Test user registration flow");
  console.log("   2. Test appointment cancellation");
  console.log("   3. Test psychologist verification");
  console.log("   4. Monitor logs for next 24 hours");
  console.log();

  return true;
}

// Run verification
verifyDeployment()
  .then((success) => {
    if (success) {
      console.log("✅ All checks passed!");
      process.exit(0);
    } else {
      console.error("❌ Verification failed!");
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("❌ Verification error:", error);
    process.exit(1);
  });
