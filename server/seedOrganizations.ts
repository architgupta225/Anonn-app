import 'dotenv/config';
import { db } from "./db";
import { organizations } from "@shared/schema";

async function seedOrganizations() {
  try {
    console.log("Creating Web3 organization data...");
    
    // Don't clear existing organizations to avoid foreign key constraint issues
    console.log("✅ Checking for existing organizations...");
    
    // Web3 organization data with varied trust scores
    const orgData = [
      {
        name: "Outpost",
        description: "Decentralized trading platform and community governance hub. Advanced trading tools, portfolio management, and community-driven decision making. Built for traders, by traders.",
        website: "https://outpost.com",
        createdBy: "suhrad_admin",
        isFeatured: false,
        accessLevel: "admin_only",
        adminOnlyFeatures: {
          trading: true,
          portfolioManagement: true,
          communityGovernance: true,
          advancedAnalytics: true,
          riskManagement: true
        },
        securitySettings: {
          requireVerification: true,
          adminAccess: ["suhrad_admin"],
          tradingPermissions: ["suhrad_admin", "verified_traders"],
          maxLeverage: 100,
          riskLimits: "strict"
        }
      },
      {
        name: "Stark",
        description: "Leading zero-knowledge proof technology company. Building the infrastructure for scalable, private blockchain applications with STARKs and Cairo programming language.",
        website: "https://starkware.co",
        createdBy: null,
        isFeatured: false,
        accessLevel: "public",
        adminOnlyFeatures: null,
        securitySettings: null
      },
      {
        name: "Uniswap",
        description: "Decentralized exchange protocol for automated token trading. Leading DEX with billions in trading volume and innovative AMM technology.",
      },
      {
        name: "OpenSea",
        description: "Largest NFT marketplace for buying, selling, and discovering digital collectibles. Pioneer in the NFT ecosystem with millions of users.",
      },
      {
        name: "Aave",
        description: "Decentralized lending protocol allowing users to borrow and lend crypto assets. One of the largest DeFi protocols with billions in TVL.",
      },
      {
        name: "dYdX",
        description: "Decentralized derivatives exchange for perpetual futures trading. Popular among traders for advanced trading features and high liquidity.",
      },
      {
        name: "Compound",
        description: "Algorithmic interest rate protocol for lending and borrowing crypto assets. Early DeFi pioneer with transparent rate mechanisms.",
      }
    ];

    // Insert organizations only if they don't exist
    let createdCount = 0;
    for (const org of orgData) {
      try {
        await db.insert(organizations).values({
          name: org.name,
          description: org.description,
          website: org.website || `https://${org.name.toLowerCase().replace(/\s+/g, '')}.com`,
          createdBy: org.createdBy || null,
          isFeatured: org.isFeatured || false,
          accessLevel: org.accessLevel || "public",
          adminOnlyFeatures: org.adminOnlyFeatures || null,
          securitySettings: org.securitySettings || null,
        });
        createdCount++;
        console.log(`✅ Created organization: ${org.name}`);
      } catch (error) {
        // Organization already exists, skip
        console.log(`⏭️  Organization already exists: ${org.name}`);
      }
    }
    
    console.log(`✅ Successfully processed ${orgData.length} Web3 organizations!`);
    console.log(`📊 Created: ${createdCount} new organizations`);
    console.log("📊 Organizations:");
    orgData.forEach((org, index) => {
      console.log(`   ${index + 1}. ${org.name}`);
    });
    
  } catch (error) {
    console.error("❌ Error creating organizations:", error);
  } finally {
    process.exit(0);
  }
}

seedOrganizations(); 