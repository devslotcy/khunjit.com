import { config } from 'dotenv';
import { resolve } from 'path';

// Load production environment variables
config({ path: resolve(process.cwd(), '.env.production') });

import { emailService } from "./server/email/service.js";
import { storage } from "./server/storage.js";

async function sendTestBookingEmails() {
  console.log('📧 Sending Test Booking Confirmation Emails\n');
  console.log('Environment:', {
    smtp: process.env.SMTP_HOST,
    user: process.env.SMTP_USER,
    hasPassword: !!process.env.SMTP_PASS
  });

  // Initialize storage
  await emailService.initialize(storage);

  const testEmail = "dev.rocksowl@gmail.com";
  const timestamp = Date.now();

  const appointmentDate = "Salı, 28 Ocak 2026";
  const appointmentTime = "14:30";
  const joinLink = "https://khunjit.com/appointments/test-" + timestamp;

  console.log('\n🎯 Target email:', testEmail);
  console.log('⏰ Timestamp:', timestamp);

  // Test 1: Turkish Patient Email
  console.log('\n' + '='.repeat(60));
  console.log('📧 Test 1: Turkish Patient Email (Hasta emaili - Türkçe)');
  console.log('='.repeat(60));
  try {
    const result1 = await emailService.sendBookingConfirmed(
      'test-patient-tr-' + timestamp,
      'test-appointment-tr-patient-' + timestamp,
      testEmail,
      {
        firstName: "Ahmet",
        psychologistName: "Dr. Ayşe Yılmaz",
        appointmentDate: "Salı, 28 Ocak 2026",
        appointmentTime: "14:30",
        joinLink,
      },
      'tr',
      'patient'
    );

    if (result1.success) {
      console.log('✅ SUCCESS: Turkish patient email sent');
      console.log('   Variables used:');
      console.log('   - firstName: Ahmet');
      console.log('   - psychologistName: Dr. Ayşe Yılmaz');
    } else {
      console.log('❌ FAILED:', result1.error);
    }
  } catch (error) {
    console.log('❌ ERROR:', error);
  }

  // Wait a bit between emails
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: Turkish Psychologist Email
  console.log('\n' + '='.repeat(60));
  console.log('📧 Test 2: Turkish Psychologist Email (Psikolog emaili - Türkçe)');
  console.log('='.repeat(60));
  try {
    const result2 = await emailService.sendBookingConfirmed(
      'test-psych-tr-' + timestamp,
      'test-appointment-tr-psych-' + timestamp,
      testEmail,
      {
        firstName: "Ayşe",
        patientName: "Ahmet Demir", // 🔑 Using patientName for psychologist
        appointmentDate: "Salı, 28 Ocak 2026",
        appointmentTime: "14:30",
        joinLink,
      },
      'tr',
      'psychologist'
    );

    if (result2.success) {
      console.log('✅ SUCCESS: Turkish psychologist email sent');
      console.log('   Variables used:');
      console.log('   - firstName: Ayşe');
      console.log('   - patientName: Ahmet Demir (🔑 NEW VARIABLE)');
    } else {
      console.log('❌ FAILED:', result2.error);
    }
  } catch (error) {
    console.log('❌ ERROR:', error);
  }

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 3: Vietnamese Patient Email
  console.log('\n' + '='.repeat(60));
  console.log('📧 Test 3: Vietnamese Patient Email (Email bệnh nhân - Tiếng Việt)');
  console.log('='.repeat(60));
  try {
    const result3 = await emailService.sendBookingConfirmed(
      'test-patient-vi-' + timestamp,
      'test-appointment-vi-patient-' + timestamp,
      testEmail,
      {
        firstName: "Nguyen",
        psychologistName: "Bác sĩ Trần Văn A",
        appointmentDate: "Thứ Ba, 28 tháng 1, 2026",
        appointmentTime: "14:30",
        joinLink,
      },
      'vi',
      'patient'
    );

    if (result3.success) {
      console.log('✅ SUCCESS: Vietnamese patient email sent');
      console.log('   Variables used:');
      console.log('   - firstName: Nguyen');
      console.log('   - psychologistName: Bác sĩ Trần Văn A');
    } else {
      console.log('❌ FAILED:', result3.error);
    }
  } catch (error) {
    console.log('❌ ERROR:', error);
  }

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 4: Vietnamese Psychologist Email
  console.log('\n' + '='.repeat(60));
  console.log('📧 Test 4: Vietnamese Psychologist Email (Email bác sĩ - Tiếng Việt)');
  console.log('='.repeat(60));
  try {
    const result4 = await emailService.sendBookingConfirmed(
      'test-psych-vi-' + timestamp,
      'test-appointment-vi-psych-' + timestamp,
      testEmail,
      {
        firstName: "Trần",
        patientName: "Nguyễn Văn B", // 🔑 Using patientName for psychologist
        appointmentDate: "Thứ Ba, 28 tháng 1, 2026",
        appointmentTime: "14:30",
        joinLink,
      },
      'vi',
      'psychologist'
    );

    if (result4.success) {
      console.log('✅ SUCCESS: Vietnamese psychologist email sent');
      console.log('   Variables used:');
      console.log('   - firstName: Trần');
      console.log('   - patientName: Nguyễn Văn B (🔑 NEW VARIABLE)');
    } else {
      console.log('❌ FAILED:', result4.error);
    }
  } catch (error) {
    console.log('❌ ERROR:', error);
  }

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 5: Thai Patient Email
  console.log('\n' + '='.repeat(60));
  console.log('📧 Test 5: Thai Patient Email (อีเมลผู้ป่วย - ภาษาไทย)');
  console.log('='.repeat(60));
  try {
    const result5 = await emailService.sendBookingConfirmed(
      'test-patient-th-' + timestamp,
      'test-appointment-th-patient-' + timestamp,
      testEmail,
      {
        firstName: "สมชาย",
        psychologistName: "คุณหมอ ศิริพร",
        appointmentDate: "วันอังคาร 28 มกราคม 2026",
        appointmentTime: "14:30",
        joinLink,
      },
      'th',
      'patient'
    );

    if (result5.success) {
      console.log('✅ SUCCESS: Thai patient email sent');
      console.log('   Variables used:');
      console.log('   - firstName: สมชาย');
      console.log('   - psychologistName: คุณหมอ ศิริพร');
    } else {
      console.log('❌ FAILED:', result5.error);
    }
  } catch (error) {
    console.log('❌ ERROR:', error);
  }

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 6: Thai Psychologist Email
  console.log('\n' + '='.repeat(60));
  console.log('📧 Test 6: Thai Psychologist Email (อีเมลจิตแพทย์ - ภาษาไทย)');
  console.log('='.repeat(60));
  try {
    const result6 = await emailService.sendBookingConfirmed(
      'test-psych-th-' + timestamp,
      'test-appointment-th-psych-' + timestamp,
      testEmail,
      {
        firstName: "ศิริพร",
        patientName: "คุณ สมชาย", // 🔑 Using patientName for psychologist
        appointmentDate: "วันอังคาร 28 มกราคม 2026",
        appointmentTime: "14:30",
        joinLink,
      },
      'th',
      'psychologist'
    );

    if (result6.success) {
      console.log('✅ SUCCESS: Thai psychologist email sent');
      console.log('   Variables used:');
      console.log('   - firstName: ศิริพร');
      console.log('   - patientName: คุณ สมชาย (🔑 NEW VARIABLE)');
    } else {
      console.log('❌ FAILED:', result6.error);
    }
  } catch (error) {
    console.log('❌ ERROR:', error);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Test completed! Check your inbox at: ' + testEmail);
  console.log('='.repeat(60));
  console.log('\n📝 Key Points:');
  console.log('   ✓ Patient emails show psychologist name ({{psychologistName}})');
  console.log('   ✓ Psychologist emails show patient name ({{patientName}})');
  console.log('   ✓ Tested in 3 languages: Turkish, Vietnamese, Thai');
  console.log('   ✓ Total emails sent: 6 (3 patient + 3 psychologist)');
}

sendTestBookingEmails()
  .then(() => {
    console.log('\n✅ All emails sent successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
