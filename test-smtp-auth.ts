import nodemailer from 'nodemailer';

async function testAuth() {
  console.log('Testing SMTP authentication...\n');
  
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
      minVersion: 'TLSv1'
    }
  });

  try {
    console.log('Verifying connection...');
    await transporter.verify();
    console.log('✅ Authentication successful!\n');
    
    console.log('Sending test email...');
    const info = await transporter.sendMail({
      from: 'support@khunjit.com',
      to: 'dev.stackflick@gmail.com',
      subject: 'DKIM Test ' + Date.now(),
      text: 'Test with DKIM enabled'
    });
    
    console.log('✅ Email sent!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    console.error('Code:', err.code);
    console.error('\nTrying port 587 with STARTTLS...\n');
    
    // Try alternative port
    const transporter2 = nodemailer.createTransport({
      host: 'khunjit.com',
      port: 587,
      secure: false,
      auth: {
        user: 'support@khunjit.com',
        pass: 'onedeV1511pq.wwii'
      },
      tls: { 
        rejectUnauthorized: false 
      }
    });
    
    try {
      await transporter2.verify();
      console.log('✅ Port 587 works!');
      
      const info = await transporter2.sendMail({
        from: 'support@khunjit.com',
        to: 'dev.stackflick@gmail.com',
        subject: 'DKIM Test (Port 587) ' + Date.now(),
        text: 'Test with DKIM enabled via port 587'
      });
      
      console.log('✅ Email sent via port 587!');
      console.log('Message ID:', info.messageId);
      console.log('Response:', info.response);
      
    } catch (err2: any) {
      console.error('❌ Port 587 also failed:', err2.message);
    }
  }
}

testAuth();
