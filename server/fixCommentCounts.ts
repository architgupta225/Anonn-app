import 'dotenv/config';
import { db } from "./db";
import { posts, comments } from "@shared/schema";
import { sql, eq, count } from "drizzle-orm";

async function fixCommentCounts() {
  try {
    console.log("🔧 Fixing comment counts by counting actual comments...");
    
    // Get all posts
    const allPosts = await db.query.posts.findMany();
    console.log(`📊 Found ${allPosts.length} posts to process`);
    
    let updatedCount = 0;
    
    for (const post of allPosts) {
      // Count actual comments for this post
      const commentCountResult = await db
        .select({ count: count() })
        .from(comments)
        .where(eq(comments.postId, post.id));
      
      const actualCommentCount = commentCountResult[0]?.count || 0;
      
      // Update post if comment count is incorrect
      if (post.commentCount !== actualCommentCount) {
        await db
          .update(posts)
          .set({ 
            commentCount: actualCommentCount,
            updatedAt: new Date()
          })
          .where(eq(posts.id, post.id));
        
        console.log(`✅ Post ${post.id}: ${post.commentCount} → ${actualCommentCount} comments`);
        updatedCount++;
      } else {
        console.log(`✓ Post ${post.id}: ${post.commentCount} comments (correct)`);
      }
    }
    
    console.log(`\n🎉 Fixed comment counts for ${updatedCount} posts`);
    
    // Final verification
    const postsWithIncorrectCounts = await db.query.posts.findMany({
      where: (posts, { gt }) => gt(posts.commentCount, 0)
    });
    
    console.log(`\n📋 Posts with comments after fix:`);
    for (const post of postsWithIncorrectCounts) {
      console.log(`  Post ${post.id}: ${post.commentCount} comments`);
    }
    
    if (postsWithIncorrectCounts.length === 0) {
      console.log("✅ All posts now have 0 comments (no comments exist)");
    }
    
  } catch (error) {
    console.error("❌ Error fixing comment counts:", error);
  } finally {
    process.exit(0);
  }
}

fixCommentCounts(); 