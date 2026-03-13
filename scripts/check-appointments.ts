import { db } from '../server/db';
import { appointments } from '../shared/schema';
import { desc } from 'drizzle-orm';

async function checkAppointments() {
  const allAppointments = await db.select().from(appointments).orderBy(desc(appointments.createdAt)).limit(10);
  console.log('📋 Latest 10 appointments:');
  allAppointments.forEach(apt => {
    console.log({
      id: apt.id.substring(0, 8) + '...',
      patientId: apt.patientId.substring(0, 16) + '...',
      psychologistId: apt.psychologistId.substring(0, 16) + '...',
      status: apt.status,
      startAt: apt.startAt,
      createdAt: apt.createdAt
    });
  });
  process.exit(0);
}

checkAppointments().catch(console.error);
