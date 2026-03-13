import nodemailer from 'nodemailer';

async function directTest() {
  const transporter = nodemailer.createTransport({
    host: 'khunjit.com',
    port: 465,
    secure: true,
    auth: {
      user: 'support@khunjit.com',
      pass: 'onedeV1511pq.wwii'
    },
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3'
    },
    debug: true,
    logger: true
  });

  try {
    const info = await transporter.sendMail({
      from: 'support@khunjit.com',
      to: 'dev.stackflick@gmail.com',
      subject: 'DKIM Active Test',
      text: 'Test email with DKIM'
    });
    
    console.log('\n✅ SUCCESS!');
    console.log('ID:', info.messageId);
    console.log('Response:', info.response);
  } catch (err: any) {
    console.error('\n❌ FAILED:', err.message);
  }
}

directTest();
