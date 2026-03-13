import { config } from 'dotenv';
config();

import { db } from './server/db.js';
import { users, emailLogs } from '@shared/schema';
import { desc, eq } from 'drizzle-orm';

async function checkEmailStatus() {
  console.log('🔍 Checking Recent Users and Email Logs\n');

  // Get recent users
  const recentUsers = await db.select().from(users).orderBy(desc(users.createdAt)).limit(5);
  console.log('📧 Recent Users (last 5):');
  console.log('='.repeat(60));
  recentUsers.forEach(u => {
    console.log(`  👤 ${u.firstName} ${u.lastName || ''}`);
    console.log(`     Email: ${u.email}`);
    console.log(`     Role: ${u.role || 'undefined'}`);
    console.log(`     Created: ${u.createdAt}`);
    console.log('');
  });

  // Get recent email logs
  const recentEmails = await db.select().from(emailLogs).orderBy(desc(emailLogs.createdAt)).limit(15);
  console.log('\n📬 Recent Email Logs (last 15):');
  console.log('='.repeat(60));

  if (recentEmails.length === 0) {
    console.log('  ❌ No email logs found!');
  } else {
    for (const e of recentEmails) {
      // Get user info
      const [user] = await db.select().from(users).where(eq(users.id, e.userId)).limit(1);
      console.log(`  📧 Type: ${e.type}`);
      console.log(`     To: ${user?.email || e.userId}`);
      console.log(`     Status: ${e.status}`);
      console.log(`     Date: ${e.createdAt}`);
      if (e.error) console.log(`     Error: ${e.error}`);
      console.log('');
    }
  }

  // Check for welcome emails specifically
  const welcomeEmails = recentEmails.filter(e => e.type === 'welcome');
  console.log(`\n🎉 Welcome emails in last 15: ${welcomeEmails.length}`);

  // Check if any recent user is missing welcome email
  console.log('\n🔍 Checking if recent users received welcome email:');
  for (const user of recentUsers.slice(0, 3)) {
    const [welcomeLog] = await db.select().from(emailLogs)
      .where(eq(emailLogs.userId, user.id))
      .limit(1);

    if (welcomeLog) {
      console.log(`  ✅ ${user.email}: Welcome email ${welcomeLog.status}`);
    } else {
      console.log(`  ❌ ${user.email}: NO welcome email found!`);
    }
  }
}

checkEmailStatus()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
