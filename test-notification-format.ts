/**
 * Test script to create a formatted notification
 */
import { db } from './server/db';
import * as notificationService from './server/notifications';

async function testNotification() {
  try {
    console.log('Creating test notification with formatted message...');

    const testMessage = `Dear Dr. John,<br><div style="border-bottom: 1px solid #e5e7eb; margin: 8px 0;"></div>You have a session with Jane Doe in 30 minutes at 19:00 - 19:50.<br><div style="border-bottom: 1px solid #e5e7eb; margin: 8px 0;"></div>Date: 23 January 2026, Friday<br>Time: 19:00 - 19:50<br><div style="border-bottom: 1px solid #e5e7eb; margin: 8px 0;"></div>You can start the session from your appointments page.`;

    // Get first user to test
    const users = await db.query.users.findMany({ limit: 1 });

    if (users.length === 0) {
      console.error('No users found in database');
      return;
    }

    const testUserId = users[0].id;
    console.log(`Sending test notification to user: ${testUserId}`);

    await notificationService.createNotification({
      userId: testUserId,
      type: 'appointment_reminder',
      title: 'Session Reminder - TEST',
      message: testMessage,
      relatedId: 'test-appointment-id',
      relatedType: 'appointment',
    });

    console.log('✅ Test notification created successfully!');
    console.log('\nMessage format:');
    console.log(testMessage);

    process.exit(0);
  } catch (error) {
    console.error('Error creating test notification:', error);
    process.exit(1);
  }
}

testNotification();
