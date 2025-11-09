import 'dotenv/config';
import { db } from "./db";
import { bowls, bowlFollows, bowlFavorites, posts, comments, votes, polls, pollOptions, pollVotes, users, organizations, notifications, accessLogs, userFollows, userFlairs, bowlModerators, bowlBans, savedContent, privateMessages, userCoins, postAwards, awards, companyVerifications, companyDomains, orgTrustVotes } from "@shared/schema";

async function clearBowlsData() {
  try {
    console.log("Clearing all data...");
    
    // Clear in order to respect foreign key constraints
    await db.delete(votes);
    await db.delete(comments);
    await db.delete(pollVotes);
    await db.delete(pollOptions);
    await db.delete(polls);
    await db.delete(posts);
    await db.delete(bowlFavorites);
    await db.delete(bowlFollows);
    await db.delete(bowlModerators);
    await db.delete(bowlBans);
    await db.delete(userFlairs);
    await db.delete(userFollows);
    await db.delete(savedContent);
    await db.delete(privateMessages);
    await db.delete(userCoins);
    await db.delete(postAwards);
    await db.delete(awards);
    await db.delete(notifications);
    await db.delete(accessLogs);
    await db.delete(orgTrustVotes);
    await db.delete(companyVerifications);
    await db.delete(companyDomains);
    await db.delete(bowls);
    await db.delete(organizations);
    await db.delete(users);
    
    console.log("✅ Successfully cleared all data!");
  } catch (error) {
    console.error("❌ Error clearing data:", error);
  } finally {
    process.exit(0);
  }
}

clearBowlsData();