const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
require('dotenv').config();

const CONFIG = {
  DATABASE: {
    URL: process.env.DATABASE_URL
  }
};

if (!CONFIG.DATABASE.URL) {
  throw new Error("DATABASE_URL must be set");
}

// Create the connection with SSL certificate handling
const client = postgres(CONFIG.DATABASE.URL, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 60,
  ssl: {
    rejectUnauthorized: false
  },
  transform: {
    undefined: null,
  },
});

async function applyMigration() {
  try {
    console.log('Applying migration for rating columns...');
    
    // Check if columns already exist
    const existingColumns = await client`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'posts' 
      AND column_name IN ('work_life_balance', 'culture_values', 'career_opportunities', 'compensation', 'management')
    `;
    
    console.log('Existing rating columns:', existingColumns.map(c => c.column_name));
    
    // Add columns if they don't exist
    const columnsToAdd = [
      'work_life_balance',
      'culture_values', 
      'career_opportunities',
      'compensation',
      'management'
    ];
    
    for (const column of columnsToAdd) {
      const exists = existingColumns.some(c => c.column_name === column);
      if (!exists) {
        console.log(`Adding column: ${column}`);
        await client`ALTER TABLE "posts" ADD COLUMN ${client.unsafe(column)} integer`;
      } else {
        console.log(`Column ${column} already exists`);
      }
    }
    
    console.log('Migration completed successfully!');
    
    // Check recent reviews
    const reviews = await client`
      SELECT id, title, type, work_life_balance, culture_values, career_opportunities, compensation, management
      FROM posts 
      WHERE type = 'review' 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    
    console.log('\nRecent reviews:');
    console.log(reviews);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

applyMigration();
