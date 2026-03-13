import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

async function finalTest() {
  const transporter = nodemailer.createTransport({
    host: 'khunjit.com',
    port: 465,
    secure: true,
    auth: {
      user: 'support@khunjit.com',
      pass: process.env.SMTP_PASS
    },
    tls: { rejectUnauthorized: false }
  });

  try {
    console.log('Testing with new password...\n');
    
    const info = await transporter.sendMail({
      from: 'support@khunjit.com',
      to: 'dev.stackflick@gmail.com',
      subject: 'Final Test - DKIM + New Pass',
      text: 'Test email with DKIM and updated password',
      html: '<h1>✅ Email System Working</h1><p>DKIM is active, SPF is active, new password works!</p>'
    });
    
    console.log('✅ SUCCESS!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('\nCheck Gmail: dev.stackflick@gmail.com');
  } catch (err: any) {
    console.error('❌ FAILED:', err.message);
  }
}

finalTest();
