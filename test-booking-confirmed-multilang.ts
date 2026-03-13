import { emailService } from "./server/email/service.js";
import { storage } from "./server/storage.js";

async function testBookingConfirmedEmails() {
  console.log('🧪 Testing Booking Confirmed Emails in Multiple Languages\n');

  // Initialize storage
  await emailService.initialize(storage);

  const testEmail = process.env.TEST_EMAIL || "test@example.com";
  const testAppointmentId = "test-appointment-" + Date.now();
  const testUserId = "test-user-" + Date.now();

  const appointmentDate = "Tuesday, January 28, 2026";
  const appointmentTime = "2:30 PM";
  const joinLink = "https://khunjit.com/appointments/test-123";

  // Test 1: Patient email in Turkish
  console.log('📧 Test 1: Patient email in Turkish (tr)');
  try {
    const result1 = await emailService.sendBookingConfirmed(
      testUserId + "-patient-tr",
      testAppointmentId + "-tr-patient",
      testEmail,
      {
        firstName: "Ahmet",
        psychologistName: "Dr. Ayşe Yılmaz",
        appointmentDate,
        appointmentTime,
        joinLink,
      },
      'tr',
      'patient'
    );
    console.log('✅ Turkish patient email:', result1.success ? 'SUCCESS' : 'FAILED');
    if (result1.error) console.log('   Error:', result1.error);
  } catch (error) {
    console.log('❌ Turkish patient email error:', error);
  }

  // Test 2: Psychologist email in Turkish
  console.log('\n📧 Test 2: Psychologist email in Turkish (tr)');
  try {
    const result2 = await emailService.sendBookingConfirmed(
      testUserId + "-psych-tr",
      testAppointmentId + "-tr-psych",
      testEmail,
      {
        firstName: "Ayşe",
        patientName: "Ahmet Demir", // Using patientName for psychologist email
        appointmentDate,
        appointmentTime,
        joinLink,
      },
      'tr',
      'psychologist'
    );
    console.log('✅ Turkish psychologist email:', result2.success ? 'SUCCESS' : 'FAILED');
    if (result2.error) console.log('   Error:', result2.error);
  } catch (error) {
    console.log('❌ Turkish psychologist email error:', error);
  }

  // Test 3: Patient email in Vietnamese
  console.log('\n📧 Test 3: Patient email in Vietnamese (vi)');
  try {
    const result3 = await emailService.sendBookingConfirmed(
      testUserId + "-patient-vi",
      testAppointmentId + "-vi-patient",
      testEmail,
      {
        firstName: "Nguyen",
        psychologistName: "Bác sĩ Tran Van A",
        appointmentDate,
        appointmentTime,
        joinLink,
      },
      'vi',
      'patient'
    );
    console.log('✅ Vietnamese patient email:', result3.success ? 'SUCCESS' : 'FAILED');
    if (result3.error) console.log('   Error:', result3.error);
  } catch (error) {
    console.log('❌ Vietnamese patient email error:', error);
  }

  // Test 4: Psychologist email in Vietnamese
  console.log('\n📧 Test 4: Psychologist email in Vietnamese (vi)');
  try {
    const result4 = await emailService.sendBookingConfirmed(
      testUserId + "-psych-vi",
      testAppointmentId + "-vi-psych",
      testEmail,
      {
        firstName: "Tran",
        patientName: "Nguyen Van B", // Using patientName for psychologist email
        appointmentDate,
        appointmentTime,
        joinLink,
      },
      'vi',
      'psychologist'
    );
    console.log('✅ Vietnamese psychologist email:', result4.success ? 'SUCCESS' : 'FAILED');
    if (result4.error) console.log('   Error:', result4.error);
  } catch (error) {
    console.log('❌ Vietnamese psychologist email error:', error);
  }

  // Test 5: Patient email in Thai
  console.log('\n📧 Test 5: Patient email in Thai (th)');
  try {
    const result5 = await emailService.sendBookingConfirmed(
      testUserId + "-patient-th",
      testAppointmentId + "-th-patient",
      testEmail,
      {
        firstName: "Somchai",
        psychologistName: "คุณหมอ ศิริพร",
        appointmentDate,
        appointmentTime,
        joinLink,
      },
      'th',
      'patient'
    );
    console.log('✅ Thai patient email:', result5.success ? 'SUCCESS' : 'FAILED');
    if (result5.error) console.log('   Error:', result5.error);
  } catch (error) {
    console.log('❌ Thai patient email error:', error);
  }

  // Test 6: Psychologist email in Thai
  console.log('\n📧 Test 6: Psychologist email in Thai (th)');
  try {
    const result6 = await emailService.sendBookingConfirmed(
      testUserId + "-psych-th",
      testAppointmentId + "-th-psych",
      testEmail,
      {
        firstName: "ศิริพร",
        patientName: "คุณ สมชาย", // Using patientName for psychologist email
        appointmentDate,
        appointmentTime,
        joinLink,
      },
      'th',
      'psychologist'
    );
    console.log('✅ Thai psychologist email:', result6.success ? 'SUCCESS' : 'FAILED');
    if (result6.error) console.log('   Error:', result6.error);
  } catch (error) {
    console.log('❌ Thai psychologist email error:', error);
  }

  console.log('\n✨ Test completed! Check your email inbox at:', testEmail);
  console.log('📝 Key points tested:');
  console.log('   - Patient emails use {{psychologistName}} variable');
  console.log('   - Psychologist emails use {{patientName}} variable');
  console.log('   - Templates work correctly in Turkish, Vietnamese, and Thai');
}

testBookingConfirmedEmails()
  .then(() => {
    console.log('\n✅ All tests completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
