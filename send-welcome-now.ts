import { config } from 'dotenv';
config();

import { db } from './server/db.js';
import { users, userProfiles, languages } from './shared/schema.js';
import { eq, desc } from 'drizzle-orm';
import { emailService } from './server/email/service.js';
import { storage } from './server/storage.js';

async function sendWelcomeToRecentUser() {
  console.log('📧 Sending Welcome Email to Most Recent User\n');

  // Initialize email service
  emailService.setStorage(storage);

  // Get most recent user
  const [recentUser] = await db.select().from(users).orderBy(desc(users.createdAt)).limit(1);

  if (!recentUser) {
    console.log('❌ No users found');
    return;
  }

  console.log(`👤 User: ${recentUser.firstName} ${recentUser.lastName}`);
  console.log(`📧 Email: ${recentUser.email}`);
  console.log(`📅 Created: ${recentUser.createdAt}`);

  // Get user's language
  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, recentUser.id)).limit(1);
  let langCode = 'en';
  if (profile?.languageId) {
    const [lang] = await db.select().from(languages).where(eq(languages.id, profile.languageId)).limit(1);
    langCode = lang?.code || 'en';
    console.log(`🌍 Language: ${lang?.name} (${langCode})`);
  } else {
    console.log(`🌍 Language: Default (en)`);
  }

  console.log('\n📤 Sending welcome email...');

  try {
    const result = await emailService.sendWelcome(
      recentUser.id,
      recentUser.email,
      recentUser.firstName || 'User',
      langCode as any
    );

    if (result.success) {
      console.log('✅ SUCCESS! Email sent');
      console.log(`   Email Log ID: ${result.emailLogId}`);
      if (result.alreadySent) {
        console.log('   ⚠️ Note: Email was already sent before');
      }
    } else {
      console.log('❌ FAILED!');
      console.log(`   Error: ${result.error}`);
    }
  } catch (error) {
    console.log('❌ EXCEPTION!');
    console.error(error);
  }
}

sendWelcomeToRecentUser()
  .then(() => {
    console.log('\n✅ Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
