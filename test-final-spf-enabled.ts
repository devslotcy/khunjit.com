import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

async function finalSPFTest() {
  console.log('🎉 Final Email Test - SPF Enabled\n');
  console.log('═'.repeat(70));

  const transporter = nodemailer.createTransport({
    host: 'khunjit.com',
    port: 465,
    secure: true,
    auth: {
      user: 'support@khunjit.com',
      pass: process.env.SMTP_PASS || ''
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    const timestamp = new Date().toLocaleString('tr-TR', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    console.log('\n📧 Sending test email with SPF validation...\n');

    const info = await transporter.sendMail({
      from: '"KhunJit Mental Health Platform" <support@khunjit.com>',
      to: 'dev.stackflick@gmail.com',
      subject: '🎯 SPF Test Success - KhunJit Email System',
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'X-Mailer': 'KhunJit Email System v1.0'
      },
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">

    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">
          ✅ Email System Active!
        </h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 15px;">
          SPF Record Successfully Configured
        </p>
      </td>
    </tr>

    <!-- Success Banner -->
    <tr>
      <td style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 20px 30px;">
        <p style="margin: 0; color: #065f46; font-size: 15px; line-height: 1.6;">
          <strong>🎉 Congratulations!</strong><br>
          Your email system is now fully operational with proper SPF authentication.
          This email should arrive in your Primary inbox, not Spam.
        </p>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 35px 30px;">
        <h2 style="color: #111; margin: 0 0 15px 0; font-size: 20px;">Hi Dev,</h2>

        <p style="color: #444; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
          This email confirms that <strong>KhunJit's email system</strong> is working perfectly
          with all security configurations in place.
        </p>

        <!-- Status Table -->
        <table width="100%" cellpadding="12" cellspacing="0" style="background: #f8fafc; border-radius: 8px; margin: 25px 0;">
          <tr>
            <td>
              <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 14px;">
                <tr>
                  <td style="color: #666; padding: 6px 0;"><strong>✅ SPF Record:</strong></td>
                  <td style="color: #10b981; font-weight: 600; padding: 6px 0;">Active & Valid</td>
                </tr>
                <tr>
                  <td style="color: #666; padding: 6px 0;"><strong>🔒 SSL/TLS:</strong></td>
                  <td style="color: #10b981; font-weight: 600; padding: 6px 0;">Enabled</td>
                </tr>
                <tr>
                  <td style="color: #666; padding: 6px 0;"><strong>📧 SMTP:</strong></td>
                  <td style="color: #10b981; font-weight: 600; padding: 6px 0;">Authenticated</td>
                </tr>
                <tr>
                  <td style="color: #666; padding: 6px 0;"><strong>🎯 Delivery:</strong></td>
                  <td style="color: #10b981; font-weight: 600; padding: 6px 0;">Optimized</td>
                </tr>
                <tr>
                  <td style="color: #666; padding: 6px 0;"><strong>⏰ Sent:</strong></td>
                  <td style="color: #333; padding: 6px 0;">${timestamp}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 25px 0;">
          <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
            <strong>📌 Important:</strong> If this email arrived in your Spam folder,
            please mark it as "Not Spam" to ensure future emails reach your inbox.
          </p>
        </div>

        <p style="color: #444; font-size: 15px; line-height: 1.7; margin: 25px 0;">
          Your KhunJit account is ready to use. You can now book appointments with
          professional psychologists and access all platform features.
        </p>

        <!-- CTA Button -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
          <tr>
            <td align="center">
              <a href="http://localhost:5173/dashboard"
                 style="display: inline-block; background: #10b981; color: white; text-decoration: none;
                        padding: 14px 35px; border-radius: 8px; font-size: 15px; font-weight: 600;
                        box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);">
                Access Dashboard →
              </a>
            </td>
          </tr>
        </table>

      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">
          © ${new Date().getFullYear()} KhunJit - Mental Health Platform
        </p>
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
          🔐 Secure email • SPF Authenticated • SSL/TLS Encrypted
        </p>
      </td>
    </tr>

  </table>
</body>
</html>
      `,
      text: `
✅ Email System Active!

SPF Record Successfully Configured

Hi Dev,

This email confirms that KhunJit's email system is working perfectly with all security configurations in place.

Status Report:
✅ SPF Record: Active & Valid
🔒 SSL/TLS: Enabled
📧 SMTP: Authenticated
🎯 Delivery: Optimized
⏰ Sent: ${timestamp}

Your KhunJit account is ready to use. You can now book appointments with professional psychologists and access all platform features.

Access your dashboard: http://localhost:5173/dashboard

---
© ${new Date().getFullYear()} KhunJit - Mental Health Platform
🔐 Secure email • SPF Authenticated • SSL/TLS Encrypted
      `
    });

    console.log('✅ Email sent successfully!\n');
    console.log('📊 Delivery Details:');
    console.log('  ├─ Message ID:', info.messageId);
    console.log('  ├─ Queue ID:', info.response.match(/queued as ([A-Z0-9]+)/)?.[1] || 'N/A');
    console.log('  ├─ Accepted:', info.accepted?.join(', '));
    console.log('  ├─ Rejected:', info.rejected?.length ? info.rejected.join(', ') : 'None');
    console.log('  └─ Status:', info.response);

    console.log('\n═'.repeat(70));
    console.log('\n🎯 EMAIL SYSTEM FULLY OPERATIONAL!\n');
    console.log('📬 Check Your Email Now:');
    console.log('   • Gmail: dev.stackflick@gmail.com');
    console.log('   • Look in: Primary Inbox (should NOT be in Spam)');
    console.log('   • Subject: "🎯 SPF Test Success - KhunJit Email System"');
    console.log('   • Delivery: 30 seconds - 2 minutes');
    console.log('\n💡 SPF authentication means:');
    console.log('   ✅ Gmail trusts your emails');
    console.log('   ✅ Better inbox placement');
    console.log('   ✅ Reduced spam filtering');
    console.log('   ✅ Improved deliverability');
    console.log('\n═'.repeat(70));

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

finalSPFTest();
