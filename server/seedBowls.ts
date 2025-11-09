import 'dotenv/config';
import { db } from "./db";
import { bowls } from "@shared/schema";

async function seedWeb3Bowls() {
  try {
    console.log("Creating simplified Web3-focused bowls...");
    
    // Main Essential Bowls
    const mainBowls = [
      { name: "General", description: "General Web3 discussions and community chat", category: "general" },
      { name: "Salary", description: "Web3 salary discussions, compensation, and career advice", category: "general" },
      { name: "DeFi", description: "Decentralized Finance protocols, yield farming, and DeFi strategies", category: "industries" },
      { name: "NFTs", description: "Non-fungible tokens, digital art, and NFT trading", category: "industries" },
      { name: "Gaming", description: "Web3 gaming, play-to-earn, and blockchain games", category: "industries" },
      { name: "Bitcoin", description: "Bitcoin discussions, trading, and investment strategies", category: "general" },
      { name: "Ethereum", description: "Ethereum ecosystem, smart contracts, and ETH discussions", category: "general" },
      { name: "Solana", description: "Solana blockchain, DeFi, and SOL ecosystem", category: "general" },
      { name: "Marketing", description: "Web3 marketing, community building, and growth strategies", category: "job-groups" },
      { name: "Sales", description: "Web3 sales, business development, and partnerships", category: "job-groups" },
      { name: "Developers", description: "Web3 developer community and technical discussions", category: "user-moderated" },
      { name: "Investors", description: "Web3 investment strategies and portfolio discussions", category: "user-moderated" },
      { name: "Jobs", description: "Web3 job opportunities and career discussions", category: "user-moderated" },
      { name: "Trading", description: "Crypto trading strategies, technical analysis, and market discussions", category: "general" },
      { name: "Outpost Trading", description: "Advanced trading strategies, portfolio management, and Outpost platform discussions. Admin-only access for premium trading features.", category: "industries" },
      { name: "News", description: "Latest Web3 news, updates, and market developments", category: "general" },
    ];

    // Create all bowls
    for (const bowlData of mainBowls) {
      await db.insert(bowls).values({
        name: bowlData.name,
        description: bowlData.description,
        category: bowlData.category,
        memberCount: 0,
        createdBy: null, // No creator for predefined bowls
      });
    }
    
    console.log(`✅ Successfully created ${mainBowls.length} essential Web3 bowls!`);
    console.log(`📊 Breakdown:`);
    console.log(`   - General: ${mainBowls.filter(b => b.category === 'general').length}`);
    console.log(`   - Industries: ${mainBowls.filter(b => b.category === 'industries').length}`);
    console.log(`   - Job Groups: ${mainBowls.filter(b => b.category === 'job-groups').length}`);
    console.log(`   - Communities: ${mainBowls.filter(b => b.category === 'user-moderated').length}`);
    
  } catch (error) {
    console.error("❌ Error creating Web3 bowls:", error);
  } finally {
    process.exit(0);
  }
}

seedWeb3Bowls(); 