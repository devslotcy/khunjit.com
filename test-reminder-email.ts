import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import { join } from 'path';
import { format } from 'date-fns';
import * as dotenv from 'dotenv';

dotenv.config();

async function testReminderEmail() {
  console.log('📧 Testing Appointment Reminder Email\n');
  
  // Read reminder template
  const templatePath = join(process.cwd(), 'server/email/templates/en/reminder.html');
  let html = readFileSync(templatePath, 'utf-8');
  
  // Prepare test data for 1 hour reminder
  const appointmentDate = format(new Date(), 'd MMMM yyyy, EEEE');
  const appointmentTime = format(new Date(Date.now() + 3600000), 'HH:mm'); // 1 hour from now
  const joinLink = 'http://localhost:5173/video-call?room=test-room-123';
  
  const variables = {
    firstName: 'Dev',
    psychologistName: 'Dr. Sarah Johnson',
    appointmentDate: appointmentDate,
    appointmentTime: appointmentTime,
    joinLink: joinLink,
    reminderTime: '1 hour',
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
    console.log('Appointment: Today at', appointmentTime);
    console.log('Reminder: 1 hour before');
    console.log('Psychologist: Dr. Sarah Johnson\n');
    
    const info = await transporter.sendMail({
      from: '"KhunJit Platform" <support@khunjit.com>',
      to: 'dev.stackflick@gmail.com',
      subject: 'Your Session in 1 Hour - KhunJit',
      html: html,
      text: `Your Session in 1 Hour

Hi Dev,

This is a reminder that your session with Dr. Sarah Johnson is in 1 hour.

Date: ${appointmentDate}
Time: ${appointmentTime}

Join link: ${joinLink}

See you soon!`
    });
    
    console.log('✅ Reminder email sent!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('\n📬 Check: dev.stackflick@gmail.com');
    console.log('   Subject: "Your Session in 1 Hour - KhunJit"');
    
  } catch (error: any) {
    console.error('❌ Failed:', error.message);
  }
}

testReminderEmail();
