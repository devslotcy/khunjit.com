import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import { join } from 'path';
import { format } from 'date-fns';
import * as dotenv from 'dotenv';

dotenv.config();

async function testBookingConfirmed() {
  console.log('📧 Testing Booking Confirmed Email\n');
  
  // Read booking-confirmed template
  const templatePath = join(process.cwd(), 'server/email/templates/en/booking-confirmed.html');
  let html = readFileSync(templatePath, 'utf-8');
  
  // Prepare test data
  const appointmentDate = format(new Date('2026-02-15T14:00:00'), 'd MMMM yyyy, EEEE');
  const appointmentTime = format(new Date('2026-02-15T14:00:00'), 'HH:mm');
  const joinLink = 'http://localhost:5173/video-call?room=test-room-123';
  
  const variables = {
    firstName: 'Dev',
    psychologistName: 'Dr. Sarah Johnson',
    appointmentDate: appointmentDate,
    appointmentTime: appointmentTime,
    joinLink: joinLink,
    platformUrl: 'http://localhost:5173',
    dashboardLink: 'http://localhost:5173/dashboard'
  };
  
  // Replace variables
  for (const [key, value] of Object.entries(variables)) {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  
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
    console.log('Sending to: dev.stackflick@gmail.com');
    console.log('Appointment: 15 February 2026, Saturday at 14:00');
    console.log('Psychologist: Dr. Sarah Johnson\n');
    
    const info = await transporter.sendMail({
      from: '"KhunJit Platform" <support@khunjit.com>',
      to: 'dev.stackflick@gmail.com',
      subject: 'Your Appointment Confirmed - KhunJit',
      html: html,
      text: `Your Appointment Confirmed

Hi Dev,

Your appointment with Dr. Sarah Johnson has been confirmed!

Date: ${appointmentDate}
Time: ${appointmentTime}

Join link: ${joinLink}

See you soon!`
    });
    
    console.log('✅ Booking confirmation email sent!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('\n📬 Check: dev.stackflick@gmail.com');
    console.log('   Subject: "Your Appointment Confirmed - KhunJit"');
    
  } catch (error: any) {
    console.error('❌ Failed:', error.message);
  }
}

testBookingConfirmed();
