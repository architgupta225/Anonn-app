import { db } from "./db";
import { comments } from "@shared/schema";
import { sql } from "drizzle-orm";

async function migratePollComments() {
  console.log("Starting poll comments migration...");
  
  try {
    // Add pollId column to comments table
    console.log("Adding pollId column to comments table...");
    await db.execute(sql`
      ALTER TABLE comments 
      ADD COLUMN IF NOT EXISTS poll_id INTEGER REFERENCES polls(id)
    `);
    
    // Make postId nullable since comments can now be on polls
    console.log("Making postId nullable...");
    await db.execute(sql`
      ALTER TABLE comments 
      ALTER COLUMN post_id DROP NOT NULL
    `);
    
    console.log("Poll comments migration completed successfully!");
  } catch (error) {
    console.error("Error during poll comments migration:", error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migratePollComments()
    .then(() => {
      console.log("Migration completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

export { migratePollComments }; 