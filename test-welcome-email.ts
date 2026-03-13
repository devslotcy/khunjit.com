/**
 * Test Welcome Email for Existing User
 *
 * Manually send welcome email to test the email system
 */

import * as dotenv from 'dotenv';
import { emailService } from './server/email/service.js';

dotenv.config();

async function testWelcomeEmail() {
  console.log('📧 Testing Welcome Email...\n');

  const userId = 'ef7bac72-c7e0-4334-8807-c3cdf1f8f0b6';
  const email = 'dev.stackflick@gmail.com';
  const firstName = 'Dev';

  try {
    console.log('📤 Sending welcome email...');
    console.log('  User ID:', userId);
    console.log('  Email:', email);
    console.log('  First Name:', firstName);
    console.log('  Language: en (English)');
    console.log('');

    const result = await emailService.sendWelcome(userId, email, firstName, 'en');

    if (result.success) {
      console.log('✅ Welcome email sent successfully!');
      console.log('  Email Log ID:', result.emailLogId);
      if (result.alreadySent) {
        console.log('  Note: Email was already sent before');
      }
    } else {
      console.error('❌ Failed to send welcome email');
      console.error('  Error:', result.error);
    }

    console.log('\n📝 Next steps:');
    console.log('  1. Check inbox: dev.stackflick@gmail.com');
    console.log('  2. Check spam folder if not in inbox');
    console.log('  3. Check server logs for any errors');

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  }
}

testWelcomeEmail();
