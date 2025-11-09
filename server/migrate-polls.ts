import { db } from "./db";
import { polls, posts } from "@shared/schema";
import { sql } from "drizzle-orm";

async function migratePolls() {
  console.log("Starting polls migration...");
  
  try {
    // Add postId column to polls table
    console.log("Adding postId column to polls table...");
    await db.execute(sql`
      ALTER TABLE polls 
      ADD COLUMN IF NOT EXISTS post_id INTEGER REFERENCES posts(id)
    `);
    
    // Get all polls and posts
    const allPolls = await db.select().from(polls);
    const allPosts = await db.select().from(posts).where(sql`type = 'poll'`);
    
    console.log(`Found ${allPolls.length} polls and ${allPosts.length} poll posts`);
    
    // Link polls to posts by matching title and author
    for (const poll of allPolls) {
      const matchingPost = allPosts.find(post => 
        post.title === poll.title && 
        post.authorId === poll.authorId
      );
      
      if (matchingPost) {
        console.log(`Linking poll ${poll.id} to post ${matchingPost.id} (title: "${poll.title}")`);
        await db
          .update(polls)
          .set({ postId: matchingPost.id })
          .where(sql`id = ${poll.id}`);
      } else {
        console.log(`No matching post found for poll ${poll.id} (title: "${poll.title}")`);
      }
    }
    
    console.log("Polls migration completed successfully!");
  } catch (error) {
    console.error("Error during polls migration:", error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migratePolls()
    .then(() => {
      console.log("Migration completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

export { migratePolls }; 