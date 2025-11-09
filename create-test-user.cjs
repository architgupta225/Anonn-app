require('dotenv/config');
const postgres = require('postgres');
const crypto = require('crypto');

// Create a test user for nirlep199@gmail.com
async function createTestUser() {
  const client = postgres(process.env.DATABASE_URL);

  try {
    console.log('Creating test user for nirlep199@gmail.com...');

    // Check if user already exists
    const existingUser = await client`
      SELECT id, email FROM users WHERE email = 'nirlep199@gmail.com' LIMIT 1
    `;

    if (existingUser.length > 0) {
      console.log('User already exists:', existingUser[0]);
      return existingUser[0];
    }

    // Create test user
    const userId = crypto.randomUUID();
    const testUser = await client`
      INSERT INTO users (
        id, email, username, first_name, last_name, password,
        wallet_address, allowlisted, karma, post_karma, comment_karma,
        awardee_karma, follower_count, following_count, is_verified,
        is_premium, is_online, last_active_at, created_at, updated_at,
        dynamic_profile, dynamic_profile_synced, company_email,
        company_domain, company_name, is_company_verified,
        company_verified_at, zk_proof_hash
      ) VALUES (
        ${userId}, 'nirlep199@gmail.com', 'nirlep199', 'Nirlep', 'User',
        NULL, NULL, true, 0, 0, 0, 0, 0, 0, false, false, true,
        NOW(), NOW(), NOW(), NULL, false, NULL, NULL, NULL, false,
        NULL, NULL
      )
      RETURNING id, email, username, first_name, last_name
    `;

    console.log('✅ Test user created successfully:', testUser[0]);
    return testUser[0];

  } catch (error) {
    console.error('❌ Error creating test user:', error);
    throw error;
  } finally {
    await client.end();
  }
}

createTestUser();
