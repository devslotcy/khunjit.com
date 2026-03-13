/**
 * Test Email Configuration
 *
 * Tests SMTP connection and sends a test email
 */

import * as dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

async function testEmail() {
  console.log('📧 Testing Email Configuration...\n');

  // Check environment variables
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpSecure = process.env.SMTP_SECURE === 'true';
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const emailFrom = process.env.EMAIL_FROM;

  console.log('📋 Current Configuration:');
  console.log('  SMTP Host:', smtpHost || '❌ NOT SET');
  console.log('  SMTP Port:', smtpPort || '❌ NOT SET');
  console.log('  SMTP Secure:', smtpSecure ? 'SSL (port 465)' : 'TLS (port 587)');
  console.log('  SMTP User:', smtpUser || '❌ NOT SET');
  console.log('  SMTP Pass:', smtpPass ? '✅ SET (hidden)' : '❌ NOT SET');
  console.log('  Email From:', emailFrom || '❌ NOT SET');
  console.log('');

  // Validate required fields
  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !emailFrom) {
    console.error('❌ Missing required email configuration!');
    console.error('\nPlease set all required environment variables in .env:');
    console.error('  SMTP_HOST=khunjit.com');
    console.error('  SMTP_PORT=465');
    console.error('  SMTP_SECURE=true');
    console.error('  SMTP_USER=support@khunjit.com');
    console.error('  SMTP_PASS=your_password_here');
    console.error('  EMAIL_FROM=support@khunjit.com');
    process.exit(1);
  }

  try {
    console.log('🔌 Creating SMTP transport...');

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      // For self-signed certificates (development only)
      tls: {
        rejectUnauthorized: false,
      },
    });

    console.log('✅ Transport created');

    // Test connection
    console.log('\n🔍 Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!');

    // Send test email
    console.log('\n📤 Sending test email...');

    const testRecipient = smtpUser; // Send to self

    const info = await transporter.sendMail({
      from: `"Mendly Test" <${emailFrom}>`,
      to: testRecipient,
      subject: '✅ Mendly Email Test - Success!',
      text: `This is a test email from Mendly platform.

If you're seeing this, your email configuration is working correctly!

Configuration:
- SMTP Host: ${smtpHost}
- SMTP Port: ${smtpPort}
- Security: ${smtpSecure ? 'SSL' : 'TLS'}
- From: ${emailFrom}

Timestamp: ${new Date().toISOString()}

Best regards,
Mendly Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">✅ Mendly Email Test - Success!</h2>
          <p>This is a test email from Mendly platform.</p>
          <p>If you're seeing this, your email configuration is working correctly!</p>

          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Configuration:</h3>
            <ul style="list-style: none; padding: 0;">
              <li>📧 SMTP Host: <strong>${smtpHost}</strong></li>
              <li>🔌 SMTP Port: <strong>${smtpPort}</strong></li>
              <li>🔒 Security: <strong>${smtpSecure ? 'SSL' : 'TLS'}</strong></li>
              <li>📮 From: <strong>${emailFrom}</strong></li>
            </ul>
          </div>

          <p style="color: #666; font-size: 12px;">
            Timestamp: ${new Date().toISOString()}
          </p>

          <p>Best regards,<br><strong>Mendly Team</strong></p>
        </div>
      `,
    });

    console.log('✅ Test email sent successfully!');
    console.log('\n📬 Email Details:');
    console.log('  Message ID:', info.messageId);
    console.log('  From:', emailFrom);
    console.log('  To:', testRecipient);
    console.log('  Subject: ✅ Mendly Email Test - Success!');

    console.log('\n🎉 EMAIL CONFIGURATION IS WORKING!');
    console.log('\n📝 Next steps:');
    console.log('  1. Check your inbox:', testRecipient);
    console.log('  2. The test email should arrive within a few minutes');
    console.log('  3. If you don\'t see it, check your spam folder');
    console.log('  4. Make sure SSL certificate is valid for production');

  } catch (error: any) {
    console.error('\n❌ EMAIL TEST FAILED!');
    console.error('\nError:', error.message);

    if (error.code === 'EAUTH') {
      console.error('\n🔴 AUTHENTICATION FAILED!');
      console.error('\n📋 Common causes:');
      console.error('  1. Wrong email password');
      console.error('  2. Email account not created yet');
      console.error('  3. SMTP authentication not enabled');
      console.error('  4. Need to use app password instead of regular password');
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      console.error('\n🔴 CONNECTION FAILED!');
      console.error('\n📋 Common causes:');
      console.error('  1. Wrong SMTP host or port');
      console.error('  2. Firewall blocking SMTP port');
      console.error('  3. SSL/TLS certificate issues');
      console.error('  4. Server not reachable');
    } else if (error.code === 'EENVELOPE') {
      console.error('\n🔴 ENVELOPE ERROR!');
      console.error('\n📋 Common causes:');
      console.error('  1. Invalid email address format');
      console.error('  2. Email domain not verified');
    }

    console.error('\n📋 Troubleshooting:');
    console.error('  1. Verify SMTP credentials are correct');
    console.error('  2. Check if email account exists: support@khunjit.com');
    console.error('  3. Make sure SMTP port 465 is not blocked');
    console.error('  4. For SSL issues, wait for domain SSL certificate');
    console.error('  5. Try using port 587 with TLS instead of 465 with SSL');

    process.exit(1);
  }
}

testEmail();
