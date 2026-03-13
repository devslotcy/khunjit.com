import { db } from '../server/db';
import { appointments } from '../shared/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';

async function debugPatientId() {
  const patientId = '930815bf-72db-4a81-8bfe-51d8fff86848';

  console.log('🔍 Looking for patient ID:', patientId);

  // Direct query
  const allAppointments = await db.select().from(appointments)
    .where(eq(appointments.patientId, patientId))
    .limit(5);

  console.log('\n📋 Appointments with this exact patient ID:', allAppointments.length);

  if (allAppointments.length > 0) {
    console.log('\n✅ Found appointments:');
    allAppointments.forEach(apt => {
      console.log({
        id: apt.id.substring(0, 8),
        patientId: apt.patientId,
        status: apt.status,
        deletedAt: apt.deletedAt
      });
    });
  }

  // Check with deletedAt filter
  const nonDeletedAppointments = await db.select().from(appointments)
    .where(and(eq(appointments.patientId, patientId), isNull(appointments.deletedAt)))
    .limit(5);

  console.log('\n📋 Non-deleted appointments:', nonDeletedAppointments.length);

  // Get all appointments and check patient IDs
  const allPatientIds = await db.select({
    id: appointments.id,
    patientId: appointments.patientId
  }).from(appointments).limit(10);

  console.log('\n🔍 Sample patient IDs in database:');
  const uniquePatientIds = [...new Set(allPatientIds.map(a => a.patientId))];
  uniquePatientIds.forEach(id => {
    console.log(`  - ${id}`);
  });

  process.exit(0);
}

debugPatientId().catch(console.error);
