import 'dotenv/config';
import { db } from "./db";
import { users } from "@shared/schema";

async function seedUsers() {
  try {
    console.log("Creating user accounts for posts...");
    
    // User data
    const userData = [
      {
        id: "suhrad_admin",
        email: "suhrad205@gmail.com",
        username: "suhrad_admin",
        firstName: "Suhrad",
        lastName: "Admin",
        bio: "System administrator and founder of Outpost. Building the future of decentralized trading and community governance.",
        location: "Global",
        website: "https://outpost.com",
        karma: 5000,
        postKarma: 2500,
        commentKarma: 2500,
        followerCount: 1000,
        followingCount: 500,
        isVerified: true,
        isPremium: true,
      },
      {
        id: "alex_crypto",
        email: "alex@example.com",
        username: "alex_crypto",
        firstName: "Alex",
        lastName: "Crypto",
        bio: "Senior Solidity developer. Building the future of DeFi. Previously at ConsenSys.",
        location: "San Francisco, CA",
        website: "https://alexcrypto.dev",
        karma: 1247,
        postKarma: 892,
        commentKarma: 355,
        followerCount: 234,
        followingCount: 156,
        isVerified: true,
        isPremium: true,
      },
      {
        id: "sarah_defi",
        email: "sarah@example.com", 
        username: "sarah_defi",
        firstName: "Sarah",
        lastName: "DeFi",
        bio: "Product Manager in DeFi. Passionate about user experience and financial inclusion.",
        location: "New York, NY",
        website: "https://sarahdefi.com",
        karma: 892,
        postKarma: 567,
        commentKarma: 325,
        followerCount: 189,
        followingCount: 98,
        isVerified: true,
        isPremium: false,
      },
      {
        id: "mike_trader",
        email: "mike@example.com",
        username: "mike_trader", 
        firstName: "Mike",
        lastName: "Trader",
        bio: "Full-time crypto trader. DeFi yield farmer. Building trading bots and strategies.",
        location: "Miami, FL",
        website: "https://miketrader.com",
        karma: 1567,
        postKarma: 1023,
        commentKarma: 544,
        followerCount: 445,
        followingCount: 223,
        isVerified: true,
        isPremium: true,
      },
      {
        id: "lisa_nft",
        email: "lisa@example.com",
        username: "lisa_nft",
        firstName: "Lisa",
        lastName: "NFT",
        bio: "NFT artist and collector. Creating digital art and exploring the metaverse.",
        location: "Los Angeles, CA",
        website: "https://lisanft.art",
        karma: 678,
        postKarma: 445,
        commentKarma: 233,
        followerCount: 156,
        followingCount: 89,
        isVerified: true,
        isPremium: false,
      },
      {
        id: "dave_developer",
        email: "dave@example.com",
        username: "dave_developer",
        firstName: "Dave",
        lastName: "Developer",
        bio: "Full-stack developer specializing in Web3. Building dApps and smart contracts.",
        location: "Austin, TX",
        website: "https://davedeveloper.dev",
        karma: 2345,
        postKarma: 1678,
        commentKarma: 667,
        followerCount: 567,
        followingCount: 234,
        isVerified: true,
        isPremium: true,
      },
      {
        id: "emma_investor",
        email: "emma@example.com",
        username: "emma_investor",
        firstName: "Emma",
        lastName: "Investor",
        bio: "Crypto investor and analyst. Researching DeFi protocols and emerging trends.",
        location: "Seattle, WA",
        website: "https://emmainvestor.com",
        karma: 1890,
        postKarma: 1234,
        commentKarma: 656,
        followerCount: 345,
        followingCount: 178,
        isVerified: true,
        isPremium: true,
      }
    ];

    // Insert users
    for (const user of userData) {
      await db.insert(users).values({
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        bio: user.bio,
        location: user.location,
        website: user.website,
        karma: user.karma,
        postKarma: user.postKarma,
        commentKarma: user.commentKarma,
        followerCount: user.followerCount,
        followingCount: user.followingCount,
        isVerified: user.isVerified,
        isPremium: user.isPremium,
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Random date within last year
      });
    }
    
    console.log(`✅ Successfully created ${userData.length} user accounts!`);
    console.log("📊 Users created:");
    userData.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.username} (${user.firstName} ${user.lastName})`);
    });
    
  } catch (error) {
    console.error("❌ Error creating users:", error);
  } finally {
    process.exit(0);
  }
}

seedUsers(); 