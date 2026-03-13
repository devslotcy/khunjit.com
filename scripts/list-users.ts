import { db } from '../server/db';
import { users } from '../shared/schema';

async function listUsers() {
  const allUsers = await db.select().from(users).limit(20);

  console.log('👥 Users in database:');
  allUsers.forEach(user => {
    console.log({
      id: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role
    });
  });

  process.exit(0);
}

listUsers().catch(console.error);
