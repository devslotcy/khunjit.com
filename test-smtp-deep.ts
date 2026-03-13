import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

async function deepSMTPTest() {
  console.log('🔍 Deep SMTP Diagnosis\n');
  console.log('=' .repeat(70));

  const config = {
    host: process.env.SMTP_HOST || 'khunjit.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || 'support@khunjit.com',
      pass: process.env.SMTP_PASS || ''
    },
    debug: true, // Enable debug output
    logger: true, // Enable logger
    tls: {
      rejectUnauthorized: false
    }
  };

  console.log('\n📋 Configuration:');
  console.log(JSON.stringify({
    ...config,
    auth: { ...config.auth, pass: '***' + config.auth.pass.slice(-4) }
  }, null, 2));
  console.log('=' .repeat(70));

  const transporter = nodemailer.createTransport(config);

  try {
    // Test 1: Verify connection
    console.log('\n🧪 Test 1: Verifying SMTP connection...');
    const verifyResult = await transporter.verify();
    console.log('✅ Verification result:', verifyResult);

    // Test 2: Get server info
    console.log('\n🧪 Test 2: Sending actual email with full logging...');

    const mailOptions = {
      from: `"KhunJit Support" <${config.auth.user}>`,
      to: 'dev.stackflick@gmail.com',
      subject: `🧪 SMTP Deep Test - ${new Date().toISOString()}`,
      text: `This is a deep SMTP test email.

Sent at: ${new Date().toLocaleString('tr-TR')}
SMTP Server: ${config.host}
Port: ${config.port}
Secure: ${config.secure}

If you receive this, the SMTP system is working correctly.

Test ID: ${Date.now()}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px;">
    <h2 style="color: #4F46E5;">🧪 SMTP Deep Test</h2>
    <p>This is a deep SMTP test email.</p>

    <div style="background: #f0f0f0; padding: 15px; border-radius: 4px; margin: 20px 0;">
      <strong>Test Details:</strong><br>
      Sent at: ${new Date().toLocaleString('tr-TR')}<br>
      SMTP Server: ${config.host}<br>
      Port: ${config.port}<br>
      Secure: ${config.secure}<br>
      Test ID: ${Date.now()}
    </div>

    <p>If you receive this, the SMTP system is working correctly.</p>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
    <p style="color: #666; font-size: 12px;">KhunJit - Mental Health Platform</p>
  </div>
</body>
</html>
      `
    };

    console.log('\n📧 Sending with options:', {
      ...mailOptions,
      text: mailOptions.text.substring(0, 50) + '...',
      html: '[HTML content]'
    });

    const info = await transporter.sendMail(mailOptions);

    console.log('\n✅ Email sent successfully!');
    console.log('\n📊 Send Result:');
    console.log('  Message ID:', info.messageId);
    console.log('  Accepted:', info.accepted);
    console.log('  Rejected:', info.rejected);
    console.log('  Pending:', info.pending);
    console.log('  Response:', info.response);
    console.log('  Envelope:', JSON.stringify(info.envelope, null, 2));

    if (info.rejected && info.rejected.length > 0) {
      console.error('\n⚠️  WARNING: Some recipients were rejected!');
      console.error('  Rejected addresses:', info.rejected);
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ DEEP SMTP TEST COMPLETED\n');
    console.log('📬 Check your email at: dev.stackflick@gmail.com');
    console.log('   Subject: 🧪 SMTP Deep Test - [timestamp]');
    console.log('   From: support@khunjit.com');
    console.log('\n' + '='.repeat(70));

  } catch (error: any) {
    console.error('\n❌ SMTP TEST FAILED!\n');
    console.error('Error Type:', error.constructor.name);
    console.error('Error Message:', error.message);

    if (error.code) {
      console.error('Error Code:', error.code);
    }

    if (error.command) {
      console.error('Failed Command:', error.command);
    }

    if (error.responseCode) {
      console.error('Response Code:', error.responseCode);
    }

    if (error.response) {
      console.error('Server Response:', error.response);
    }

    console.error('\n📋 Full Error Object:');
    console.error(JSON.stringify(error, null, 2));

    console.error('\n🔧 Possible Issues:');
    console.error('  1. SMTP credentials might be incorrect');
    console.error('  2. SMTP server might be blocking connections');
    console.error('  3. Firewall might be blocking port 465');
    console.error('  4. Email account might need additional configuration');

    process.exit(1);
  }
}

deepSMTPTest();
