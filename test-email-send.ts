import nodemailer from 'nodemailer';

async function testEmail() {
  console.log('📧 Testing SMTP Email...\n');
  
  const transporter = nodemailer.createTransport({
    host: 'khunjit.com',
    port: 465,
    secure: true,
    auth: {
      user: 'support@khunjit.com',
      pass: 'onedeV1511pq.wwii'
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!\n');

    console.log('📤 Sending test email to dev.stackflick@gmail.com...');
    const info = await transporter.sendMail({
      from: 'KhunJit <support@khunjit.com>',
      to: 'dev.stackflick@gmail.com',
      subject: 'Welcome to KhunJit! 🎉',
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #4F46E5;">Welcome to KhunJit! 🎉</h1>
              <p>Hi <strong>Dev</strong>,</p>
              <p>Thank you for joining KhunJit! We're excited to have you on board.</p>
              <p>This is a test email to verify that our email system is working correctly.</p>
              <div style="margin: 30px 0;">
                <a href="http://localhost:5173/dashboard" 
                   style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Go to Dashboard
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">
                If you have any questions, feel free to contact our support team.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #999; font-size: 12px;">
                KhunJit - Your Mental Health Platform
              </p>
            </div>
          </body>
        </html>
      `
    });

    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('\n📝 Next steps:');
    console.log('  1. Check inbox: dev.stackflick@gmail.com');
    console.log('  2. Check spam folder if not in inbox');
    console.log('  3. Wait a few seconds for delivery');

  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
    if (error.code) {
      console.error('Error Code:', error.code);
    }
    console.error(error);
  }
}

testEmail();
