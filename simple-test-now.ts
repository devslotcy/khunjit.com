import nodemailer from 'nodemailer';

async function quickTest() {
  console.log('📧 Quick Email Test\n');
  
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

  try {
    console.log('Sending to: dev.stackflick@gmail.com\n');
    
    const info = await transporter.sendMail({
      from: 'support@khunjit.com',
      to: 'dev.stackflick@gmail.com',
      subject: 'TEST - ' + new Date().getTime(),
      text: 'Bu basit bir test emailidir. Zaman: ' + new Date().toLocaleString('tr-TR'),
      html: '<h1>Test Email</h1><p>Bu basit bir test emailidir.</p><p>Zaman: ' + new Date().toLocaleString('tr-TR') + '</p>'
    });

    console.log('✅ SENT!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('\nŞimdi gmail kontrol et!');
    
  } catch (err: any) {
    console.error('❌ FAILED:', err.message);
  }
}

quickTest();
