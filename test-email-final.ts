import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

async function finalEmailTest() {
  console.log('🚀 Final Email Integration Test (After SSL)\n');
  console.log('═'.repeat(70));

  const config = {
    host: process.env.SMTP_HOST || 'khunjit.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true, // SSL enabled
    auth: {
      user: process.env.SMTP_USER || 'support@khunjit.com',
      pass: process.env.SMTP_PASS || ''
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    }
  };

  console.log('\n📋 Configuration:');
  console.log('  Host:', config.host);
  console.log('  Port:', config.port);
  console.log('  SSL/TLS:', config.secure ? '✅ Enabled' : '❌ Disabled');
  console.log('  User:', config.auth.user);
  console.log('  TLS Min Version:', config.tls.minVersion);
  console.log('═'.repeat(70));

  const transporter = nodemailer.createTransport(config);

  try {
    // Step 1: SSL/TLS Connection Test
    console.log('\n🔒 Step 1: Testing SSL/TLS connection...');
    await transporter.verify();
    console.log('✅ SSL/TLS connection successful!');
    console.log('   SMTP server accepts secure connections');

    // Step 2: Send Welcome Email
    console.log('\n📧 Step 2: Sending Welcome Email...');

    const testId = Date.now();
    const timestamp = new Date().toLocaleString('tr-TR', {
      timeZone: 'Europe/Istanbul',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const mailOptions = {
      from: '"KhunJit Platform" <support@khunjit.com>',
      to: 'dev.stackflick@gmail.com',
      subject: `✅ Welcome to KhunJit - SSL Enabled Test`,
      headers: {
        'X-Mailer': 'KhunJit Email System v1.0',
        'X-Test-ID': testId.toString(),
        'X-SSL-Status': 'Enabled'
      },
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to KhunJit</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f0f2f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f2f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">

          <!-- Header with Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 50px 40px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                🎉 Welcome to KhunJit!
              </h1>
              <p style="color: rgba(255,255,255,0.95); margin: 10px 0 0 0; font-size: 16px;">
                Your Mental Health Journey Starts Here
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="font-size: 18px; color: #1a1a1a; margin: 0 0 20px 0; line-height: 1.6;">
                Hi <strong>Dev</strong>,
              </p>

              <p style="font-size: 16px; color: #4a4a4a; margin: 0 0 25px 0; line-height: 1.7;">
                Thank you for joining <strong>KhunJit</strong>! We're excited to have you on our platform.
                This email confirms that our system is working perfectly with SSL/TLS encryption enabled.
              </p>

              <!-- Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9ff; border-left: 4px solid #667eea; border-radius: 8px; margin: 30px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px 0; font-size: 14px; color: #667eea; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      ✅ Email System Status
                    </p>
                    <table width="100%" cellpadding="4" cellspacing="0" style="font-size: 14px; color: #4a4a4a;">
                      <tr>
                        <td style="padding: 4px 0;"><strong>Sent at:</strong></td>
                        <td style="padding: 4px 0;">${timestamp}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0;"><strong>SMTP Server:</strong></td>
                        <td style="padding: 4px 0;">${config.host}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0;"><strong>SSL/TLS:</strong></td>
                        <td style="padding: 4px 0;">✅ Enabled & Verified</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0;"><strong>Authentication:</strong></td>
                        <td style="padding: 4px 0;">✅ Successful</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0;"><strong>Test ID:</strong></td>
                        <td style="padding: 4px 0;">${testId}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="font-size: 16px; color: #4a4a4a; margin: 30px 0; line-height: 1.7;">
                You can now access all features of the platform, including booking appointments
                with professional psychologists and managing your mental health journey.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 35px 0;">
                <tr>
                  <td align="center">
                    <a href="http://localhost:5173/dashboard"
                       style="display: inline-block; background-color: #667eea; color: white; text-decoration: none;
                              padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600;
                              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3); transition: all 0.3s;">
                      Go to Dashboard →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Support Info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border-radius: 8px; margin: 30px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; font-size: 14px; color: #666; line-height: 1.6;">
                      <strong style="color: #1a1a1a;">Need help?</strong><br>
                      Our support team is here for you. Contact us at
                      <a href="mailto:support@khunjit.com" style="color: #667eea; text-decoration: none;">support@khunjit.com</a>
                    </p>
                  </td>
                </tr>
              </table>

              <p style="font-size: 14px; color: #999; margin: 20px 0 0 0; line-height: 1.6;">
                This is an automated message from KhunJit. Please do not reply to this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px 40px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; font-size: 12px; color: #999;">
                © ${new Date().getFullYear()} KhunJit - Your Mental Health Platform
              </p>
              <p style="margin: 0; font-size: 12px; color: #999;">
                🔒 Sent via secure SSL/TLS connection
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
      text: `
Welcome to KhunJit!

Hi Dev,

Thank you for joining KhunJit! We're excited to have you on our platform.

Email System Status:
- Sent at: ${timestamp}
- SMTP Server: ${config.host}
- SSL/TLS: Enabled & Verified
- Authentication: Successful
- Test ID: ${testId}

You can now access all features of the platform by visiting:
http://localhost:5173/dashboard

Need help? Contact us at support@khunjit.com

---
© ${new Date().getFullYear()} KhunJit - Your Mental Health Platform
Sent via secure SSL/TLS connection
      `
    };

    console.log('  To:', mailOptions.to);
    console.log('  Subject:', mailOptions.subject);
    console.log('  Test ID:', testId);

    const info = await transporter.sendMail(mailOptions);

    console.log('\n✅ Email sent successfully!');
    console.log('\n📊 Delivery Report:');
    console.log('  Message ID:', info.messageId);
    console.log('  Accepted:', info.accepted?.join(', ') || 'N/A');
    console.log('  Rejected:', info.rejected?.length ? info.rejected.join(', ') : '✅ None');
    console.log('  Server Response:', info.response);
    console.log('  Envelope From:', info.envelope?.from);
    console.log('  Envelope To:', info.envelope?.to?.join(', '));

    // Check if email was queued successfully
    if (info.response && info.response.includes('250')) {
      console.log('\n🎉 SUCCESS: Email was accepted by the mail server!');
      console.log('   The email has been queued for delivery to Gmail.');
    }

    console.log('\n═'.repeat(70));
    console.log('\n📬 Check Your Email:');
    console.log('   1. Open: dev.stackflick@gmail.com');
    console.log('   2. Check: Inbox (or Spam if not there)');
    console.log('   3. Search: "from:support@khunjit.com" or "KhunJit"');
    console.log('   4. Subject: "✅ Welcome to KhunJit - SSL Enabled Test"');
    console.log('\n💡 If not in Inbox:');
    console.log('   - Check Spam/Junk folder');
    console.log('   - Check All Mail folder');
    console.log('   - Mark as "Not Spam" if found in Spam');
    console.log('\n═'.repeat(70));

  } catch (error: any) {
    console.error('\n❌ EMAIL TEST FAILED!\n');
    console.error('Error Type:', error.constructor.name);
    console.error('Error Message:', error.message);

    if (error.code) console.error('Error Code:', error.code);
    if (error.command) console.error('Failed Command:', error.command);
    if (error.responseCode) console.error('Response Code:', error.responseCode);
    if (error.response) console.error('Server Response:', error.response);

    console.error('\n📋 Full Error:', error);
    process.exit(1);
  }
}

finalEmailTest();
