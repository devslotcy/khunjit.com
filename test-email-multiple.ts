import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

async function testMultipleEmails() {
  console.log('📧 Testing Email Delivery to Multiple Addresses\n');
  console.log('═'.repeat(70));

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'khunjit.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true,
    auth: {
      user: process.env.SMTP_USER || 'support@khunjit.com',
      pass: process.env.SMTP_PASS || ''
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  // Test addresses
  const testAddresses = [
    'dev.stackflick@gmail.com',
    'support@khunjit.com', // Self test
  ];

  console.log('\n🔍 Testing delivery to multiple email addresses...\n');

  for (const emailAddress of testAddresses) {
    try {
      console.log(`\n📤 Sending to: ${emailAddress}`);

      const info = await transporter.sendMail({
        from: '"KhunJit Test" <support@khunjit.com>',
        to: emailAddress,
        subject: `Test Email - ${new Date().toISOString()}`,
        html: `
<html>
<body style="font-family: Arial, sans-serif; padding: 20px;">
  <h2>🧪 Email Delivery Test</h2>
  <p>This is a test email sent to: <strong>${emailAddress}</strong></p>
  <p>Sent at: ${new Date().toLocaleString('tr-TR')}</p>
  <p>From: support@khunjit.com</p>
  <hr>
  <p style="color: #666; font-size: 12px;">
    If you receive this, the email system is working for your address.
  </p>
</body>
</html>
        `,
        text: `
Email Delivery Test

This is a test email sent to: ${emailAddress}
Sent at: ${new Date().toLocaleString('tr-TR')}
From: support@khunjit.com

If you receive this, the email system is working for your address.
        `
      });

      console.log('  ✅ Status: Sent');
      console.log('  📧 Message ID:', info.messageId);
      console.log('  📊 Response:', info.response);
      console.log('  ✅ Accepted:', info.accepted?.join(', '));

    } catch (error: any) {
      console.error(`  ❌ Failed to send to ${emailAddress}`);
      console.error('  Error:', error.message);
    }
  }

  console.log('\n═'.repeat(70));
  console.log('\n📬 Next Steps:');
  console.log('  1. Check dev.stackflick@gmail.com (Inbox and Spam)');
  console.log('  2. Check support@khunjit.com inbox');
  console.log('  3. If self-test (support@khunjit.com) works, issue is with Gmail delivery');
  console.log('\n═'.repeat(70));
}

testMultipleEmails();
