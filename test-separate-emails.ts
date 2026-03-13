import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import { join } from 'path';
import { format } from 'date-fns';
import * as dotenv from 'dotenv';

dotenv.config();

async function testSeparateEmails() {
  console.log('📧 Testing Separate Patient & Psychologist Emails\n');
  
  const appointmentDate = format(new Date('2026-02-15T14:00:00'), 'd MMMM yyyy, EEEE');
  const appointmentTime = format(new Date('2026-02-15T14:00:00'), 'HH:mm');
  const joinLink = 'http://localhost:5173/video-call?room=test-room-123';
  
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
  
  // Test 1: Patient Email
  console.log('1️⃣ Sending PATIENT email...');
  const patientTemplate = readFileSync(join(process.cwd(), 'server/email/templates/en/booking-confirmed-patient.html'), 'utf-8');
  
  let patientHtml = patientTemplate;
  const patientVars = {
    firstName: 'Dev',
    psychologistName: 'Dr. Sarah Johnson',
    appointmentDate,
    appointmentTime,
    joinLink,
    dashboardLink: 'http://localhost:5173/dashboard',
    platformUrl: 'http://localhost:5173'
  };
  
  for (const [key, value] of Object.entries(patientVars)) {
    patientHtml = patientHtml.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  
  try {
    const info1 = await transporter.sendMail({
      from: '"KhunJit Platform" <support@khunjit.com>',
      to: 'dev.stackflick@gmail.com',
      subject: '✅ Your Appointment Confirmed - KhunJit',
      html: patientHtml
    });
    console.log('   ✅ Patient email sent:', info1.messageId);
  } catch (err: any) {
    console.error('   ❌ Failed:', err.message);
  }
  
  console.log('');
  
  // Test 2: Psychologist Email
  console.log('2️⃣ Sending PSYCHOLOGIST email...');
  const psychTemplate = readFileSync(join(process.cwd(), 'server/email/templates/en/booking-confirmed-psychologist.html'), 'utf-8');
  
  let psychHtml = psychTemplate;
  const psychVars = {
    firstName: 'Sarah',
    psychologistName: 'Dev Kumar', // client name for psychologist
    appointmentDate,
    appointmentTime,
    joinLink,
    dashboardLink: 'http://localhost:5173/psychologist/dashboard',
    platformUrl: 'http://localhost:5173'
  };
  
  for (const [key, value] of Object.entries(psychVars)) {
    psychHtml = psychHtml.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  
  try {
    const info2 = await transporter.sendMail({
      from: '"KhunJit Platform" <support@khunjit.com>',
      to: 'dev.stackflick@gmail.com',
      subject: '📅 New Appointment Confirmed - KhunJit',
      html: psychHtml
    });
    console.log('   ✅ Psychologist email sent:', info2.messageId);
  } catch (err: any) {
    console.error('   ❌ Failed:', err.message);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Both emails sent!');
  console.log('\n📬 Check: dev.stackflick@gmail.com');
  console.log('   You should receive 2 different emails:');
  console.log('   1. Patient email (green theme, tips for patient)');
  console.log('   2. Psychologist email (purple theme, session prep info)');
  console.log('='.repeat(60));
}

testSeparateEmails();
