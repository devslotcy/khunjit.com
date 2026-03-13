import { storage } from '../server/storage';

async function testPaymentHistory() {
  const patientId = '930815bf-72db-4aa6-9f3e-0e3f00652acb';

  console.log('🔍 Testing payment history for patient:', patientId);

  // Test getPaymentsByPatient
  const payments = await storage.getPaymentsByPatient(patientId);
  console.log('\n💳 Payments count:', payments.length);

  // Test getAppointmentsByPatient
  const appointments = await storage.getAppointmentsByPatient(patientId);
  console.log('\n📋 Appointments count:', appointments.length);
  console.log('📋 Appointment statuses:', appointments.map(a => a.status));

  // Filter pending
  const pending = appointments.filter(apt =>
    ["reserved", "payment_pending", "payment_review"].includes(apt.status)
  );
  console.log('\n⏳ Pending appointments count:', pending.length);

  process.exit(0);
}

testPaymentHistory().catch(console.error);
