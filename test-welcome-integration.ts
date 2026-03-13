import { emailService } from './server/email/service.js';
import { storage } from './server/storage.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function testWelcomeIntegration() {
  console.log('🧪 Testing Welcome Email Integration\n');
  
  // Initialize email service with storage
  emailService.setStorage(storage);
  
  const testUser = {
    userId: 'ef7bac72-c7e0-4334-8807-c3cdf1f8f0b6',
    email: 'dev.stackflick@gmail.com',
    firstName: 'Dev',
    language: 'en' as const
  };
  
  console.log('📧 Sending welcome email...');
  console.log('  To:', testUser.email);
  console.log('  Name:', testUser.firstName);
  console.log('  Language:', testUser.language);
  console.log('');
  
  try {
    const result = await emailService.sendWelcome(
      testUser.userId,
      testUser.email,
      testUser.firstName,
      testUser.language
    );
    
    if (result.success) {
      console.log('✅ Welcome email sent!');
      if (result.alreadySent) {
        console.log('   (Already sent before - idempotent)');
      }
      console.log('   Email Log ID:', result.emailLogId);
    } else {
      console.error('❌ Failed:', result.error);
    }
    
    console.log('\n📬 Check Gmail: dev.stackflick@gmail.com');
    console.log('   Subject: "Welcome to KhunJit! 🎉"');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testWelcomeIntegration();
