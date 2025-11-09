import { setDefaultResultOrder } from 'dns';
setDefaultResultOrder('ipv4first');

import 'dotenv/config';
import { db } from './server/db';
import { users } from '@shared/schema';
import { sql } from 'drizzle-orm';

async function testDatabase() {
  try {
    console.log('Testing database connection...');

    // Test 1: Simple query
    const result = await db.execute(sql`SELECT 1 as test`);
    console.log('✅ Database connection successful:', result);

    // Test 2: Query users table
    const usersCount = await db.select({ count: sql<number>`count(*)` }).from(users);
    console.log('✅ Users table accessible, count:', usersCount[0]?.count);

    // Test 3: Query specific user
    const testUsers = await db.select().from(users).limit(1);
    console.log('✅ Can query users:', testUsers.length > 0 ? 'Found users' : 'No users found');

    console.log('\n✅ All database tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database test failed:');
    console.error('Error:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
    process.exit(1);
  }
}

testDatabase();
