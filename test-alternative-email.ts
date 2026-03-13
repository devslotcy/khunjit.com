import nodemailer from 'nodemailer';

async function testAlternative() {
  const transporter = nodemailer.createTransport({
    host: 'khunjit.com',
    port: 465,
    secure: true,
    auth: {
      user: 'support@khunjit.com',
      pass: 'onedeV1511pq.wwii'
    },
    tls: { rejectUnauthorized: false }
  });

  // Test multiple emails
  const testEmails = [
    'dev.stackflick@gmail.com',
    'support@khunjit.com',  // Self-test
  ];

  console.log('Testing email to multiple addresses...\n');

  for (const email of testEmails) {
    try {
      const info = await transporter.sendMail({
        from: 'support@khunjit.com',
        to: email,
        subject: 'Simple Test ' + Date.now(),
        text: 'Test email to: ' + email
      });
      
      console.log(`✅ ${email}: ${info.response}`);
    } catch (err: any) {
      console.error(`❌ ${email}: ${err.message}`);
    }
  }

  console.log('\n📌 support@khunjit.com adresini kontrol et (webmail)');
  console.log('📌 Eğer orada geliyorsa, Gmail red ediyor demektir');
}

testAlternative();
