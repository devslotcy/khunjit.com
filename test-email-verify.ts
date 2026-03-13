import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

async function verifyAndSendTestEmail() {
  console.log('📧 Email System Verification & Test\n');
  console.log('=' .repeat(60));

  // Display configuration
  console.log('\n📋 Current SMTP Configuration:');
  console.log('  Host:', process.env.SMTP_HOST);
  console.log('  Port:', process.env.SMTP_PORT);
  console.log('  Secure:', process.env.SMTP_SECURE);
  console.log('  User:', process.env.SMTP_USER);
  console.log('  From:', process.env.EMAIL_FROM);
  console.log('  Password:', process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.slice(-4) : 'NOT SET');

  console.log('\n' + '='.repeat(60));

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'khunjit.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || 'support@khunjit.com',
      pass: process.env.SMTP_PASS || ''
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    // Step 1: Verify connection
    console.log('\n🔌 Step 1: Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!');

    // Step 2: Send test email
    console.log('\n📤 Step 2: Sending test email...');
    console.log('  To: dev.stackflick@gmail.com');
    console.log('  Subject: KhunJit Email Test - ' + new Date().toISOString());

    const info = await transporter.sendMail({
      from: `KhunJit <${process.env.SMTP_USER}>`,
      to: 'dev.stackflick@gmail.com',
      subject: `KhunJit Email Test - ${new Date().toLocaleString('tr-TR')}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welcome to KhunJit!</h1>
              </div>

              <!-- Content -->
              <div style="padding: 40px 30px;">
                <p style="font-size: 18px; margin-top: 0;">Hi <strong>Dev</strong>,</p>

                <p style="font-size: 16px; color: #555;">
                  Bu bir test emailidir. Email sistemimizin düzgün çalıştığını doğrulamak için gönderildi.
                </p>

                <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px; color: #666;">
                    <strong>📧 Test Details:</strong><br>
                    Sent at: ${new Date().toLocaleString('tr-TR')}<br>
                    SMTP Server: ${process.env.SMTP_HOST}<br>
                    From: ${process.env.SMTP_USER}
                  </p>
                </div>

                <p style="font-size: 16px; color: #555;">
                  Thank you for joining KhunJit! We're excited to have you on our mental health platform.
                </p>

                <!-- Button -->
                <div style="text-align: center; margin: 35px 0;">
                  <a href="http://localhost:5173/dashboard"
                     style="background-color: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
                    Go to Dashboard
                  </a>
                </div>

                <p style="font-size: 14px; color: #666; margin-top: 30px;">
                  If you have any questions, feel free to contact our support team at
                  <a href="mailto:support@khunjit.com" style="color: #667eea;">support@khunjit.com</a>
                </p>
              </div>

              <!-- Footer -->
              <div style="background-color: #f8f9fa; padding: 20px 30px; border-radius: 0 0 8px 8px; text-align: center;">
                <p style="color: #999; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} KhunJit - Your Mental Health Platform
                </p>
                <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
                  This is an automated test email from your KhunJit system
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
Hi Dev,

Bu bir test emailidir. Email sistemimizin düzgün çalıştığını doğrulamak için gönderildi.

Test Details:
- Sent at: ${new Date().toLocaleString('tr-TR')}
- SMTP Server: ${process.env.SMTP_HOST}
- From: ${process.env.SMTP_USER}

Thank you for joining KhunJit!

---
KhunJit - Your Mental Health Platform
      `
    });

    console.log('✅ Test email sent successfully!');
    console.log('\n📊 Email Details:');
    console.log('  Message ID:', info.messageId);
    console.log('  Accepted:', info.accepted);
    console.log('  Rejected:', info.rejected);
    console.log('  Response:', info.response);

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ EMAIL SYSTEM TEST COMPLETED SUCCESSFULLY!\n');
    console.log('📬 Next Steps:');
    console.log('  1. Check inbox: dev.stackflick@gmail.com');
    console.log('  2. If not in inbox, check spam/junk folder');
    console.log('  3. Look for email from: support@khunjit.com');
    console.log('  4. Subject line: KhunJit Email Test - [timestamp]');
    console.log('\n' + '='.repeat(60));

  } catch (error: any) {
    console.error('\n❌ EMAIL SYSTEM TEST FAILED!\n');
    console.error('Error:', error.message);
    if (error.code) {
      console.error('Error Code:', error.code);
    }
    if (error.command) {
      console.error('Failed Command:', error.command);
    }
    console.error('\nFull Error:', error);
  }
}

verifyAndSendTestEmail();
